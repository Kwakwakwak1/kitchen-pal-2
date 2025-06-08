import morgan from 'morgan';
import winston from 'winston';

// Configure logger for HTTP requests
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/access.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Custom token to scrub sensitive data from logs
morgan.token('sanitized-body', (req) => {
  if (!req.body) return '{}';
  
  const sensitiveFields = ['password', 'password_hash', 'token', 'refresh_token', 'session_token'];
  const sanitized = { ...req.body };
  
  // Recursively scrub sensitive fields
  function scrubObject(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        scrubObject(obj[key]);
      } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      }
    }
  }
  
  scrubObject(sanitized);
  return JSON.stringify(sanitized);
});

// Custom token for user ID (if authenticated)
morgan.token('user-id', (req) => {
  return req.user?.id || 'anonymous';
});

// Morgan format with sensitive data scrubbing
const morganFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Create Morgan middleware with custom logger
const loggingMiddleware = morgan(morganFormat, {
  stream: {
    write: (message) => {
      // Remove trailing newline and log as info
      logger.info(message.trim());
    }
  },
  skip: (req, res) => {
    // Skip logging for health checks in production
    if (process.env.NODE_ENV === 'production' && req.url === '/health') {
      return true;
    }
    return false;
  }
});

export default loggingMiddleware;