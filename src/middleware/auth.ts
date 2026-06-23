import { Request, Response, NextFunction } from 'express';

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Support both Bearer token and x-api-key header
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  let providedKey: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.split(' ')[1];
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader as string;
  }

  if (!providedKey || providedKey !== process.env.API_KEY) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
    return;
  }

  next();
};