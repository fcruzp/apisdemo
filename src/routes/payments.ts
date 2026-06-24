import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Payments Router
 * 
 * Simulates a government payment disbursement system.
 * In a real integration scenario, this would be the API layer of a
 * treasury or social protection payment system (SIGEF, Tesorería Nacional, etc.).
 * 
 * Data source: JSON file (payments.json)
 * In production: PostgreSQL with write-ahead logging for audit trail.
 * 
 * Key design decisions:
 * 
 * 1. IDEMPOTENCY — The POST endpoint checks for duplicate beneficiary IDs
 *    before inserting. This allows the OpenFn workflow to be safely re-run
 *    without creating duplicate payment records — critical for financial data.
 * 
 * 2. VALIDATION — Required fields are validated before processing.
 *    Returns 400 Bad Request with a descriptive message for missing fields.
 * 
 * 3. AUDIT TRAIL — Every payment record includes a processedAt timestamp
 *    for traceability and compliance reporting.
 * 
 * Authentication: Bearer token via apiKeyAuth middleware (applied in index.ts)
 * All routes in this router are protected — no public access.
 */
const router = Router();

/**
 * @openapi
 * /api/payments:
 *   post:
 *     summary: Register a payment for a beneficiary
 *     description: |
 *       Registers a new payment disbursement for an active beneficiary.
 *       
 *       This endpoint is called by the OpenFn workflow in Step 2 of the
 *       data sync pipeline, once per active beneficiary retrieved in Step 1.
 *       
 *       **Idempotency:** The endpoint uses the beneficiary `id` (cédula) as
 *       a natural idempotency key. If a payment for the same `id` already exists,
 *       the request is rejected with `409 Conflict`. This ensures the workflow
 *       can be safely re-run without creating duplicate disbursements.
 *       
 *       **Integration note:** OpenFn uses `request('POST', ...)` from
 *       `@openfn/language-http` v7.x to call this endpoint, as it provides
 *       full control over headers — required for Bearer token authentication
 *       when iterating with `each()`.
 *     tags:
 *       - Payments
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - fullName
 *               - amount
 *             properties:
 *               id:
 *                 type: string
 *                 description: Citizen ID (cédula) — used as idempotency key
 *                 example: '001-1234567-8'
 *               fullName:
 *                 type: string
 *                 description: Full name of the beneficiary
 *                 example: 'María Pérez'
 *               amount:
 *                 type: number
 *                 description: Payment amount in RD$
 *                 example: 2500
 *               municipality:
 *                 type: string
 *                 description: Municipality of residence
 *                 example: 'Santo Domingo'
 *     responses:
 *       201:
 *         description: Payment registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment registered successfully
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Missing required fields in request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: Bad Request
 *               message: id, fullName and amount are required
 *       401:
 *         description: Missing or invalid Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Payment already registered for this beneficiary (idempotency check)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: Conflict
 *               message: Payment for beneficiary 001-1234567-8 already registered
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const { id, fullName, amount, municipality } = req.body;

    // Validate required fields before processing.
    // id is critical — it serves as the idempotency key.
    // fullName and amount are required for the payment record integrity.
    if (!id || !fullName || !amount) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'id, fullName and amount are required'
      });
      return;
    }

    // Read current payment records from data store
    const data = readFileSync(
      join(__dirname, '../data/payments.json'),
      'utf-8'
    );
    const payments = JSON.parse(data);

    // Idempotency check — prevent duplicate payments for the same beneficiary.
    // Uses the citizen ID (cédula) as the natural unique identifier.
    // Returns 409 Conflict if a payment already exists for this ID.
    // This allows the OpenFn workflow to be safely retried without side effects.
    const exists = payments.find((p: any) => p.id === id);
    if (exists) {
      res.status(409).json({
        error: 'Conflict',
        message: `Payment for beneficiary ${id} already registered`
      });
      return;
    }

    // Build payment record with audit timestamp.
    // processedAt provides a traceable record of when the disbursement occurred,
    // required for financial compliance and audit reporting.
    const newPayment = {
      id,
      fullName,
      amount,
      municipality,
      status: 'processed',
      processedAt: new Date().toISOString()
    };

    // Persist payment to data store.
    // In production: INSERT INTO payments with transaction support
    // to ensure atomicity and rollback capability on failure.
    payments.push(newPayment);
    writeFileSync(
      join(__dirname, '../data/payments.json'),
      JSON.stringify(payments, null, 2)
    );

    // Return 201 Created with the full payment record.
    // The OpenFn workflow can use this response to confirm successful processing
    // and store it in state.references for audit trail downstream.
    res.status(201).json({
      success: true,
      message: 'Payment registered successfully',
      data: newPayment
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Could not process payment'
    });
  }
});

/**
 * @openapi
 * /api/payments:
 *   get:
 *     summary: Get all registered payments
 *     description: |
 *       Returns all payment records registered in the system.
 *       
 *       Used for verification and audit purposes — allows operators to confirm
 *       which beneficiaries have been processed by the OpenFn workflow.
 *       
 *       In production, this endpoint would support pagination, date filtering,
 *       and export to formats required by government audit systems.
 *     tags:
 *       - Payments
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all payment records
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
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Missing or invalid Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const data = readFileSync(
      join(__dirname, '../data/payments.json'),
      'utf-8'
    );
    const payments = JSON.parse(data);

    res.json({
      success: true,
      count: payments.length,
      data: payments
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Could not read payments data'
    });
  }
});

export default router;