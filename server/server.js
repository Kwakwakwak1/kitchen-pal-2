import app from './app.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_PORT = process.env.API_PORT || 3004;

// Start server
const server = app.listen(API_PORT, () => {
  console.log(`🚀 Kitchen Pal API Server running on port ${API_PORT}`);
  console.log(`📊 Health check available at http://localhost:${API_PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

export default server;