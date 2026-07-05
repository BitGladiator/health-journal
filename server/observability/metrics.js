const promClient = require('prom-client');

const register = new promClient.Registry();

promClient.collectDefaultMetrics({ register, prefix: 'healthjournal_' });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const symptomEntriesTotal = new promClient.Counter({
  name: 'symptom_entries_total',
  help: 'Total symptom entries logged',
  registers: [register],
});

const aiProcessingDuration = new promClient.Histogram({
  name: 'ai_processing_duration_seconds',
  help: 'Time taken to process symptom entries with AI',
  buckets: [0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  symptomEntriesTotal,
  aiProcessingDuration,
};