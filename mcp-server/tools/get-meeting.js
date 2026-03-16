import { ApiClient } from '../utils/api-client.js';

/**
 * Get a specific meeting by ID
 */
export async function getMeeting(backendUrl, id) {
  try {
    const client = new ApiClient(backendUrl);
    const meeting = await client.getMeeting(id);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(meeting, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorDetails = {
      message: error.message,
      backendUrl: backendUrl,
      endpoint: `/api/meetings/${id}`,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      code: error.code
    };
    throw new Error(`Failed to get meeting: ${JSON.stringify(errorDetails, null, 2)}`);
  }
}

// Made with Bob
