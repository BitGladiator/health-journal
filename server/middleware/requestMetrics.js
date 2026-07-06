const { v4: uuidv4 } = require('uuid');
const { httpRequestDuration, httpRequestTotal } = require('../observability/metrics');
const logger = require('../observability/logger');

const requestMetrics = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path.replace(/\/\d+/g, '/:id');

    const labels = { method: req.method, route, status_code: res.statusCode };
    httpRequestDuration.observe(labels, durationSec);
    httpRequestTotal.inc(labels);

    if (durationSec > 1) {
      logger.warn('Slow request', { method: req.method, route, durationMs: Math.round(durationSec * 1000) });
    }
  });

  next();
};

module.exports = requestMetrics;