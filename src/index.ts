import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import healthRoutes from './routes/health';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import apiRoutes from './routes/index';
import config from './config';
import logger from './utils/logger';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agile Metrics Service API',
      version: '1.0.0',
      description: 'API for Agile Metrics and Analytics',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/**/*.ts'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

const app = express();

app.use(express.json());

// Request logger middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
});

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health routes
app.use('/api/health', healthRoutes);

// Debug endpoint for environment variables
app.get('/debug/env', (_req: Request, res: Response) => {
  res.json({
    JIRA_URL: config.jiraUrl ? 'SET' : 'NOT SET',
    JIRA_USER: config.jiraUser ? 'SET' : 'NOT SET',
    JIRA_TOKEN: config.jiraToken ? 'SET' : 'NOT SET',
    GITLAB_URL: config.gitlabUrl ? 'SET' : 'NOT SET',
    GITLAB_TOKEN: config.gitlabToken ? 'SET' : 'NOT SET',
    CONFLUENCE_URL: config.confluenceUrl ? 'SET' : 'NOT SET',
    CONFLUENCE_TOKEN: config.confluenceToken ? 'SET' : 'NOT SET',
    NODE_ENV: config.env,
  });
});

// API routes
app.use('/api/v1', apiRoutes);

// Catch-all 404 handler for API
app.use('/api/v1', (req: Request, res: Response) => {
  logger.warn(`404 Not Found: ${req.originalUrl}`);
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Global error handler: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Swagger docs available at: http://localhost:${config.port}/api-docs`);
}); 