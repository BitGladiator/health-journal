const express = require('express');
const authenticate = require('../middleware/authenticate');
const db = require('../db');
const { generateBriefing } = require('../agents/reportGenerator');
const logger = require('../observability/logger');

const router = express.Router();


router.get('/', authenticate, async (req, res) => {
  const { upcoming } = req.query;
  try {
    let query = 'SELECT * FROM appointments WHERE user_id = $1';
    if (upcoming === 'true') query += ' AND scheduled_at >= NOW()';
    query += ' ORDER BY scheduled_at ASC';

    const { rows } = await db.query(query, [req.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/', authenticate, async (req, res) => {
  const { doctor_name, appointment_type, scheduled_at, notes } = req.body;

  if (!scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at is required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO appointments (user_id, doctor_name, appointment_type, scheduled_at, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.userId, doctor_name || null, appointment_type || null, new Date(scheduled_at), notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/:id', authenticate, async (req, res) => {
  const { doctor_name, appointment_type, scheduled_at, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE appointments SET
         doctor_name      = COALESCE($1, doctor_name),
         appointment_type = COALESCE($2, appointment_type),
         scheduled_at     = COALESCE($3, scheduled_at),
         notes            = COALESCE($4, notes)
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [doctor_name, appointment_type, scheduled_at ? new Date(scheduled_at) : null, notes, req.params.id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Appointment not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM appointments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/:id/briefing', authenticate, async (req, res) => {
  try {
    const { rows: apptRows } = await db.query(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!apptRows[0]) return res.status(404).json({ error: 'Appointment not found' });

    const appointment = apptRows[0];


    const { rows: entries } = await db.query(
      `SELECT * FROM symptom_entries
       WHERE user_id = $1
       ORDER BY logged_at DESC
       LIMIT 30`,
      [req.userId]
    );

    const { rows: medications } = await db.query(
      'SELECT * FROM medications WHERE user_id = $1 AND active = true',
      [req.userId]
    );

    const { rows: correlations } = await db.query(
      'SELECT * FROM correlations WHERE user_id = $1 AND dismissed = false ORDER BY confidence DESC LIMIT 5',
      [req.userId]
    );

    const result = await generateBriefing({
      entries, medications, correlations, appointment,
    });

    if (!result.success) {
      return res.status(500).json({ error: 'Briefing generation failed' });
    }


    await db.query(
      'UPDATE appointments SET briefing = $1, briefing_generated = true WHERE id = $2',
      [result.content, req.params.id]
    );

    logger.info('Appointment briefing saved', { appointmentId: req.params.id });
    res.json({ briefing: result.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;