import { ApiClient } from '../utils/api-client.js';

/**
 * Create a new meeting
 */
export async function createMeeting(backendUrl, meetingData) {
  try {
    const client = new ApiClient(backendUrl);
    const meeting = await client.createMeeting(meetingData);
    
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
      endpoint: '/api/meetings',
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      code: error.code
    };
    throw new Error(`Failed to create meeting: ${JSON.stringify(errorDetails, null, 2)}`);
  }
}

// Made with Bob
