const Groq = require("groq-sdk");
const logger = require("../observability/logger");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const BRIEFING_PROMPT = `You are a medical assistant helping a patient prepare for a doctor's appointment.
Generate a clear, structured pre-appointment briefing based on their recent symptom journal entries and current medications.

The briefing should help the doctor quickly understand:
1. The main symptoms and concerns to discuss
2. How symptoms have changed over time
3. Current medications
4. Any patterns or correlations detected

Keep it factual, clear, and medically useful. Use plain English.
Format with clear sections using markdown headings.

Respond with the full briefing text — no JSON wrapper needed.`;

const REPORT_PROMPT = `You are a medical assistant generating a structured health summary report.
This report will be shared with a healthcare provider.

Create a comprehensive but concise report covering:
1. Chief complaints — main symptoms and their severity
2. Timeline — when symptoms started and how they progressed
3. Associated symptoms — what appears together
4. Aggravating and relieving factors — based on patterns in the data
5. Current medications and any noted side effects
6. Vital trends — sleep, mood, energy over the period
7. Questions to ask the doctor — based on the patterns

Use clear medical-style language but keep it readable.
Format with markdown headings and bullet points.

Respond with the full report text — no JSON wrapper needed.`;

const buildDataContext = ({
  entries,
  medications,
  correlations,
  appointment,
}) => {
  const entryText = entries
    .slice(0, 20)
    .map((e) => {
      const symptoms =
        typeof e.symptoms === "string"
          ? JSON.parse(e.symptoms)
          : e.symptoms || [];
      const symptomNames = symptoms
        .map((s) => `${s.name}${s.severity ? ` (${s.severity}/10)` : ""}`)
        .join(", ");

      return `${new Date(e.logged_at).toLocaleDateString()}: ${symptomNames || e.raw_input.slice(0, 80)}${e.mood ? ` | mood ${e.mood}/10` : ""}${e.sleep_hours ? ` | sleep ${e.sleep_hours}h` : ""}`;
    })
    .join("\n");

  const medText =
    medications.length > 0
      ? medications
          .map(
            (m) =>
              `- ${m.name} ${m.dosage || ""} ${m.frequency || ""}${m.prescribed_for ? ` (for ${m.prescribed_for})` : ""}`,
          )
          .join("\n")
      : "None reported";

  const corrText =
    correlations.length > 0
      ? correlations
          .map(
            (c) =>
              `- ${c.description} (${Math.round(parseFloat(c.confidence) * 100)}% confidence)`,
          )
          .join("\n")
      : "None detected yet";

  const apptText = appointment
    ? `Doctor: ${appointment.doctor_name || "Not specified"}\nType: ${appointment.appointment_type || "General"}\nDate: ${new Date(appointment.scheduled_at).toLocaleDateString()}`
    : "";

  return `${apptText ? `APPOINTMENT:\n${apptText}\n\n` : ""}RECENT SYMPTOM ENTRIES (${entries.length} total):\n${entryText}\n\nCURRENT MEDICATIONS:\n${medText}\n\nDETECTED PATTERNS:\n${corrText}`;
};

const generateBriefing = async ({
  entries,
  medications,
  correlations,
  appointment,
}) => {
  const context = buildDataContext({
    entries,
    medications,
    correlations,
    appointment,
  });

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: BRIEFING_PROMPT },
        { role: "user", content: context },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    logger.info("Appointment briefing generated", {
      tokens: response.usage?.total_tokens,
    });
    return {
      success: true,
      content,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (err) {
    logger.error("Briefing generation failed", { error: err.message });
    return { success: false, content: null };
  }
};

const generateDoctorReport = async ({
  entries,
  medications,
  correlations,
  periodFrom,
  periodTo,
}) => {
  const context = buildDataContext({ entries, medications, correlations });

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: REPORT_PROMPT },
        {
          role: "user",
          content: `Period: ${periodFrom} to ${periodTo}\n\n${context}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const content = response.choices[0]?.message?.content;
    logger.info("Doctor report generated", {
      tokens: response.usage?.total_tokens,
    });
    return {
      success: true,
      content,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (err) {
    logger.error("Report generation failed", { error: err.message });
    return { success: false, content: null };
  }
};

module.exports = { generateBriefing, generateDoctorReport };
