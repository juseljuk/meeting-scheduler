# MCP Server Implementation Option for Meeting-App Backend

## Overview
This document presents an **alternative approach** to the original OpenAPI-based implementation: creating a Model Context Protocol (MCP) server for the meeting-app backend APIs.

## Comparison: OpenAPI vs MCP Server

### OpenAPI Approach (Original Plan)
**Pros**:
- ✅ Leverages existing Swagger documentation
- ✅ Standard REST API pattern
- ✅ Works with any HTTP client
- ✅ Well-documented approach

**Cons**:
- ❌ Requires OpenAPI 3.0 specification creation
- ❌ Less flexible for complex operations
- ❌ Each endpoint becomes a separate tool
- ❌ Limited context sharing between operations

### MCP Server Approach (Alternative)
**Pros**:
- ✅ **Simpler implementation** - Single server wraps all APIs
- ✅ **More flexible** - Can combine multiple API calls in one tool
- ✅ **Better context** - Server maintains state and context
- ✅ **Richer functionality** - Can add business logic and validation
- ✅ **Modern standard** - Adopted by leading AI platforms
- ✅ **Easier to extend** - Add new tools without API changes

**Cons**:
- ❌ Requires writing MCP server code (Python or Node.js)
- ❌ Additional component to maintain

## Recommendation: **MCP Server Approach**

Given that:
1. The backend APIs are simple and don't require authentication
2. You want to provide AI agent access
3. MCP is the modern standard for AI tool integration
4. It's simpler to implement and maintain

**I recommend the MCP Server approach** as it will be faster to implement and more maintainable.

## MCP Server Implementation Plan

### Architecture
```
┌─────────────────────────────────────────┐
│   watsonx Orchestrate Agent             │
│   (Meeting Manager)                     │
└──────────────┬──────────────────────────┘
               │
               │ Uses MCP Tools
               ▼
┌─────────────────────────────────────────┐
│   MCP Server (Toolkit)                  │
│   - list_meetings                       │
│   - get_meeting                         │
│   - create_meeting                      │
│   - update_meeting                      │
│   - delete_meeting                      │
│   - search_meetings (bonus)             │
└──────────────┬──────────────────────────┘
               │
               │ HTTP Requests
               ▼
┌─────────────────────────────────────────┐
│   Meeting-App Backend                   │
│   (Express.js REST API)                 │
│   - GET /api/meetings                   │
│   - POST /api/meetings                  │
│   - PUT /api/meetings/:id               │
│   - DELETE /api/meetings/:id            │
│   - GET /health                         │
└──────────────┬──────────────────────────┘
               │
               │ Database Adapter
               ▼
┌─────────────────────────────────────────┐
│   IBM Cloudant (Production)             │
│   or SQLite (Local Development)         │
│   - Automatic detection                 │
│   - Zero configuration                  │
└─────────────────────────────────────────┘
```

### Phase 1: Create MCP Server (Node.js)

**File Structure**:
```
meeting-app/
├── backend/                    # Existing backend
├── mcp-server/                 # New MCP server
│   ├── package.json
│   ├── index.js               # MCP server entry point
│   ├── tools/
│   │   ├── list-meetings.js
│   │   ├── get-meeting.js
│   │   ├── create-meeting.js
│   │   ├── update-meeting.js
│   │   └── delete-meeting.js
│   └── utils/
│       └── api-client.js      # HTTP client for backend
└── orchestrate/
    └── specs/
        └── meeting-manager-agent.yaml
```

**Implementation Steps**:

1. **Initialize MCP Server Project**:
```bash
mkdir mcp-server
cd mcp-server
npm init -y
npm install @modelcontextprotocol/sdk axios
```

