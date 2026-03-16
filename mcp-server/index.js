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

// Made with Bob
