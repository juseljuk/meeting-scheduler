import { ApiClient } from '../utils/api-client.js';

/**
 * Update an existing meeting
 */
export async function updateMeeting(backendUrl, meetingData) {
  try {
    const { id, ...updateData } = meetingData;
    const client = new ApiClient(backendUrl);
    const meeting = await client.updateMeeting(id, updateData);
    
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
      endpoint: `/api/meetings/${meetingData.id}`,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      code: error.code
    };
    throw new Error(`Failed to update meeting: ${JSON.stringify(errorDetails, null, 2)}`);
  }
}

// Made with Bob
