import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEntry } from "../api/client.js";

const MOOD_LABELS = {
  1: "Terrible",
  2: "Very bad",
  3: "Bad",
  4: "Poor",
  5: "Okay",
  6: "Alright",
  7: "Good",
  8: "Great",
  9: "Very good",
  10: "Excellent",
};

const ENERGY_LABELS = {
  1: "Exhausted",
  2: "Very low",
  3: "Low",
  4: "Below average",
  5: "Average",
  6: "Above average",
  7: "Good",
  8: "High",
  9: "Very high",
  10: "Energised",
};

const ScaleSelector = ({ label, value, onChange, labels }) => (
  <div style={{ marginBottom: "20px" }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
      }}
    >
      <label style={{ fontSize: "13px", fontWeight: "500", color: "#2d3748" }}>
        {label}
      </label>
      {value && (
        <span style={{ fontSize: "12px", color: "#718096" }}>
          {value}/10 — {labels[value]}
        </span>
      )}
    </div>
    <div style={{ display: "flex", gap: "4px" }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(value === n ? null : n)}
          style={{
            flex: 1,
            padding: "7px 0",
            fontSize: "12px",
            fontWeight: "500",
            border: "1px solid",
            borderRadius: "6px",
            cursor: "pointer",
            borderColor: value === n ? "#2d3748" : "#e2e8f0",
            background: value === n ? "#2d3748" : "#fff",
            color: value === n ? "#fff" : "#718096",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
);

const LogEntry = () => {
  const navigate = useNavigate();
  const [rawInput, setRawInput] = useState("");
  const [mood, setMood] = useState(null);
  const [energyLevel, setEnergyLevel] = useState(null);
  const [sleepHours, setSleepHours] = useState("");
  const [loggedAt, setLoggedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const placeholders = [
    "I have had a dull headache since this morning, around a 5 out of 10. Feeling a bit tired too.",
    "Woke up with a sore throat and mild fever. Also some joint aches. Slept about 6 hours.",
    "My lower back has been aching for 2 days now, worse when sitting. Energy is low.",
    "Feeling anxious today, chest feels tight. Headache started around 2pm, maybe a 6/10.",
  ];

  const placeholder = placeholders[new Date().getDay() % placeholders.length];

  const handleSubmit = async () => {
    if (!rawInput.trim()) {
      setError("Please describe how you are feeling");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const entry = await createEntry({
        raw_input: rawInput.trim(),
        mood: mood || undefined,
        energy_level: energyLevel || undefined,
        sleep_hours: sleepHours ? parseFloat(sleepHours) : undefined,
        logged_at: loggedAt || undefined,
      });

      navigate(`/entry/${entry.id}`);
    } catch (err) {
      setError(err.error || "Failed to save entry");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 24px" }}>
      <button
        onClick={() => navigate("/dashboard")}
        style={{
          background: "none",
          border: "none",
          color: "#718096",
          cursor: "pointer",
          fontSize: "13px",
          padding: 0,
          marginBottom: "24px",
        }}
      >
        ← Back
      </button>

      <h1
        style={{
          fontSize: "20px",
          fontWeight: "600",
          color: "#1a202c",
          margin: "0 0 4px",
        }}
      >
        How are you feeling?
      </h1>
      <p style={{ fontSize: "13px", color: "#718096", margin: "0 0 28px" }}>
        Describe your symptoms in plain English. The more detail the better.
      </p>


      <div style={{ marginBottom: "24px" }}>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={placeholder}
          rows={5}
          style={{
            width: "100%",
            padding: "14px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontSize: "14px",
            color: "#1a202c",
            lineHeight: 1.6,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#a0aec0")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "4px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#a0aec0" }}>
            Include location, severity (1-10), and duration if you can
          </span>
          <span
            style={{
              fontSize: "11px",
              color: rawInput.length > 800 ? "#9B2335" : "#a0aec0",
            }}
          >
            {rawInput.length}
          </span>
        </div>
      </div>


      <div
        style={{
          background: "#F7FAFC",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "#718096",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            margin: "0 0 16px",
          }}
        >
          Optional — we will try to infer these from your description
        </h3>

        <ScaleSelector
          label="Mood"
          value={mood}
          onChange={setMood}
          labels={MOOD_LABELS}
        />

        <ScaleSelector
          label="Energy level"
          value={energyLevel}
          onChange={setEnergyLevel}
          labels={ENERGY_LABELS}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "#2d3748",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Sleep last night (hours)
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              placeholder="e.g. 7.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "7px",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "#2d3748",
                display: "block",
                marginBottom: "6px",
              }}
            >
              When did this start?
            </label>
            <input
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "7px",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{ fontSize: "13px", color: "#9B2335", marginBottom: "12px" }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !rawInput.trim()}
        style={{
          width: "100%",
          padding: "12px",
          background: loading || !rawInput.trim() ? "#a0aec0" : "#1a202c",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: "500",
          cursor: loading || !rawInput.trim() ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Analysing your symptoms..." : "Save entry"}
      </button>

      {loading && (
        <p
          style={{
            fontSize: "12px",
            color: "#a0aec0",
            textAlign: "center",
            marginTop: "10px",
          }}
        >
          AI is extracting structured data from your description...
        </p>
      )}
    </div>
  );
};

export default LogEntry;
