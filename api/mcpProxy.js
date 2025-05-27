const { isJSONRPCRequest } = require("@modelcontextprotocol/sdk/types");

function onClientError(error) {
  console.error("Error from inspector client:", error);
}

function onServerError(error) {
  console.error("Error from MCP server:", error);
}

function mcpProxy({ transportToClient, transportToServer }) {
  let transportToClientClosed = false;
  let transportToServerClosed = false;

  transportToClient.onmessage = (message) => {
    transportToServer.send(message).catch((error) => {
      // Send error response back to client if it was a request (has id) and connection is still open
      if (isJSONRPCRequest(message) && !transportToClientClosed) {
        const errorResponse = {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32001,
            message: error.message,
            data: error,
          },
        };
        transportToClient.send(errorResponse).catch(onClientError);
      }
    });
  };

  transportToServer.onmessage = (message) => {
    transportToClient.send(message).catch(onClientError);
  };

  transportToClient.onclose = () => {
    if (transportToServerClosed) {
      return;
    }

    transportToClientClosed = true;
    transportToServer.close().catch(onServerError);
  };

  transportToServer.onclose = () => {
    if (transportToClientClosed) {
      return;
    }
    transportToServerClosed = true;
    transportToClient.close().catch(onClientError);
  };

  transportToClient.onerror = onClientError;
  transportToServer.onerror = onServerError;
}

module.exports = mcpProxy;
