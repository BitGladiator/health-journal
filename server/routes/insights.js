const express = require('express');
const authenticate = require('../middleware/authenticate');
const db = require('../db');
const { runCorrelationAnalysis, computeWeeklySummary } = require('../services/insightsService');

const router = express.Router();


router.get('/correlations', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM correlations
       WHERE user_id = $1
         AND dismissed = false
       ORDER BY confidence DESC, detected_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/weekly', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM weekly_summaries
       WHERE user_id = $1
       ORDER BY week_start DESC
       LIMIT 12`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/symptom-frequency', authenticate, async (req, res) => {
  const { days = 30 } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT
         s->>'name'                                    AS symptom,
         COUNT(*)                                      AS occurrences,
         ROUND(AVG((s->>'severity')::numeric), 1)      AS avg_severity,
         MAX(e.logged_at)                              AS last_seen
       FROM symptom_entries e
       CROSS JOIN LATERAL jsonb_array_elements(e.symptoms) AS s
       WHERE e.user_id = $1
         AND e.logged_at >= NOW() - INTERVAL '1 day' * $2
         AND e.symptoms != '[]'
       GROUP BY s->>'name'
       ORDER BY occurrences DESC
       LIMIT 15`,
      [req.userId, parseInt(days)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/timeline', authenticate, async (req, res) => {
  const { days = 30 } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT
         DATE(logged_at)      as date,
         ROUND(AVG(mood), 1)          as avg_mood,
         ROUND(AVG(energy_level), 1)  as avg_energy,
         ROUND(AVG(sleep_hours), 1)   as avg_sleep,
         COUNT(*)                      as entry_count
       FROM symptom_entries
       WHERE user_id = $1
         AND logged_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(logged_at)
       ORDER BY date ASC`,
      [req.userId, parseInt(days)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/analyse', authenticate, async (req, res) => {
  try {

    const redis = require('../db/redis');
    await redis.del(`correlation_analysis:${req.userId}`);

    const result = await runCorrelationAnalysis(req.userId);
    await computeWeeklySummary(req.userId);

    if (!result) {
      return res.json({ message: 'Not enough entries for analysis yet. Log at least 5 entries.' });
    }

    res.json({
      correlations_found: result.correlations.length,
      data_quality: result.data_quality,
      overall_summary: result.overall_summary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/correlations/:id/dismiss', authenticate, async (req, res) => {
  try {
    await db.query(
      'UPDATE correlations SET dismissed = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;