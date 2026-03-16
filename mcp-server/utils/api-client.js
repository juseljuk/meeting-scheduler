import axios from 'axios';

/**
 * API client for making requests to the meeting-app backend
 */
export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get all meetings
   */
  async getMeetings() {
    const response = await this.client.get('/api/meetings');
    return response.data;
  }

  /**
   * Get a specific meeting by ID
   */
  async getMeeting(id) {
    const response = await this.client.get(`/api/meetings/${id}`);
    return response.data;
  }

  /**
   * Create a new meeting
   */
  async createMeeting(meetingData) {
    const response = await this.client.post('/api/meetings', meetingData);
    return response.data;
  }

  /**
   * Update an existing meeting
   */
  async updateMeeting(id, meetingData) {
    const response = await this.client.put(`/api/meetings/${id}`, meetingData);
    return response.data;
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(id) {
    const response = await this.client.delete(`/api/meetings/${id}`);
    return response.data;
  }

  /**
   * Check backend health
   */
  async checkHealth() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Made with Bob
