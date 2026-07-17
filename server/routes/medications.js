const express = require('express');
const authenticate = require('../middleware/authenticate');
const db = require('../db');

const router = express.Router();


router.get('/', authenticate, async (req, res) => {
  const { active } = req.query;
  try {
    let query = 'SELECT * FROM medications WHERE user_id = $1';
    if (active === 'true') query += ' AND active = true';
    query += ' ORDER BY created_at DESC';

    const { rows } = await db.query(query, [req.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/', authenticate, async (req, res) => {
  const { name, dosage, frequency, started_at, prescribed_for, notes } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO medications
         (user_id, name, dosage, frequency, started_at, prescribed_for, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, name, dosage || null, frequency || null, started_at || null, prescribed_for || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/:id', authenticate, async (req, res) => {
  const { name, dosage, frequency, started_at, ended_at, prescribed_for, notes, active } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE medications SET
         name          = COALESCE($1, name),
         dosage        = COALESCE($2, dosage),
         frequency     = COALESCE($3, frequency),
         started_at    = COALESCE($4, started_at),
         ended_at      = COALESCE($5, ended_at),
         prescribed_for = COALESCE($6, prescribed_for),
         notes         = COALESCE($7, notes),
         active        = COALESCE($8, active)
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [name, dosage, frequency, started_at, ended_at, prescribed_for, notes, active, req.params.id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Medication not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM medications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/:id/log', authenticate, async (req, res) => {
  const { taken_at, notes, side_effects } = req.body;
  try {
    const { rows: medRows } = await db.query(
      'SELECT id FROM medications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!medRows[0]) return res.status(404).json({ error: 'Medication not found' });

    const { rows } = await db.query(
      `INSERT INTO medication_logs (medication_id, user_id, taken_at, notes, side_effects)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, req.userId, taken_at ? new Date(taken_at) : new Date(), notes || null, side_effects || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/:id/logs', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ml.* FROM medication_logs ml
       JOIN medications m ON m.id = ml.medication_id
       WHERE ml.medication_id = $1 AND m.user_id = $2
       ORDER BY ml.taken_at DESC
       LIMIT 30`,
      [req.params.id, req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;