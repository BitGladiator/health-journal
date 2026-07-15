const db = require('../db');
const redis = require('../db/redis');
const { detectCorrelations } = require('../agents/correlationDetector');
const logger = require('../observability/logger');

const MIN_ENTRIES_FOR_ANALYSIS = 5;
const ANALYSIS_COOLDOWN_HOURS = 6; 

const shouldRunAnalysis = async (userId) => {
  const cacheKey = `correlation_analysis:${userId}`;
  const lastRun = await redis.get(cacheKey);
  return !lastRun;
};

const markAnalysisRan = async (userId) => {
  const cacheKey = `correlation_analysis:${userId}`;
  await redis.setex(cacheKey, ANALYSIS_COOLDOWN_HOURS * 60 * 60, '1');
};

const runCorrelationAnalysis = async (userId) => {
  const shouldRun = await shouldRunAnalysis(userId);
  if (!shouldRun) {
    logger.debug('Correlation analysis skipped — cooldown active', { userId });
    return null;
  }


  const { rows: entries } = await db.query(
    `SELECT * FROM symptom_entries
     WHERE user_id = $1
     ORDER BY logged_at DESC
     LIMIT 30`,
    [userId]
  );

  if (entries.length < MIN_ENTRIES_FOR_ANALYSIS) {
    logger.debug('Not enough entries for correlation analysis', {
      userId,
      entryCount: entries.length,
    });
    return null;
  }

  logger.info('Running correlation analysis', { userId, entries: entries.length });

  const result = await detectCorrelations(entries);
  if (!result.success) return null;

  await markAnalysisRan(userId);


  await db.query(
    'DELETE FROM correlations WHERE user_id = $1',
    [userId]
  );

  for (const correlation of result.correlations) {
    await db.query(
      `INSERT INTO correlations
         (user_id, correlation_type, description, confidence, data_points)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        correlation.type,
        correlation.description,
        correlation.confidence,
        correlation.data_points,
      ]
    );
  }

  logger.info('Correlations saved', {
    userId,
    count: result.correlations.length,
  });

  return result;
};


const computeWeeklySummary = async (userId) => {
  const { rows } = await db.query(
    `SELECT
       DATE_TRUNC('week', logged_at) as week_start,
       COUNT(*)                       as total_entries,
       ROUND(AVG(mood), 2)            as avg_mood,
       ROUND(AVG(energy_level), 2)    as avg_energy,
       ROUND(AVG(sleep_hours), 2)     as avg_sleep
     FROM symptom_entries
     WHERE user_id = $1
       AND logged_at >= NOW() - INTERVAL '12 weeks'
     GROUP BY week_start
     ORDER BY week_start DESC`,
    [userId]
  );


  for (const week of rows) {
    const { rows: symptomRows } = await db.query(
      `SELECT
         s->>'name'                                   AS name,
         COUNT(*)                                      AS count,
         ROUND(AVG((s->>'severity')::numeric), 1)      AS avg_severity
       FROM symptom_entries e
       CROSS JOIN LATERAL jsonb_array_elements(e.symptoms) AS s
       WHERE e.user_id = $1
         AND e.logged_at >= $2
         AND e.logged_at < $2::date + INTERVAL '7 days'
         AND e.symptoms != '[]'
       GROUP BY s->>'name'
       ORDER BY count DESC
       LIMIT 5`,
      [userId, week.week_start]
    );

    await db.query(
      `INSERT INTO weekly_summaries
         (user_id, week_start, total_entries, avg_mood, avg_energy, avg_sleep, top_symptoms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, week_start)
       DO UPDATE SET
         total_entries = $3,
         avg_mood      = $4,
         avg_energy    = $5,
         avg_sleep     = $6,
         top_symptoms  = $7`,
      [
        userId,
        week.week_start,
        week.total_entries,
        week.avg_mood,
        week.avg_energy,
        week.avg_sleep,
        JSON.stringify(symptomRows),
      ]
    );
  }

  return rows;
};

module.exports = { runCorrelationAnalysis, computeWeeklySummary };