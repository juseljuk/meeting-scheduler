// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error status and message
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Send error response
  res.status(status).json({
    error: {
      message,
      status,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

// Not found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};

// Made with Bob