2. **Create MCP Server** (`index.js`):
```javascript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool handlers
import { listMeetings } from './tools/list-meetings.js';
import { getMeeting } from './tools/get-meeting.js';
import { createMeeting } from './tools/create-meeting.js';
import { updateMeeting } from './tools/update-meeting.js';
import { deleteMeeting } from './tools/delete-meeting.js';

// Get backend URL from environment or default
// Production: https://meeting-app-backend.xxx.codeengine.appdomain.cloud
// Local: http://localhost:3000
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Create MCP server
const server = new Server(
  {
    name: 'meeting-manager-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools = [
  {
    name: 'list_meetings',
    description: 'Retrieve a list of all scheduled meetings ordered by start date. Returns all meetings with their details including title, dates, location, attendees, and customer information.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_meeting',
    description: 'Retrieve detailed information about a specific meeting using its ID. Returns complete meeting details including all fields.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique ID of the meeting to retrieve (timestamp-based string)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_meeting',
    description: 'Create a new meeting with specified details. Requires title, start_datetime, and end_datetime. Use ISO 8601 format for dates (YYYY-MM-DDTHH:MM:SS). For full-day meetings, use 00:00:00 for start and 23:59:59 for end time.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Meeting title',
        },
        description: {
          type: 'string',
          description: 'Meeting description (optional)',
        },
        start_datetime: {
          type: 'string',
          description: 'Start date and time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)',
        },
        end_datetime: {
          type: 'string',
          description: 'End date and time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)',
        },
        location: {
          type: 'string',
          description: 'Meeting location (optional)',
        },
        attendees: {
          type: 'string',
          description: 'Comma-separated list of attendees: Ricardo, Jukka, Máté, Steve (optional)',
        },
        customer: {
          type: 'string',
          description: 'Customer name (optional)',
        },
        is_onsite: {
          type: 'number',
          description: 'Whether meeting is on-site (1) or remote (0)',
        },
        country: {
          type: 'string',
          description: 'Country for on-site meetings (optional)',
        },
      },
      required: ['title', 'start_datetime', 'end_datetime'],
    },
  },
  {
    name: 'update_meeting',
    description: 'Update an existing meeting by ID. All fields except ID can be updated. Provide only the fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique ID of the meeting to update (timestamp-based string)',
        },
        title: {
          type: 'string',
          description: 'Meeting title',
        },
        description: {
          type: 'string',
          description: 'Meeting description',
        },
        start_datetime: {
          type: 'string',
          description: 'Start date and time in ISO 8601 format',
        },
        end_datetime: {
          type: 'string',
          description: 'End date and time in ISO 8601 format',
        },
        location: {
          type: 'string',
          description: 'Meeting location',
        },
        attendees: {
          type: 'string',
          description: 'Comma-separated list of attendees',
        },
        customer: {
          type: 'string',
          description: 'Customer name',
        },
        is_onsite: {
          type: 'number',
          description: 'Whether meeting is on-site (1) or remote (0)',
        },
        country: {
          type: 'string',
          description: 'Country for on-site meetings',
        },
      },
      required: ['id', 'title', 'start_datetime', 'end_datetime'],
    },
  },
  {
    name: 'delete_meeting',
    description: 'Delete a meeting permanently from the system using its ID. This action cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique ID of the meeting to delete (timestamp-based string)',
        },
      },
      required: ['id'],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_meetings':
        return await listMeetings(BACKEND_URL);
      case 'get_meeting':
        return await getMeeting(BACKEND_URL, args.id);
      case 'create_meeting':
        return await createMeeting(BACKEND_URL, args);
      case 'update_meeting':
        return await updateMeeting(BACKEND_URL, args);
      case 'delete_meeting':
        return await deleteMeeting(BACKEND_URL, args.id);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Meeting Manager MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
```

