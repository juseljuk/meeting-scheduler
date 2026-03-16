# MCP Server Troubleshooting Guide

## Common Issues and Solutions

### 1. "Failed to list meetings" Error

**Symptoms:**
```json
{
  "data": "meta=None content=[TextContent(type='text', text='Error: Failed to list meetings: ', annotations=None, meta=None)] isError=True"
}
```

**Possible Causes & Solutions:**

#### A. Network Connectivity Issues
The MCP server cannot reach the backend URL.

**Check:**
```bash
# Test if backend is accessible
curl https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-03-16T14:00:00.000Z",
  "uptime": 123.45,
  "database": "cloudant",
  "cosBackup": "disabled"
}
```

**Solution:**
- Verify the backend URL is correct and accessible
- Check if the backend is running
- Ensure there are no firewall rules blocking the connection

#### B. Incorrect Backend URL Configuration

**Check the toolkit spec:**
```yaml
# orchestrate/specs/meeting-mcp-toolkit.yaml
env:
  - BACKEND_URL=https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud
```

**Common mistakes:**
- ❌ Missing `https://` protocol
- ❌ Trailing slash: `https://backend.com/` (should be `https://backend.com`)
- ❌ Wrong port number
- ❌ Using `localhost` instead of the actual Code Engine URL

**Correct format:**
```
https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud
```

#### C. Backend API Not Ready

The backend might still be initializing its database connection.

**Solution:**
- Wait 30-60 seconds after backend deployment
- Check backend logs for initialization errors
- Verify database (Cloudant) is properly configured

#### D. CORS Issues

If the backend has CORS restrictions, the MCP server might be blocked.

**Check backend CORS configuration:**
```javascript
// backend/src/server.js
app.use(cors()); // Should allow all origins
```

**Solution:**
- Ensure CORS is enabled in the backend
- The backend should accept requests from any origin for MCP server access

### 2. Enhanced Error Reporting

With the updated error handling, you should now see detailed error information:

```json
{
  "message": "connect ECONNREFUSED",
  "backendUrl": "https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud",
  "endpoint": "/api/meetings",
  "statusCode": null,
  "statusText": null,
  "responseData": null,
  "code": "ECONNREFUSED"
}
```

**Error Code Meanings:**

- `ECONNREFUSED`: Backend is not running or not accessible
- `ENOTFOUND`: DNS resolution failed (wrong URL)
- `ETIMEDOUT`: Request timed out (network issues)
- `404`: Endpoint not found (check API path)
- `500`: Backend server error (check backend logs)
- `502/503`: Backend unavailable (Code Engine scaling or restart)

### 3. Re-importing the Toolkit

After fixing issues, you need to re-import the toolkit:

```bash
# Remove old toolkit
orchestrate toolkits remove --name meeting-manager

# Re-import with updated configuration
orchestrate toolkits import -f orchestrate/specs/meeting-mcp-toolkit.yaml
```

### 4. Testing the Backend Directly

Before testing through the MCP server, verify the backend works:

```bash
# Test health endpoint
curl https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud/health

# Test list meetings endpoint
curl https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud/api/meetings

# Expected response (empty array if no meetings):
[]

# Or with meetings:
[
  {
    "id": "1710518400000",
    "title": "Team Meeting",
    "start_datetime": "2026-03-15T00:00:00",
    "end_datetime": "2026-03-15T23:59:59",
    ...
  }
]
```

### 5. Checking watsonx Orchestrate Logs

View toolkit logs in watsonx Orchestrate:

```bash
# List toolkits
orchestrate toolkits list

# Get toolkit details
orchestrate toolkits get --name meeting-manager

# Check toolkit status
orchestrate toolkits status --name meeting-manager
```

### 6. Local Testing

Test the MCP server locally before deploying to wxO:

```bash
# Start backend locally
cd backend
npm start

# In another terminal, set local backend URL
export BACKEND_URL=http://localhost:3000

# Test MCP server
cd mcp-server
npm start
```

### 7. Common Configuration Mistakes

#### Wrong Environment Variable Format

❌ **Incorrect:**
```yaml
env:
  BACKEND_URL: https://backend.com  # Wrong format
```

✅ **Correct:**
```yaml
env:
  - BACKEND_URL=https://backend.com  # Correct format
```

#### Missing Protocol

❌ **Incorrect:**
```yaml
env:
  - BACKEND_URL=meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud
```

✅ **Correct:**
```yaml
env:
  - BACKEND_URL=https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud
```

### 8. Backend Database Issues

If the backend is running but not responding correctly:

**Check Cloudant Configuration:**
```bash
# Verify environment variables are set in Code Engine
ibmcloud ce application get --name meeting-app-backend

# Look for:
# - CLOUDANT_URL
# - CLOUDANT_APIKEY
```

**Solution:**
- Ensure Cloudant credentials are properly configured
- Check Cloudant service is active in IBM Cloud
- Verify database exists and is accessible

### 9. Timeout Issues

If requests are timing out:

**Increase timeout in api-client.js:**
```javascript
this.client = axios.create({
  baseURL: baseUrl,
  timeout: 30000,  // Increase from 10000 to 30000ms
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 10. Getting Help

If issues persist:

1. **Collect error details:**
   - Full error message from wxO
   - Backend URL being used
   - Backend health check response
   - Backend logs (if accessible)

2. **Test sequence:**
   ```bash
   # 1. Test backend health
   curl https://your-backend-url/health
   
   # 2. Test backend API
   curl https://your-backend-url/api/meetings
   
   # 3. Check toolkit configuration
   cat orchestrate/specs/meeting-mcp-toolkit.yaml
   
   # 4. Re-import toolkit
   orchestrate toolkits remove --name meeting-manager
   orchestrate toolkits import -f orchestrate/specs/meeting-mcp-toolkit.yaml
   ```

3. **Check versions:**
   - Node.js version: `node --version`
   - npm version: `npm --version`
   - MCP SDK version: Check `mcp-server/package.json`

## Quick Checklist

- [ ] Backend is running and accessible
- [ ] Backend URL is correct (with `https://`, no trailing slash)
- [ ] Backend `/health` endpoint returns 200 OK
- [ ] Backend `/api/meetings` endpoint is accessible
- [ ] Toolkit spec has correct `BACKEND_URL` environment variable
- [ ] Toolkit has been re-imported after configuration changes
- [ ] No CORS issues (backend allows all origins)
- [ ] Cloudant credentials are properly configured (for production)
- [ ] Network connectivity between wxO and backend is working