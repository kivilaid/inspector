const cors = require("cors");
const { parse: shellParseArgs } = require("shell-quote");

const {
  SSEClientTransport,
  SseError,
} = require("@modelcontextprotocol/sdk/client/sse");
const {
  StdioClientTransport,
  getDefaultEnvironment,
} = require("@modelcontextprotocol/sdk/client/stdio");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse");
const express = require("express");
const { findActualExecutable } = require("spawn-rx");
const { randomUUID } = require("node:crypto");

// Import the MCP proxy
const mcpProxy = require("./mcpProxy");

const SSE_HEADERS_PASSTHROUGH = ["authorization"];
const STREAMABLE_HTTP_HEADERS_PASSTHROUGH = [
  "authorization",
  "mcp-session-id",
  "last-event-id",
];

const defaultEnvironment = {
  ...getDefaultEnvironment(),
  ...(process.env.MCP_ENV_VARS ? JSON.parse(process.env.MCP_ENV_VARS) : {}),
};

const app = express();
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Expose-Headers", "mcp-session-id");
  next();
});

const webAppTransports = new Map(); // Transports by sessionId
let backingServerTransport;

const createTransport = async (req) => {
  const query = req.query;
  console.log("Query parameters:", query);

  const transportType = query.transportType;

  if (transportType === "stdio") {
    const command = query.command;
    const origArgs = shellParseArgs(query.args);
    const queryEnv = query.env ? JSON.parse(query.env) : {};
    const env = { ...process.env, ...defaultEnvironment, ...queryEnv };

    const { cmd, args } = findActualExecutable(command, origArgs);

    console.log(`Stdio transport: command=${cmd}, args=${args}`);

    const transport = new StdioClientTransport({
      command: cmd,
      args,
      env,
      stderr: "pipe",
    });

    await transport.start();

    console.log("Spawned stdio transport");
    return transport;
  } else if (transportType === "sse") {
    const url = query.url;
    const headers = {
      Accept: "text/event-stream",
    };

    for (const key of SSE_HEADERS_PASSTHROUGH) {
      if (req.headers[key] === undefined) {
        continue;
      }

      const value = req.headers[key];
      headers[key] = Array.isArray(value) ? value[value.length - 1] : value;
    }

    console.log(`SSE transport: url=${url}, headers=${Object.keys(headers)}`);

    const transport = new SSEClientTransport(new URL(url), {
      eventSourceInit: {
        fetch: (url, init) => fetch(url, { ...init, headers }),
      },
      requestInit: {
        headers,
      },
    });
    await transport.start();

    console.log("Connected to SSE transport");
    return transport;
  } else if (transportType === "streamable-http") {
    const headers = {
      Accept: "text/event-stream, application/json",
    };

    for (const key of STREAMABLE_HTTP_HEADERS_PASSTHROUGH) {
      if (req.headers[key] === undefined) {
        continue;
      }

      const value = req.headers[key];
      headers[key] = Array.isArray(value) ? value[value.length - 1] : value;
    }

    const transport = new StreamableHTTPClientTransport(
      new URL(query.url),
      {
        requestInit: {
          headers,
        },
      },
    );
    await transport.start();
    console.log("Connected to Streamable HTTP transport");
    return transport;
  } else {
    console.error(`Invalid transport type: ${transportType}`);
    throw new Error("Invalid transport type specified");
  }
};

