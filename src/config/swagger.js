const swaggerJsDoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fluxx API Documentation',
      version: '1.0.0',
      description: 'University-exclusive random video chat platform API',
      contact: {
        name: 'Murewa Ajala',
        email: 'murewaajala@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://fluxx-api.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string' },
            isVerified: { type: 'boolean' },
            isAdmin: { type: 'boolean' },
            reportCount: { type: 'number' },
            isBanned: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Report: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            reporterId: { type: 'string' },
            reportedUserId: { type: 'string' },
            reason: { 
              type: 'string',
              enum: ['inappropriate_content', 'harassment', 'nudity', 'spam', 'other']
            },
            status: {
              type: 'string',
              enum: ['pending', 'reviewed', 'dismissed']
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;