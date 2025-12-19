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
            id: { 
              type: 'string',
              description: 'User ID'
            },
            email: { 
              type: 'string', 
              format: 'email',
              description: 'User email address'
            },
            displayName: { 
              type: 'string',
              minLength: 3,
              maxLength: 20,
              description: 'Username (3-20 characters, alphanumeric, underscores, hyphens)',
              example: 'johndoe123'
            },
            isVerified: { 
              type: 'boolean',
              description: 'Whether the user has verified their email'
            },
            isAdmin: { 
              type: 'boolean',
              description: 'Whether the user has admin privileges'
            },
            reportCount: { 
              type: 'number',
              description: 'Total number of reports received'
            },
            isBanned: { 
              type: 'boolean',
              description: 'Whether the user is currently banned'
            },
            createdAt: { 
              type: 'string', 
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['displayName', 'email', 'password'],
          properties: {
            displayName: {
              type: 'string',
              minLength: 3,
              maxLength: 20,
              pattern: '^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]{1,2}$',
              description: 'Username (3-20 characters, alphanumeric, underscores, hyphens. Cannot start/end with _ or -)',
              example: 'johndoe123'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'student@university.edu'
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 6,
              example: 'password123'
            }
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
      },
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication endpoints'
        },
        {
          name: 'Users',
          description: 'User profile endpoints'
        },
        {
          name: 'Reports',
          description: 'User reporting endpoints'
        },
        {
          name: 'Admin',
          description: 'Admin-only endpoints'
        },
        {
          name: 'Socket.IO',
          description: 'Real-time WebSocket events for video chat and matchmaking'
        }
      ]
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/routes/socketRoutes.js']
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;