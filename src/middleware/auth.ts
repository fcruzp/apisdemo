import { Request, Response, NextFunction } from 'express';

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  console.log('Headers received:', JSON.stringify(req.headers));
  
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid API key required in x-api-key header'
    });
    return;
  }

  next();
};