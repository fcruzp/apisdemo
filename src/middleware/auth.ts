import { Request, Response, NextFunction } from 'express';

/**
 * Authentication Middleware — Bearer Token (RFC 6750)
 * 
 * PURPOSE:
 * Protects all /api/* routes by validating the Bearer token on every request.
 * Applied at the router level in index.ts so no route handler executes
 * without a valid token — enforcing a single, consistent security boundary.
 * 
 * AUTHENTICATION STRATEGY:
 * This middleware supports two authentication mechanisms for flexibility:
 * 
 *   1. Bearer Token (PRIMARY — RFC 6750 standard)
 *      Header: Authorization: Bearer <token>
 *      Used by: OpenFn HTTP adaptor via state.configuration.token
 *      Why: Industry standard, natively supported by OpenFn Credentials,
 *           Swagger UI, and all major API clients (Postman, curl, etc.)
 * 
 *   2. API Key Header (SECONDARY — for backward compatibility)
 *      Header: x-api-key: <token>
 *      Used by: Direct API calls, legacy clients
 *      Why: Provides flexibility for clients that don't support Bearer auth
 * 
 * WHAT IS EXPLICITLY AVOIDED:
 *   - Query parameters (e.g. ?api_key=...) — credentials appear in:
 *     · Server logs
 *     · CDN/proxy logs (Cloudflare, Nginx)
 *     · Browser history
 *     · Shared URLs
 *     Unacceptable for APIs handling citizen data in government systems.
 * 
 * TOKEN VALIDATION:
 * The provided token is compared against the API_KEY environment variable.
 * In production this would be replaced by:
 *   - A database lookup for per-institution tokens
 *   - JWT signature verification with expiration check
 *   - OAuth 2.0 token introspection
 * 
 * ERROR RESPONSES:
 * Returns 401 Unauthorized for any of these conditions:
 *   - No Authorization header and no x-api-key header
 *   - Authorization header present but not Bearer format
 *   - Token present but does not match API_KEY
 * 
 * NOTE: 401 (Unauthorized) is used rather than 403 (Forbidden) because
 * the request lacks valid authentication credentials — not because the
 * authenticated identity lacks permission. This distinction matters for
 * API clients that retry with fresh credentials on 401.
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {

  // Extract token from Authorization header (Bearer scheme)
  // Format: "Authorization: Bearer <token>"
  // The split(' ')[1] extracts the token after the "Bearer " prefix.
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  let providedKey: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Primary path — Bearer token from OpenFn or standard API clients
    providedKey = authHeader.split(' ')[1];
  } else if (apiKeyHeader) {
    // Secondary path — x-api-key header for backward compatibility
    providedKey = apiKeyHeader as string;
  }

  // Reject request immediately if no token was provided by either mechanism.
  // next() is NOT called — the request chain stops here.
  if (!providedKey || providedKey !== process.env.API_KEY) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
    return;
  }

  // Token is valid — pass control to the next middleware or route handler.
  // At this point the request is authenticated and safe to process.
  next();
};