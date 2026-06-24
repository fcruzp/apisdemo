import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Beneficiaries Router
 * 
 * Simulates a government beneficiary registry system.
 * In a real integration scenario, this would be replaced by the actual
 * institutional API (SIUBEN, ADESS, or similar Dominican government system).
 * 
 * Data source: JSON file (beneficiaries.json)
 * In production: PostgreSQL or Oracle DB via institutional API layer.
 * 
 * Authentication: Bearer token via apiKeyAuth middleware (applied in index.ts)
 * All routes in this router are protected — no public access.
 */
const router = Router();

/**
 * @openapi
 * /api/beneficiaries:
 *   get:
 *     summary: Get all beneficiaries
 *     description: |
 *       Returns the list of citizens enrolled in the social protection program.
 *       
 *       Use the `active` query parameter to filter only active beneficiaries.
 *       This is the primary endpoint consumed by the OpenFn integration workflow
 *       in Step 1 of the data sync pipeline.
 *       
 *       **Integration note:** OpenFn calls this endpoint with `?active=true` to
 *       retrieve only records that require payment processing, minimizing data
 *       transfer and avoiding processing of inactive citizens.
 *     tags:
 *       - Beneficiaries
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Filter beneficiaries by active status. If omitted, returns all records.
 *         example: true
 *     responses:
 *       200:
 *         description: List of beneficiaries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Number of records returned
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Beneficiary'
 *       401:
 *         description: Missing or invalid Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error — could not read data source
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    // Read beneficiaries from JSON file.
    // In production this would be a DB query or call to an institutional API.
    // JSON file simulates the data layer for demo purposes without DB dependency.
    const data = readFileSync(
      join(__dirname, '../data/beneficiaries.json'),
      'utf-8'
    );
    const beneficiaries = JSON.parse(data);

    // Optional filter by active status via query parameter.
    // This allows the OpenFn workflow to request only actionable records,
    // reducing payload size and processing time in the integration pipeline.
    const { active } = req.query;
    if (active === 'true') {
      const filtered = beneficiaries.filter((b: any) => b.active === true);
      res.json({
        success: true,
        count: filtered.length,
        data: filtered
      });
      return;
    }

    // Return all records if no filter is applied
    res.json({
      success: true,
      count: beneficiaries.length,
      data: beneficiaries
    });

  } catch (error) {
    // Return 500 if data source is unavailable.
    // In production, this would trigger an alert in the monitoring system.
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Could not read beneficiaries data'
    });
  }
});

export default router;