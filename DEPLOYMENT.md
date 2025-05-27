# Deployment Guide

## Vercel Deployment (Client UI Only)

This configuration deploys only the MCP Inspector client UI to Vercel. The proxy server is not included, so only certain connection types will work.

### Supported Connection Types
- **SSE**: Direct connections to remote MCP servers with SSE endpoints
- **Streamable HTTP**: Direct connections to remote MCP servers with HTTP streaming

### Unsupported Connection Types
- **STDIO**: Requires the proxy server to spawn local processes (not available in static deployment)

### Deploy to Vercel

1. **Fork/Clone this repository**

2. **Connect to Vercel:**
   - Import project in Vercel dashboard
   - Connect your GitHub repository

3. **Vercel will automatically detect the configuration:**
   - Build Command: `cd client && npm run build`
   - Output Directory: `client/dist`
   - Node.js Version: 22

4. **Deploy:**
   - Vercel will build and deploy automatically
   - The UI will be available at your Vercel domain

### Environment Variables (Optional)

If you need to customize the deployment, you can set these in Vercel:

- `MCP_PROXY_FULL_ADDRESS`: Override the default proxy address
- `NODE_VERSION`: Node.js version (default: 22)

### Usage After Deployment

1. **Visit your Vercel URL**
2. **Connect to Remote Servers:**
   - Use SSE transport type
   - Enter remote server URL (e.g., `https://your-mcp-server.com/sse`)
   - Configure authentication if needed

3. **Limitations:**
   - Cannot connect to local STDIO servers
   - No process spawning capabilities
   - Limited to HTTP/SSE connections only

### Local Development vs Vercel

| Feature | Local Development | Vercel Deployment |
|---------|------------------|-------------------|
| STDIO connections | ✅ Full support | ❌ Not available |
| SSE connections | ✅ Via proxy | ✅ Direct |
| HTTP connections | ✅ Via proxy | ✅ Direct |
| Local server spawn | ✅ Via proxy | ❌ Not available |
| Authentication | ✅ Full support | ✅ Full support |

### Troubleshooting

**Build Errors:**
- Ensure Node.js 22+ is used
- Check that all dependencies are properly installed
- Verify TypeScript compilation passes

**Connection Issues:**
- Remember only remote SSE/HTTP servers work
- Check CORS settings on your MCP server
- Verify authentication configuration

**Missing Features:**
- If you need STDIO support, deploy the full stack with proxy server
- Consider using services like Railway or Heroku for full server deployment