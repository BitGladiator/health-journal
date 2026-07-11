const Groq = require("groq-sdk");
const logger = require("../observability/logger");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CORRELATION_PROMPT = `You are a health pattern analyst reviewing a person's symptom journal entries.
Analyse the provided health data and identify meaningful correlations and patterns.

Focus on:
- Sleep duration vs next-day symptoms or mood
- Recurring symptoms at similar times/frequencies
- Mood and energy correlations
- Symptoms that consistently appear together
- Improving or worsening trends over time

Rules:
- Only report correlations with at least 3 supporting data points
- Be specific — name the exact symptoms and metrics involved
- Confidence is 0.0 to 1.0 — only report above 0.5
- Do not invent patterns — if data is insufficient say so
- Keep descriptions plain and conversational — no medical jargon

Respond ONLY with valid JSON:
{
  "correlations": [
    {
      "type": "<sleep_symptom | mood_energy | symptom_cluster | trend | recurring>",
      "description": "<plain English description of the pattern, max 2 sentences>",
      "confidence": <0.5 - 1.0>,
      "data_points": <number of entries supporting this>,
      "actionable_insight": "<one specific thing the person could try, max 15 words>"
    }
  ],
  "overall_summary": "<2-3 sentences describing the person's overall health picture from the data>",
  "data_quality": "<sufficient | insufficient | good>",
  "insufficient_reason": "<why data is insufficient, or null>"
}`;


const compressEntries = (entries) => {
  return entries.map((e) => {
    const symptoms =
      typeof e.symptoms === "string"
        ? JSON.parse(e.symptoms)
        : e.symptoms || [];
    const tags = typeof e.tags === "string" ? JSON.parse(e.tags) : e.tags || [];

    return {
      date: new Date(e.logged_at).toISOString().split("T")[0],
      symptoms: symptoms
        .map(
          (s) =>
            `${s.name}${s.severity ? ` (${s.severity}/10)` : ""}${s.location ? ` in ${s.location}` : ""}`,
        )
        .join(", "),
      mood: e.mood,
      energy: e.energy_level,
      sleep: e.sleep_hours,
      tags: tags.slice(0, 5).join(", "),
    };
  });
};

const detectCorrelations = async (entries) => {
  if (entries.length < 5) {
    return {
      success: false,
      reason: "insufficient_data",
      correlations: [],
      overall_summary: null,
    };
  }

  const compressed = compressEntries(entries);

  const dataText = compressed
    .map(
      (e) =>
        `${e.date}: symptoms=[${e.symptoms || "none"}] mood=${e.mood ?? "?"}/10 energy=${e.energy ?? "?"}/10 sleep=${e.sleep ?? "?"}h tags=[${e.tags || "none"}]`,
    )
    .join("\n");

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", 
      messages: [
        { role: "system", content: CORRELATION_PROMPT },
        {
          role: "user",
          content: `Health journal data (${entries.length} entries, most recent first):\n\n${dataText}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content);

    logger.info("Correlations detected", {
      count: parsed.correlations?.length || 0,
      dataQuality: parsed.data_quality,
      tokens: response.usage?.total_tokens,
    });

    return {
      success: true,
      correlations: parsed.correlations || [],
      overall_summary: parsed.overall_summary,
      data_quality: parsed.data_quality,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (err) {
    logger.error("Correlation detection failed", { error: err.message });
    return { success: false, correlations: [], overall_summary: null };
  }
};

module.exports = { detectCorrelations, compressEntries };
