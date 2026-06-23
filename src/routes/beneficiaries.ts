import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  try {
    const data = readFileSync(
      join(__dirname, '../data/beneficiaries.json'), 
      'utf-8'
    );
    const beneficiaries = JSON.parse(data);

    // Filter only active beneficiaries if query param is passed
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

    res.json({
      success: true,
      count: beneficiaries.length,
      data: beneficiaries
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Could not read beneficiaries data'
    });
  }
});

export default router;