import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const router = Router();

router.post('/', (req: Request, res: Response): void => {
  try {
    const { id, fullName, amount, municipality } = req.body;

    // Basic validation
    if (!id || !fullName || !amount) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'id, fullName and amount are required'
      });
      return;
    }

    // Read existing payments
    const data = readFileSync(
      join(__dirname, '../data/payments.json'),
      'utf-8'
    );
    const payments = JSON.parse(data);

    // Check for duplicate
    const exists = payments.find((p: any) => p.id === id);
    if (exists) {
      res.status(409).json({
        error: 'Conflict',
        message: `Payment for beneficiary ${id} already registered`
      });
      return;
    }

    // Create new payment record
    const newPayment = {
      id,
      fullName,
      amount,
      municipality,
      status: 'processed',
      processedAt: new Date().toISOString()
    };

    payments.push(newPayment);

    // Save back to file
    writeFileSync(
      join(__dirname, '../data/payments.json'),
      JSON.stringify(payments, null, 2)
    );

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

// GET to view all payments
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