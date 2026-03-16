import { ApiClient } from '../utils/api-client.js';

/**
 * Delete a meeting
 */
export async function deleteMeeting(backendUrl, id) {
  try {
    const client = new ApiClient(backendUrl);
    const result = await client.deleteMeeting(id);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
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
    throw new Error(`Failed to delete meeting: ${JSON.stringify(errorDetails, null, 2)}`);
  }
}

// Made with Bob
