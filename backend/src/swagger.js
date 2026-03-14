const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meeting Scheduler API',
      version: '1.0.0',
      description: 'API for managing customer meetings with participants (Ricardo, Jukka, Máté, Steve)',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    tags: [
      {
        name: 'Meetings',
        description: 'Meeting management endpoints',
      },
      {
        name: 'Health',
        description: 'Health check endpoint',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/server.js'], // Path to API routes with JSDoc comments
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

// Made with Bob