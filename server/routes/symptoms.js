const express = require("express");
const authenticate = require("../middleware/authenticate");
const db = require("../db");
const { symptomEntriesTotal } = require("../observability/metrics");
const logger = require("../observability/logger");
const { parseSymptoms } = require("../agents/symptomParser");

const router = express.Router();


router.get("/", authenticate, async (req, res) => {
  const { limit = 50, offset = 0, from, to, tag } = req.query;

  try {
    const conditions = ["user_id = $1"];
    const params = [req.userId];
    let paramIndex = 2;

    if (from) {
      conditions.push(`logged_at >= $${paramIndex++}`);
      params.push(new Date(from));
    }
    if (to) {
      conditions.push(`logged_at <= $${paramIndex++}`);
      params.push(new Date(to));
    }
    if (tag) {
      conditions.push(`tags @> $${paramIndex++}`);
      params.push(JSON.stringify([tag]));
    }

    const where = conditions.join(" AND ");

    const { rows } = await db.query(
      `SELECT * FROM symptom_entries
       WHERE ${where}
       ORDER BY logged_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit), parseInt(offset)],
    );

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) as total FROM symptom_entries WHERE ${where}`,
      params,
    );

    res.json({
      entries: rows,
      total: parseInt(countRows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/:id", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM symptom_entries WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId],
    );
    if (!rows[0]) return res.status(404).json({ error: "Entry not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/symptoms
router.post("/", authenticate, async (req, res) => {
  const { raw_input, mood, energy_level, sleep_hours, notes, logged_at } =
    req.body;

  if (!raw_input || raw_input.trim().length === 0) {
    return res.status(400).json({ error: "raw_input is required" });
  }

  try {

    const parsed = await parseSymptoms(raw_input.trim());


    const finalMood = mood ?? parsed.data?.mood ?? null;
    const finalEnergyLevel = energy_level ?? parsed.data?.energy_level ?? null;
    const finalSleepHours = sleep_hours ?? parsed.data?.sleep_hours ?? null;
    const symptoms = parsed.data?.symptoms || [];
    const tags = parsed.data?.tags || [];
    const aiSummary = parsed.data?.summary || null;

    const { rows } = await db.query(
      `INSERT INTO symptom_entries
         (user_id, raw_input, symptoms, mood, energy_level,
          sleep_hours, notes, tags, logged_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.userId,
        raw_input.trim(),
        JSON.stringify(symptoms),
        finalMood,
        finalEnergyLevel,
        finalSleepHours,
        notes || aiSummary || null,
        JSON.stringify(tags),
        logged_at ? new Date(logged_at) : new Date(),
      ],
    );

    symptomEntriesTotal.inc();

    logger.info("Symptom entry created", {
      userId: req.userId,
      entryId: rows[0].id,
      symptomsCount: symptoms.length,
      aiSuccess: parsed.success,
    });

    res.status(201).json({
      ...rows[0],
      ai_summary: aiSummary,
      ai_success: parsed.success,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put("/:id", authenticate, async (req, res) => {
  const { raw_input, mood, energy_level, sleep_hours, notes } = req.body;

  try {

    let symptoms = undefined;
    let tags = undefined;
    let aiSummary = null;

    if (raw_input) {
      const parsed = await parseSymptoms(raw_input.trim());
      symptoms = parsed.data?.symptoms || [];
      tags = parsed.data?.tags || [];
      aiSummary = parsed.data?.summary || null;
    }

    const { rows } = await db.query(
      `UPDATE symptom_entries SET
         raw_input    = COALESCE($1, raw_input),
         symptoms     = COALESCE($2, symptoms),
         mood         = COALESCE($3, mood),
         energy_level = COALESCE($4, energy_level),
         sleep_hours  = COALESCE($5, sleep_hours),
         notes        = COALESCE($6, notes),
         tags         = COALESCE($7, tags)
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        raw_input || null,
        symptoms ? JSON.stringify(symptoms) : null,
        mood || null,
        energy_level || null,
        sleep_hours || null,
        notes || aiSummary || null,
        tags ? JSON.stringify(tags) : null,
        req.params.id,
        req.userId,
      ],
    );

    if (!rows[0]) return res.status(404).json({ error: "Entry not found" });
    res.json({ ...rows[0], ai_summary: aiSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete("/:id", authenticate, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM symptom_entries WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/tags/all", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT jsonb_array_elements_text(tags) as tag
       FROM symptom_entries
       WHERE user_id = $1
       ORDER BY tag`,
      [req.userId],
    );
    res.json(rows.map((r) => r.tag));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
