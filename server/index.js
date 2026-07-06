require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const { execSync } = require('child_process');

const requestMetrics = require('./middleware/requestMetrics');
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { register } = require('./observability/metrics');
const logger = require('./observability/logger');

const authRoutes     = require('./routes/auth');
const symptomRoutes  = require('./routes/symptoms');

const app = express();


try {
  logger.info('Running migrations...');
  execSync('npm run migrate:up', { cwd: __dirname, stdio: 'inherit' });
  logger.info('Migrations complete');
} catch (err) {
  logger.error('Migration failed', { error: err.message });
  process.exit(1);
}

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
].filter(Boolean);

app.use(helmet());
app.use(compression());
app.use(requestMetrics);
app.use(globalLimiter);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/symptoms', symptomRoutes);

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  uptime: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
}));

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => logger.info(`Health Journal server running on port ${PORT}`));