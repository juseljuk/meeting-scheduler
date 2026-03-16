# MCP Server Installation Guide

## Prerequisites

- Node.js (v18 or higher)
- npm
- Access to the meeting-app backend (running locally or on IBM Cloud)

## Installation Steps

### 1. Fix npm Cache Permissions (if needed)

If you encounter an EACCES error during npm install, run:

```bash
sudo chown -R $(id -u):$(id -g) "$HOME/.npm"
```

### 2. Install Dependencies

```bash
cd mcp-server
npm install
```

This will install:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `axios` - HTTP client for backend API calls

### 3. Configure Backend URL

Set the backend URL environment variable:

**For local development:**
```bash
export BACKEND_URL=http://localhost:3000
```

**For production (IBM Cloud Code Engine):**
```bash
export BACKEND_URL=https://meeting-app-backend.xxx.codeengine.appdomain.cloud
```

Or update the `orchestrate/specs/meeting-mcp-toolkit.yaml` file with the correct URL.

### 4. Test the MCP Server

Ensure the backend is running first:

```bash
# In one terminal - start the backend
cd backend
npm start

# In another terminal - test the MCP server
cd mcp-server
npm start
```

The server should output: `Meeting Manager MCP Server running on stdio`

## Deployment to watsonx Orchestrate

### Option 1: Import Toolkit from Local Filesystem

```bash
# From the meeting-app root directory
cd /path/to/meeting-app

# Import the toolkit
orchestrate toolkits add \
  --kind mcp \
  --name meeting-manager \
  --description "MCP toolkit for managing meetings with CRUD operations" \
  --package-root ./mcp-server \
  --command "node index.js" \
  --tools "*"
```

### Option 2: Import Using Spec File

```bash
# Update the BACKEND_URL in orchestrate/specs/meeting-mcp-toolkit.yaml first
# Then import:
orchestrate toolkits import -f orchestrate/specs/meeting-mcp-toolkit.yaml
```

### Import the Agent

```bash
orchestrate agents import -f orchestrate/specs/meeting-manager-agent.yaml
```

## Verification

After importing to watsonx Orchestrate:

1. List toolkits to verify import:
```bash
orchestrate toolkits list
```

2. List agents to verify agent creation:
```bash
orchestrate agents list
```

3. Test the agent through the watsonx Orchestrate UI or CLI

## Troubleshooting

### npm Permission Errors

If you see EACCES errors, fix npm cache permissions:
```bash
sudo chown -R $(id -u):$(id -g) "$HOME/.npm"
```

### Backend Connection Issues

- Verify the backend is running and accessible
- Check the BACKEND_URL environment variable
- Test the backend health endpoint: `curl http://localhost:3000/health`

### MCP Server Not Starting

- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be v18+)
- Verify index.js has execute permissions: `chmod +x index.js`

### watsonx Orchestrate Import Issues

- Ensure you're in the correct directory when running import commands
- Verify the package_root path in the spec file is correct
- Check that the orchestrate CLI is properly configured

## Next Steps

Once installed and imported to watsonx Orchestrate:

1. Test the agent with simple queries like "list all meetings"
2. Try creating a new meeting
3. Update and delete meetings
4. Integrate with other agents or workflows as needed

## Support

For issues specific to:
- **MCP Server**: Check the logs and error messages
- **Backend API**: See backend/README.md
- **watsonx Orchestrate**: Consult IBM watsonx Orchestrate documentation