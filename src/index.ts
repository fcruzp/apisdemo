import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { apiKeyAuth } from './middleware/auth';
import beneficiariesRouter from './routes/beneficiaries';
import paymentsRouter from './routes/payments';

dotenv.config();

/**
 * Government Integration API Demo
 * 
 * Express server exposing two API endpoints that simulate Dominican government
 * systems integrated via OpenFn workflows.
 * 
 * Architecture:
 *   - /health          → Public health check (no auth required)
 *   - /api-docs        → Swagger UI — interactive API documentation
 *   - /api/beneficiaries → Protected — Bearer token required
 *   - /api/payments      → Protected — Bearer token required
 * 
 * Security:
 *   All /api/* routes are protected by the apiKeyAuth middleware.
 *   Authentication uses Bearer token (RFC 6750).
 *   The token is validated against the API_KEY environment variable.
 *   Credentials are never hardcoded — loaded from .env locally,
 *   and from Render environment variables in production.
 * 
 * Author: Francisco Cruz
 */

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────

// Parse incoming JSON request bodies.
// Required for POST /api/payments to read req.body correctly.
app.use(express.json());

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: |
 *       Public endpoint to verify the API is running.
 *       No authentication required.
 *       Used by Render to confirm the service is live after deployment,
 *       and by OpenFn to verify connectivity before running workflows.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: Government Integration API Demo
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2026-06-23T22:00:00.000Z'
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Government Integration API Demo',
    timestamp: new Date().toISOString()
  });
});

// Swagger UI — interactive API documentation.
// Available at /api-docs — no authentication required so reviewers
// and integration partners can explore the API spec without credentials.
// The raw OpenAPI JSON spec is available at /api-docs.json
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Government Integration API',
  swaggerOptions: {
    persistAuthorization: true // keeps Bearer token across page refreshes
  }
}));

// Expose raw OpenAPI spec as JSON for tooling integrations
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── PROTECTED ROUTES ──────────────────────────────────────────────────────────

// apiKeyAuth middleware validates Bearer token on every /api/* request.
// Applied here at the router level so all routes in both routers are protected
// without repeating the middleware in each individual route handler.
app.use('/api/beneficiaries', apiKeyAuth, beneficiariesRouter);
app.use('/api/payments', apiKeyAuth, paymentsRouter);

// ── ERROR HANDLERS ────────────────────────────────────────────────────────────

// 404 handler — catches any request to an undefined route.
// Returns a descriptive message to help API consumers identify typos in URLs.
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`
  });
});

// ── START SERVER ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Government API Demo running on port ${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});