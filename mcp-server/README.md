# Meeting Manager MCP Server

Model Context Protocol (MCP) server for managing meetings through the meeting-app backend.

## Overview

This MCP server provides tools for AI agents to manage meetings with full CRUD operations:
- List all meetings
- Get meeting details
- Create new meetings
- Update existing meetings
- Delete meetings

## Installation

```bash
cd mcp-server
npm install
```

## Configuration

Set the backend URL via environment variable:

```bash
# For local development
export BACKEND_URL=http://localhost:3000

# For production (IBM Cloud Code Engine)
export BACKEND_URL=https://meeting-app-backend.xxx.codeengine.appdomain.cloud
```

## Running Locally

```bash
npm start
```

The server runs on stdio transport and communicates via standard input/output.

## Available Tools

### 1. list_meetings
Retrieve all scheduled meetings ordered by start date.

**Input**: None

**Output**: JSON array of all meetings

### 2. get_meeting
Get detailed information about a specific meeting.

**Input**:
- `id` (string): Meeting ID (timestamp-based string)

**Output**: JSON object with meeting details

### 3. create_meeting
Create a new meeting.

**Input**:
- `title` (string, required): Meeting title
- `start_datetime` (string, required): ISO 8601 format (YYYY-MM-DDTHH:MM:SS)
- `end_datetime` (string, required): ISO 8601 format (YYYY-MM-DDTHH:MM:SS)
- `description` (string, optional): Meeting description
- `location` (string, optional): Meeting location
- `attendees` (string, optional): Comma-separated list (Ricardo, Jukka, Máté, Steve)
- `customer` (string, optional): Customer name
- `is_onsite` (number, optional): 1 for on-site, 0 for remote
- `country` (string, optional): Country for on-site meetings

**Output**: JSON object with created meeting details

### 4. update_meeting
Update an existing meeting.

**Input**:
- `id` (string, required): Meeting ID to update
- All other fields from create_meeting (provide only fields to update)

**Output**: JSON object with updated meeting details

### 5. delete_meeting
Delete a meeting permanently.

**Input**:
- `id` (string, required): Meeting ID to delete

**Output**: Success message

## Integration with watsonx Orchestrate

### Step 1: Import Connection

First, import the connection configuration that provides the backend URL:

```bash
orchestrate connections import -f orchestrate/specs/meeting-backend-connection.yaml
```

### Step 2: Set Backend URL Credentials

Set the backend URL for both draft and live environments:

```bash
# For draft environment
orchestrate connections set-credentials \
  -a meeting-backend-config \
  --env draft \
  -e "BACKEND_URL=https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud"

# For live environment
orchestrate connections set-credentials \
  -a meeting-backend-config \
  --env live \
  -e "BACKEND_URL=https://meeting-app-backend.27bat83a6dow.eu-de.codeengine.appdomain.cloud"
```

**Note**: Replace the URL with your actual Code Engine backend URL.

### Step 3: Import Toolkit

```bash
orchestrate toolkits import -f orchestrate/specs/meeting-mcp-toolkit.yaml
```

### Step 4: Import Agent

```bash
orchestrate agents import -f orchestrate/specs/meeting-manager-agent.yaml
```

### Updating the Backend URL

To change the backend URL after initial setup:

```bash
orchestrate connections set-credentials \
  -a meeting-backend-config \
  --env draft \
  -e "BACKEND_URL=https://your-new-backend-url.codeengine.appdomain.cloud"
```

Then re-import the toolkit:

```bash
orchestrate toolkits remove --name meeting-manager
orchestrate toolkits import -f orchestrate/specs/meeting-mcp-toolkit.yaml
```

## Database Support

The backend automatically detects and uses the appropriate database:
- **Production**: IBM Cloudant (when `CLOUDANT_URL` and `CLOUDANT_APIKEY` are set)
- **Local**: SQLite (fallback when Cloudant credentials are not present)

The MCP server is database-agnostic and works with both transparently.

## Testing

Ensure the backend is running before testing:

```bash
# Start backend locally
cd backend
npm start

# In another terminal, test the MCP server
cd mcp-server
npm start
```

## Project Structure

```
mcp-server/
├── index.js              # MCP server entry point
├── package.json          # Dependencies and scripts
├── tools/                # Tool handlers
│   ├── list-meetings.js
│   ├── get-meeting.js
│   ├── create-meeting.js
│   ├── update-meeting.js
│   └── delete-meeting.js
└── utils/
    └── api-client.js     # HTTP client for backend API
```

## Error Handling

All tools include error handling and return descriptive error messages when operations fail. Common errors include:
- Network connectivity issues
- Invalid meeting IDs
- Missing required fields
- Backend API errors

## License

Same as parent project (meeting-app)