3. **Create Tool Handlers** (example: `tools/list-meetings.js`):
```javascript
import axios from 'axios';

export async function listMeetings(backendUrl) {
  try {
    const response = await axios.get(`${backendUrl}/api/meetings`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to list meetings: ${error.message}`);
  }
}
```

4. **Update package.json**:
```json
{
  "name": "meeting-manager-mcp",
  "version": "1.0.0",
  "type": "module",
  "description": "MCP server for meeting management",
  "main": "index.js",
  "bin": {
    "meeting-manager-mcp": "./index.js"
  },
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.6.0"
  }
}
```

### Phase 2: Import MCP Server into watsonx Orchestrate

**Option A: Import from Local Filesystem**:
```bash
# From the meeting-app root directory
orchestrate toolkits add \
  --kind mcp \
  --name meeting-manager \
  --description "MCP toolkit for managing meetings with CRUD operations" \
  --package-root ./mcp-server \
  --command "node index.js" \
  --tools "*"
```

**Option B: Using Spec File**:
Create `orchestrate/specs/meeting-mcp-toolkit.yaml`:
```yaml
spec_version: v1
kind: mcp
name: meeting-manager
description: MCP toolkit for managing meetings with CRUD operations
command: node index.js
env:
  - BACKEND_URL=https://meeting-app-backend.xxx.codeengine.appdomain.cloud
  # For local development: BACKEND_URL=http://localhost:3000
tools:
  - "*"
package_root: ../../mcp-server
```

Then import:
```bash
orchestrate toolkits import -f orchestrate/specs/meeting-mcp-toolkit.yaml
```

### Phase 3: Create Agent

Create `orchestrate/specs/meeting-manager-agent.yaml`:
```yaml
spec_version: v1
kind: native
name: meeting_manager
title: Meeting Manager Agent
description: AI agent that helps users manage meetings through natural language

style: default
llm: groq/openai/gpt-oss-120b

instructions: |
  You are a helpful meeting management assistant. Your role is to help users manage their meetings.
  
  **Capabilities**:
  1. **List Meetings**: Show all scheduled meetings
  2. **Get Meeting Details**: Retrieve specific meeting information
  3. **Create Meetings**: Schedule new meetings with all details
  4. **Update Meetings**: Modify existing meeting information
  5. **Delete Meetings**: Remove meetings (always confirm first)
  
  **Guidelines**:
  - Be conversational and helpful
  - For dates, use ISO 8601 format: YYYY-MM-DDTHH:MM:SS
  - For full-day meetings: start at 00:00:00, end at 23:59:59
  - Valid attendees: Ricardo, Jukka, Máté, Steve
  - Always confirm before deleting meetings
  - Ask clarifying questions when information is missing
  - Provide clear summaries after operations

toolkits:
  - meeting-manager
```

Import agent:
```bash
orchestrate agents import -f orchestrate/specs/meeting-manager-agent.yaml
```

## Implementation Timeline

### Week 1: MCP Server Development
- **Day 1-2**: Set up MCP server project structure
- **Day 3**: Implement tool handlers (list, get, create)
- **Day 4**: Implement tool handlers (update, delete)
- **Day 5**: Testing and refinement

### Week 2: Integration & Testing
- **Day 1**: Import MCP toolkit into watsonx Orchestrate
- **Day 2**: Create and deploy agent
- **Day 3-4**: Comprehensive testing
- **Day 5**: Documentation and deployment

## Advantages of MCP Server Approach

1. **Single Source of Truth**: One server handles all meeting operations
2. **Easy to Extend**: Add new tools without changing the backend
3. **Business Logic**: Can add validation, formatting, and complex operations
4. **Better Error Handling**: Centralized error management
5. **State Management**: Can maintain context between operations
6. **Future-Proof**: MCP is becoming the standard for AI tool integration
7. **Database Agnostic**: Works with both Cloudant (production) and SQLite (local) transparently

## Backend Database Architecture

The meeting-app backend uses a **database adapter pattern** that automatically detects and uses the appropriate database:

- **Production (IBM Cloud Code Engine)**: Uses IBM Cloudant when `CLOUDANT_URL` and `CLOUDANT_APIKEY` environment variables are set
- **Local Development**: Falls back to SQLite when Cloudant credentials are not present
- **Transparent to MCP Server**: The MCP server doesn't need to know which database is being used - it just calls the REST API

### Verifying Database Type

You can verify which database the backend is using:

```bash
# Check backend health endpoint
curl https://meeting-app-backend.xxx.codeengine.appdomain.cloud/health

