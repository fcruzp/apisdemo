import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Swagger/OpenAPI Configuration
 * 
 * This generates the OpenAPI 3.0 specification for the Government Integration API.
 * The spec is built from JSDoc comments (@openapi) in each route file.
 * 
 * Access the interactive UI at: /api-docs
 * Access the raw JSON spec at: /api-docs.json
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Government Integration API Demo',
      version: '1.0.0',
      description: `
## Overview
This API simulates two government systems used in a social protection integration project built with OpenFn.

**System 1 — Beneficiaries Registry:** Exposes citizen beneficiary data for consumption by integration workflows.

**System 2 — Payments System:** Receives and registers payment disbursements for active beneficiaries.

## Authentication
All endpoints (except \`/health\`) require Bearer token authentication.

Include the token in every request:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Integration Context
These APIs are consumed by an OpenFn workflow that:
1. Fetches active beneficiaries from \`GET /api/beneficiaries\`
2. Transforms and validates the data
3. Registers a payment for each beneficiary via \`POST /api/payments\`

This pattern simulates real interoperability between Dominican government institutions.
      `,
      contact: {
        name: 'Francisco Cruz',
        email: 'fcruzp@gmail.com'
      }
    },
    servers: [
      {
        url: 'https://government-api-demo.onrender.com',
        description: 'Production server (Render)'
      },
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      }
    ],
    components: {
      securitySchemes: {
        // Bearer token authentication scheme
        // This is the industry standard (RFC 6750) used across both endpoints.
        // The token is validated by the apiKeyAuth middleware before any route handler executes.
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'Enter your API key as a Bearer token. Example: `Bearer gov-demo-secret-2026`'
        }
      },
      schemas: {
        // Beneficiary schema — represents a citizen enrolled in a social protection program
        Beneficiary: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Citizen ID (cédula dominicana)',
              example: '001-1234567-8'
            },
            fullName: {
              type: 'string',
              description: 'Full name of the beneficiary',
              example: 'María Pérez'
            },
            amount: {
              type: 'number',
              description: 'Disbursement amount in RD$',
              example: 2500
            },
            active: {
              type: 'boolean',
              description: 'Whether the beneficiary is currently active in the program',
              example: true
            },
            municipality: {
              type: 'string',
              description: 'Municipality of residence',
              example: 'Santo Domingo'
            }
          }
        },

        // Payment schema — represents a registered payment disbursement
        Payment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Citizen ID — used as idempotency key to prevent duplicate payments',
              example: '001-1234567-8'
            },
            fullName: {
              type: 'string',
              description: 'Full name of the beneficiary',
              example: 'María Pérez'
            },
            amount: {
              type: 'number',
              description: 'Payment amount in RD$',
              example: 2500
            },
            municipality: {
              type: 'string',
              description: 'Municipality of residence',
              example: 'Santo Domingo'
            },
            status: {
              type: 'string',
              enum: ['processed'],
              description: 'Payment status',
              example: 'processed'
            },
            processedAt: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp of when the payment was registered',
              example: '2026-06-23T22:00:00.000Z'
            }
          }
        },

        // Standard error response schema
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
              example: 'Unauthorized'
            },
            message: {
              type: 'string',
              description: 'Human-readable error description',
              example: 'Valid API key required'
            }
          }
        }
      }
    },
    // Apply Bearer auth globally to all endpoints except /health
    security: [{ BearerAuth: [] }]
  },
  // Scan these files for @openapi JSDoc comments
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);