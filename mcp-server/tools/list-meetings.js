import { ApiClient } from '../utils/api-client.js';

/**
 * List all meetings
 */
export async function listMeetings(backendUrl) {
  try {
    const client = new ApiClient(backendUrl);
    const meetings = await client.getMeetings();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(meetings, null, 2),
        },
      ],
    };
  } catch (error) {
    // Enhanced error details
    const errorDetails = {
      message: error.message,
      backendUrl: backendUrl,
      endpoint: '/api/meetings',
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      code: error.code
    };
    throw new Error(`Failed to list meetings: ${JSON.stringify(errorDetails, null, 2)}`);
  }
}

// Made with Bob