# Expected production response:
{
  "status": "healthy",
  "database": "cloudant",
  "cosBackup": "disabled"
}

# Local development response:
{
  "status": "healthy",
  "database": "sqlite",
  "cosBackup": "disabled"
}
```

### Data Model Considerations

When using Cloudant, meeting IDs are **timestamp-based strings** (e.g., "1710518400000") instead of auto-incrementing integers. The MCP server tool schemas have been updated to reflect this:

```javascript
// Meeting ID type
id: {
  type: 'string',  // Changed from 'number'
  description: 'The unique ID of the meeting (timestamp-based string)'
}
```

This ensures compatibility with both SQLite (which uses integer IDs) and Cloudant (which uses string IDs).

## Example Enhanced Tools

With MCP server, you can easily add enhanced functionality:

```javascript
// Search meetings by date range
{
  name: 'search_meetings_by_date',
  description: 'Search meetings within a date range',
  inputSchema: {
    type: 'object',
    properties: {
      start_date: { type: 'string' },
      end_date: { type: 'string' }
    }
  }
}

// Find meetings by attendee
{
  name: 'find_meetings_by_attendee',
  description: 'Find all meetings for a specific attendee',
  inputSchema: {
    type: 'object',
    properties: {
      attendee: { type: 'string' }
    }
  }
}

// Check for conflicts
{
  name: 'check_meeting_conflicts',
  description: 'Check if a proposed meeting time conflicts with existing meetings',
  inputSchema: {
    type: 'object',
    properties: {
      start_datetime: { type: 'string' },
      end_datetime: { type: 'string' }
    }
  }
}
```

## Conclusion

The MCP Server approach is **recommended** because it:
- ✅ Is simpler to implement (single codebase)
- ✅ Is more flexible and extensible
- ✅ Provides better integration with AI agents
- ✅ Is the modern standard for AI tool integration
- ✅ Requires less configuration than OpenAPI approach
- ✅ Works seamlessly with Cloudant-backed production deployment
- ✅ Database-agnostic (works with both Cloudant and SQLite)

**Estimated effort**: 1-2 weeks vs 3-4 weeks for OpenAPI approach

## Backend Deployment Considerations

### Production Deployment
The backend is deployed to IBM Cloud Code Engine with:
- **Database**: IBM Cloudant (managed CouchDB)
- **Persistence**: Data survives container restarts
- **Backups**: Automatic daily backups (Standard plan)
- **Endpoint**: HTTPS with public access
- **Health Check**: `/health` endpoint shows database type

### MCP Server Configuration
When deploying the MCP server, configure the backend URL:

```bash
# For production
export BACKEND_URL=https://meeting-app-backend.xxx.codeengine.appdomain.cloud

# For local development
export BACKEND_URL=http://localhost:3000
```

Or set it in the toolkit spec file as shown above.

## Next Steps

1. **Decision**: Choose between OpenAPI or MCP Server approach
2. **If MCP Server**: Follow this implementation plan
   - Update `BACKEND_URL` to point to your Code Engine deployment
   - Verify backend is using Cloudant via `/health` endpoint
   - Test with production data
3. **If OpenAPI**: Follow the original AGENT_IMPLEMENTATION_PLAN.md

Both approaches will work with the Cloudant-backed backend, but MCP Server is recommended for this use case.

## Additional Resources

- [CLOUDANT_DEPLOYMENT.md](ibm-cloud/CLOUDANT_DEPLOYMENT.md) - Cloudant setup and deployment guide
- [AGENT_IMPLEMENTATION_PLAN.md](AGENT_IMPLEMENTATION_PLAN.md) - OpenAPI-based implementation plan
- [IBM Cloudant Documentation](https://cloud.ibm.com/docs/Cloudant)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)