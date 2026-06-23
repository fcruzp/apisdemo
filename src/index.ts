import express from 'express';
import dotenv from 'dotenv';
import { apiKeyAuth } from './middleware/auth';
import beneficiariesRouter from './routes/beneficiaries';
import paymentsRouter from './routes/payments';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check - public, no auth required
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'Government Integration API Demo',
    timestamp: new Date().toISOString()
  });
});

// Protected routes - API key required
app.use('/api/beneficiaries', apiKeyAuth, beneficiariesRouter);
app.use('/api/payments', apiKeyAuth, paymentsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`
  });
});

app.listen(PORT, () => {
  console.log(`Government API Demo running on port ${PORT}`);
});