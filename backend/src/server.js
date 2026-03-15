const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const meetingsRouter = require('./routes/meetings');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initializeCOSBackup, isCOSConfigured } = require('./cosBackup');
const { initDatabase, getDatabaseType } = require('./databaseAdapter');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database (async)
initDatabase().then(() => {
  console.log(`✅ Database ready: ${getDatabaseType()}`);
  
  // Initialize COS backup system only if using SQLite (not needed for Cloudant)
  if (getDatabaseType() === 'sqlite') {
    initializeCOSBackup();
  }
}).catch(error => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: getDatabaseType(),
    cosBackup: getDatabaseType() === 'sqlite' && isCOSConfigured() ? 'enabled' : 'disabled'
  });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Meeting Scheduler API Documentation',
}));

// API routes
app.use('/api/meetings', meetingsRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Made with Bob
