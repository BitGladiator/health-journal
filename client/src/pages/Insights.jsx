import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCorrelations,
  getWeeklySummaries,
  getSymptomFrequency,
  getTimeline,
  triggerAnalysis,
  dismissCorrelation,
} from "../api/client.js";

const CONFIDENCE_LABEL = (c) => {
  if (c >= 0.85) return { label: "Strong", color: "#276749", bg: "#F0FFF4" };
  if (c >= 0.7) return { label: "Moderate", color: "#744210", bg: "#FEFCBF" };
  return { label: "Possible", color: "#2B6CB0", bg: "#EBF8FF" };
};

const TYPE_ICON = {
  sleep_symptom: "😴",
  mood_energy: "⚡",
  symptom_cluster: "🔗",
  trend: "📈",
  recurring: "🔄",
};


const LineChart = ({ data, keys, colors, height = 120 }) => {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length < 2)
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#a0aec0",
          fontSize: "12px",
        }}
      >
        Not enough data yet
      </div>
    );

  const W = 100; 
  const allValues = data
    .flatMap((d) => keys.map((k) => parseFloat(d[k] || 0)))
    .filter(Boolean);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const toX = (i) => (i / (data.length - 1)) * W;
  const toY = (v) =>
    height - ((parseFloat(v || 0) - min) / range) * (height - 20) - 10;

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
      >
        {[min, (min + max) / 2, max].map((v, i) => (
          <g key={i}>
            <line
              x1="0"
              y1={toY(v)}
              x2="100"
              y2={toY(v)}
              stroke="#f1f5f9"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}

        {keys.map((key, ki) => {
          const points = data
            .map((d, i) => `${toX(i)},${toY(d[key])}`)
            .join(" ");
          const areaPoints = [
            `0,${height}`,
            ...data.map((d, i) => `${toX(i)},${toY(d[key])}`),
            `${W},${height}`,
          ].join(" ");

          return (
            <g key={key}>
              <polygon points={areaPoints} fill={colors[ki]} opacity="0.08" />
              <polyline
                points={points}
                fill="none"
                stroke={colors[ki]}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {data.map(
                (d, i) =>
                  d[key] && (
                    <circle
                      key={i}
                      cx={toX(i)}
                      cy={toY(d[key])}
                      r="1.5"
                      fill={colors[ki]}
                      vectorEffect="non-scaling-stroke"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHovered({ i, d })}
                      onMouseLeave={() => setHovered(null)}
                    />
                  ),
              )}
            </g>
          );
        })}
      </svg>


      {hovered && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${(hovered.i / (data.length - 1)) * 100}%`,
            transform: "translateX(-50%)",
            background: "#1a202c",
            color: "#fff",
            fontSize: "10px",
            padding: "5px 8px",
            borderRadius: "6px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: "600", marginBottom: "2px" }}>
            {new Date(hovered.d.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
          {keys.map(
            (k, ki) =>
              hovered.d[k] && (
                <div key={k} style={{ color: colors[ki] }}>
                  {k.replace("avg_", "")}: {parseFloat(hovered.d[k]).toFixed(1)}
                </div>
              ),
          )}
        </div>
      )}


      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "4px",
        }}
      >
        {[
          data[0],
          data[Math.floor(data.length / 2)],
          data[data.length - 1],
        ].map(
          (d, i) =>
            d && (
              <span key={i} style={{ fontSize: "10px", color: "#a0aec0" }}>
                {new Date(d.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ),
        )}
      </div>
    </div>
  );
};


const FrequencyBar = ({
  symptom,
  occurrences,
  maxOccurrences,
  avgSeverity,
}) => {
  const pct = (occurrences / maxOccurrences) * 100;
  const color =
    parseFloat(avgSeverity) >= 7
      ? "#FC8181"
      : parseFloat(avgSeverity) >= 4
        ? "#F6AD55"
        : "#68D391";

  return (
    <div style={{ marginBottom: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: "500",
            color: "#2d3748",
            textTransform: "capitalize",
          }}
        >
          {symptom}
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "#a0aec0" }}>
            {occurrences}×
          </span>
          {avgSeverity && (
            <span style={{ fontSize: "11px", color }}>
              avg {avgSeverity}/10
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          height: "6px",
          background: "#f1f5f9",
          borderRadius: "99px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: "99px",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
};


const Insights = () => {
  const navigate = useNavigate();
  const [correlations, setCorrelations] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [frequency, setFrequency] = useState([]);
  const [weeklySummaries, setWeeklySummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState("patterns");
  const [timelineDays, setTimelineDays] = useState(30);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getCorrelations(),
      getTimeline(timelineDays),
      getSymptomFrequency(timelineDays),
      getWeeklySummaries(),
    ])
      .then(([c, t, f, w]) => {
        setCorrelations(c);
        setTimeline(t);
        setFrequency(f);
        setWeeklySummaries(w);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [timelineDays]);

  const handleAnalyse = async () => {
    setAnalysing(true);
    setAnalysisResult(null);
    try {
      const result = await triggerAnalysis();
      setAnalysisResult(result);
      loadData();
    } finally {
      setAnalysing(false);
    }
  };

  const handleDismiss = async (id) => {
    await dismissCorrelation(id);
    setCorrelations((c) => c.filter((x) => x.id !== id));
  };

  const maxFrequency = Math.max(
    ...frequency.map((f) => parseInt(f.occurrences)),
    1,
  );

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px" }}>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
        }}
      >
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "none",
              border: "none",
              color: "#718096",
              cursor: "pointer",
              fontSize: "13px",
              padding: 0,
              display: "block",
              marginBottom: "6px",
            }}
          >
            ← Back
          </button>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#1a202c",
              margin: 0,
            }}
          >
            Insights
          </h1>
          <p style={{ fontSize: "13px", color: "#718096", margin: "4px 0 0" }}>
            Patterns detected from your symptom journal
          </p>
        </div>
        <button
          onClick={handleAnalyse}
          disabled={analysing}
          style={{
            padding: "8px 16px",
            background: "#1a202c",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
            cursor: analysing ? "not-allowed" : "pointer",
            opacity: analysing ? 0.7 : 1,
          }}
        >
          {analysing ? "Analysing..." : "Run analysis"}
        </button>
      </div>


      {analysisResult && (
        <div
          style={{
            background: "#F0FFF4",
            border: "1px solid #9AE6B4",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#276749",
              fontWeight: "500",
              marginBottom: "4px",
            }}
          >
            Analysis complete — {analysisResult.correlations_found || 0} pattern
            {analysisResult.correlations_found !== 1 ? "s" : ""} found
          </div>
          {analysisResult.overall_summary && (
            <p
              style={{
                fontSize: "12px",
                color: "#2d3748",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {analysisResult.overall_summary}
            </p>
          )}
          {analysisResult.message && (
            <p style={{ fontSize: "12px", color: "#718096", margin: 0 }}>
              {analysisResult.message}
            </p>
          )}
        </div>
      )}


      <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
        {[
          { key: "patterns", label: "Patterns" },
          { key: "timeline", label: "Timeline" },
          { key: "symptoms", label: "Symptoms" },
          { key: "weekly", label: "Weekly" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: "500",
              border: "none",
              borderBottom:
                activeTab === tab.key
                  ? "2px solid #1a202c"
                  : "2px solid transparent",
              background: "none",
              color: activeTab === tab.key ? "#1a202c" : "#a0aec0",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Patterns tab */}
      {activeTab === "patterns" && (
        <div>
          {loading ? (
            <div style={{ color: "#a0aec0", fontSize: "13px" }}>
              Loading patterns...
            </div>
          ) : correlations.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px",
                border: "1px dashed #e2e8f0",
                borderRadius: "12px",
              }}
            >
              <p
                style={{
                  color: "#a0aec0",
                  fontSize: "14px",
                  margin: "0 0 12px",
                }}
              >
                No patterns detected yet.
              </p>
              <p
                style={{
                  color: "#a0aec0",
                  fontSize: "12px",
                  margin: "0 0 16px",
                }}
              >
                Log at least 5 entries then click "Run analysis".
              </p>
              <button
                onClick={handleAnalyse}
                disabled={analysing}
                style={{
                  padding: "8px 16px",
                  background: "#1a202c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {analysing ? "Analysing..." : "Run analysis now"}
              </button>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {correlations.map((c) => {
                const conf = CONFIDENCE_LABEL(parseFloat(c.confidence));
                return (
                  <div
                    key={c.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px 18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontSize: "16px" }}>
                          {TYPE_ICON[c.correlation_type] || "🔍"}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            background: conf.bg,
                            color: conf.color,
                            borderRadius: "99px",
                            padding: "2px 8px",
                          }}
                        >
                          {conf.label} ·{" "}
                          {Math.round(parseFloat(c.confidence) * 100)}%
                          confidence
                        </span>
                        <span style={{ fontSize: "11px", color: "#a0aec0" }}>
                          {c.data_points} data points
                        </span>
                      </div>
                      <button
                        onClick={() => handleDismiss(c.id)}
                        style={{
                          fontSize: "11px",
                          color: "#a0aec0",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Dismiss
                      </button>
                    </div>

                    <p
                      style={{
                        fontSize: "13px",
                        color: "#1a202c",
                        lineHeight: 1.6,
                        margin: "0 0 10px",
                      }}
                    >
                      {c.description}
                    </p>

                    {c.actionable_insight && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                          background: "#F7FAFC",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#5A67D8" }}>
                          →
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#4a5568",
                            lineHeight: 1.5,
                          }}
                        >
                          {c.actionable_insight}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {activeTab === "timeline" && (
        <div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setTimelineDays(d)}
                style={{
                  fontSize: "11px",
                  fontWeight: "500",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "1px solid",
                  cursor: "pointer",
                  borderColor: timelineDays === d ? "#1a202c" : "#e2e8f0",
                  background: timelineDays === d ? "#1a202c" : "#fff",
                  color: timelineDays === d ? "#fff" : "#718096",
                }}
              >
                {d}d
              </button>
            ))}
          </div>

          {timeline.length > 0 ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Mood chart */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#2d3748",
                      margin: 0,
                    }}
                  >
                    Mood and energy
                  </h3>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {[
                      { label: "Mood", color: "#5A67D8" },
                      { label: "Energy", color: "#F6AD55" },
                    ].map((l) => (
                      <span
                        key={l.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          color: "#a0aec0",
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "2px",
                            background: l.color,
                            display: "inline-block",
                          }}
                        />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>
                <LineChart
                  data={timeline}
                  keys={["avg_mood", "avg_energy"]}
                  colors={["#5A67D8", "#F6AD55"]}
                  height={120}
                />
              </div>

              {/* Sleep chart */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "18px 20px",
                }}
              >
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#2d3748",
                    margin: "0 0 14px",
                  }}
                >
                  Sleep hours
                </h3>
                <LineChart
                  data={timeline}
                  keys={["avg_sleep"]}
                  colors={["#68D391"]}
                  height={100}
                />
              </div>


              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "18px 20px",
                }}
              >
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#2d3748",
                    margin: "0 0 14px",
                  }}
                >
                  Logging frequency
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "3px",
                    height: "60px",
                  }}
                >
                  {timeline.map((d, i) => {
                    const maxCount = Math.max(
                      ...timeline.map((t) => parseInt(t.entry_count)),
                      1,
                    );
                    const pct = (parseInt(d.entry_count) / maxCount) * 100;
                    return (
                      <div
                        key={i}
                        title={`${new Date(d.date).toLocaleDateString()}: ${d.entry_count} entries`}
                        style={{
                          flex: 1,
                          height: `${Math.max(pct, 5)}%`,
                          background: "#BEE3F8",
                          borderRadius: "2px 2px 0 0",
                          cursor: "default",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "50px",
                border: "1px dashed #e2e8f0",
                borderRadius: "12px",
                color: "#a0aec0",
                fontSize: "13px",
              }}
            >
              No timeline data yet. Start logging symptoms to see trends.
            </div>
          )}
        </div>
      )}


      {activeTab === "symptoms" && (
        <div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {[7, 14, 30, 60].map((d) => (
              <button
                key={d}
                onClick={() => setTimelineDays(d)}
                style={{
                  fontSize: "11px",
                  fontWeight: "500",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "1px solid",
                  cursor: "pointer",
                  borderColor: timelineDays === d ? "#1a202c" : "#e2e8f0",
                  background: timelineDays === d ? "#1a202c" : "#fff",
                  color: timelineDays === d ? "#fff" : "#718096",
                }}
              >
                {d}d
              </button>
            ))}
          </div>

          {frequency.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px",
                border: "1px dashed #e2e8f0",
                borderRadius: "12px",
                color: "#a0aec0",
                fontSize: "13px",
              }}
            >
              No symptoms logged in this period.
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#2d3748",
                  margin: "0 0 16px",
                }}
              >
                Most frequent symptoms — last {timelineDays} days
              </h3>
              {frequency.map((f) => (
                <FrequencyBar
                  key={f.symptom}
                  symptom={f.symptom}
                  occurrences={parseInt(f.occurrences)}
                  maxOccurrences={maxFrequency}
                  avgSeverity={f.avg_severity}
                />
              ))}
            </div>
          )}
        </div>
      )}


      {activeTab === "weekly" && (
        <div>
          {weeklySummaries.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px",
                border: "1px dashed #e2e8f0",
                borderRadius: "12px",
                color: "#a0aec0",
                fontSize: "13px",
              }}
            >
              No weekly summaries yet.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {weeklySummaries.map((week) => {
                const topSymptoms =
                  typeof week.top_symptoms === "string"
                    ? JSON.parse(week.top_symptoms)
                    : week.top_symptoms || [];
                const weekStart = new Date(week.week_start);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                return (
                  <div
                    key={week.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px 18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#2d3748",
                          margin: 0,
                        }}
                      >
                        {weekStart.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        —{" "}
                        {weekEnd.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </h3>
                      <span style={{ fontSize: "11px", color: "#a0aec0" }}>
                        {week.total_entries} entries
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "10px",
                        marginBottom: topSymptoms.length > 0 ? "12px" : 0,
                      }}
                    >
                      {week.avg_mood && (
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "18px",
                              fontWeight: "700",
                              color: "#5A67D8",
                            }}
                          >
                            {parseFloat(week.avg_mood).toFixed(1)}
                          </div>
                          <div style={{ fontSize: "10px", color: "#a0aec0" }}>
                            avg mood
                          </div>
                        </div>
                      )}
                      {week.avg_energy && (
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "18px",
                              fontWeight: "700",
                              color: "#F6AD55",
                            }}
                          >
                            {parseFloat(week.avg_energy).toFixed(1)}
                          </div>
                          <div style={{ fontSize: "10px", color: "#a0aec0" }}>
                            avg energy
                          </div>
                        </div>
                      )}
                      {week.avg_sleep && (
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "18px",
                              fontWeight: "700",
                              color: "#68D391",
                            }}
                          >
                            {parseFloat(week.avg_sleep).toFixed(1)}h
                          </div>
                          <div style={{ fontSize: "10px", color: "#a0aec0" }}>
                            avg sleep
                          </div>
                        </div>
                      )}
                    </div>

                    {topSymptoms.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "5px",
                        }}
                      >
                        {topSymptoms.map((s, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "11px",
                              color: "#4a5568",
                              background: "#F7FAFC",
                              border: "1px solid #e2e8f0",
                              borderRadius: "99px",
                              padding: "2px 9px",
                              textTransform: "capitalize",
                            }}
                          >
                            {s.name} ×{s.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Insights;