// MCP endpoint
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  console.log(`Received GET message for sessionId ${sessionId}`);
  try {
    const transport = webAppTransports.get(sessionId);
    if (!transport) {
      res.status(404).end("Session not found");
      return;
    } else {
      await transport.handleRequest(req, res);
    }
  } catch (error) {
    console.error("Error in /mcp route:", error);
    res.status(500).json(error);
  }
});

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  console.log(`Received POST message for sessionId ${sessionId}`);
  if (!sessionId) {
    try {
      console.log("New streamable-http connection");
      try {
        await backingServerTransport?.close();
        backingServerTransport = await createTransport(req);
      } catch (error) {
        if (error instanceof SseError && error.code === 401) {
          console.error(
            "Received 401 Unauthorized from MCP server:",
            error.message,
          );
          res.status(401).json(error);
          return;
        }

        throw error;
      }

      console.log("Connected MCP client to backing server transport");

      const webAppTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        onsessioninitialized: (sessionId) => {
          webAppTransports.set(sessionId, webAppTransport);
          console.log("Created streamable web app transport " + sessionId);
        },
      });

      await webAppTransport.start();

      mcpProxy({
        transportToClient: webAppTransport,
        transportToServer: backingServerTransport,
      });

      await webAppTransport.handleRequest(
        req,
        res,
        req.body,
      );
    } catch (error) {
      console.error("Error in /mcp POST route:", error);
      res.status(500).json(error);
    }
  } else {
    try {
      const transport = webAppTransports.get(sessionId);
      if (!transport) {
        res.status(404).end("Transport not found for sessionId " + sessionId);
      } else {
        await transport.handleRequest(
          req,
          res,
        );
      }
    } catch (error) {
      console.error("Error in /mcp route:", error);
      res.status(500).json(error);
    }
  }
});

// Stdio endpoint
app.get("/stdio", async (req, res) => {
  try {
    console.log("New connection");

    try {
      await backingServerTransport?.close();
      backingServerTransport = await createTransport(req);
    } catch (error) {
      if (error instanceof SseError && error.code === 401) {
        console.error(
          "Received 401 Unauthorized from MCP server:",
          error.message,
        );
        res.status(401).json(error);
        return;
      }

      throw error;
    }

    console.log("Connected MCP client to backing server transport");

    const webAppTransport = new SSEServerTransport("/message", res);
    webAppTransports.set(webAppTransport.sessionId, webAppTransport);

    console.log("Created web app transport");

    await webAppTransport.start();
    backingServerTransport.stderr.on(
      "data",
      (chunk) => {
        webAppTransport.send({
          jsonrpc: "2.0",
          method: "notifications/stderr",
          params: {
            content: chunk.toString(),
          },
        });
      },
    );

    mcpProxy({
      transportToClient: webAppTransport,
      transportToServer: backingServerTransport,
    });

    console.log("Set up MCP proxy");
  } catch (error) {
    console.error("Error in /stdio route:", error);
    res.status(500).json(error);
  }
});

// SSE endpoint
app.get("/sse", async (req, res) => {
  try {
    console.log(
      "New SSE connection. NOTE: The sse transport is deprecated and has been replaced by streamable-http",
    );

    try {
      await backingServerTransport?.close();
      backingServerTransport = await createTransport(req);
    } catch (error) {
      if (error instanceof SseError && error.code === 401) {
        console.error(
          "Received 401 Unauthorized from MCP server:",
          error.message,
        );
        res.status(401).json(error);
        return;
      }

      throw error;
    }

    console.log("Connected MCP client to backing server transport");

    const webAppTransport = new SSEServerTransport("/message", res);
    webAppTransports.set(webAppTransport.sessionId, webAppTransport);
    console.log("Created web app transport");

    await webAppTransport.start();

    mcpProxy({
      transportToClient: webAppTransport,
      transportToServer: backingServerTransport,
    });

    console.log("Set up MCP proxy");
  } catch (error) {
    console.error("Error in /sse route:", error);
    res.status(500).json(error);
  }
});

// Message endpoint
app.post("/message", async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    console.log(`Received message for sessionId ${sessionId}`);

    const transport = webAppTransports.get(sessionId);
    if (!transport) {
      res.status(404).end("Session not found");
      return;
    }
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Error in /message route:", error);
    res.status(500).json(error);
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

// Config endpoint
app.get("/config", (_req, res) => {
  try {
    res.json({
      defaultEnvironment,
      defaultCommand: "",
      defaultArgs: "",
    });
  } catch (error) {
    console.error("Error in /config route:", error);
    res.status(500).json(error);
  }
});

module.exports = app;