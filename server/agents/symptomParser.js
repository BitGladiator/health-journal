const Groq = require("groq-sdk");
const logger = require("../observability/logger");
const { aiProcessingDuration } = require("../observability/metrics");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PARSER_PROMPT = `You are a medical symptom extraction assistant.
Extract structured health data from a person's plain English symptom description.

Rules:
- severity is always 1-10 (1 = barely noticeable, 10 = unbearable)
- duration examples: "since this morning", "3 days", "2 hours", "ongoing"
- location is a body part or null if not mentioned
- tags are short lowercase keywords useful for pattern detection
- mood and energy are 1-10 if inferable from text, null if not mentioned
- sleep_hours is a number if mentioned, null otherwise
- If a symptom is vague (e.g. "feeling off"), still extract it with best-guess severity

Respond ONLY with valid JSON, no markdown:
{
  "symptoms": [
    {
      "name": "<symptom name, lowercase>",
      "severity": <1-10 or null>,
      "location": "<body part or null>",
      "duration": "<duration string or null>",
      "notes": "<any extra detail about this specific symptom or null>"
    }
  ],
  "mood": <1-10 or null>,
  "energy_level": <1-10 or null>,
  "sleep_hours": <number or null>,
  "tags": ["<tag1>", "<tag2>", ...],
  "summary": "<one sentence plain English summary of the overall health picture>"
}`;

const parseSymptoms = async (rawInput) => {
  const end = aiProcessingDuration.startTimer();

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: PARSER_PROMPT },
        { role: "user", content: rawInput },
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response from model");

    const parsed = JSON.parse(raw);
    end();

    logger.debug("Symptom entry parsed", {
      symptomsFound: parsed.symptoms?.length || 0,
      tags: parsed.tags,
      tokens: response.usage?.total_tokens,
    });

    return {
      success: true,
      data: parsed,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (err) {
    end();
    logger.error("Symptom parsing failed", { error: err.message });
    return { success: false, data: null, tokens: 0 };
  }
};

module.exports = { parseSymptoms };
