import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEntry, deleteEntry } from "../api/client.js";

const SeverityBar = ({ value }) => {
  if (!value) return null;
  const color = value <= 3 ? "#68D391" : value <= 6 ? "#F6AD55" : "#FC8181";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          flex: 1,
          height: "6px",
          background: "#f1f5f9",
          borderRadius: "99px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(value / 10) * 100}%`,
            background: color,
            borderRadius: "99px",
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <span
        style={{ fontSize: "12px", fontWeight: "600", color, flexShrink: 0 }}
      >
        {value}/10
      </span>
    </div>
  );
};

const MetricCard = ({ label, value, unit = "" }) => (
  <div
    style={{
      background: "#F7FAFC",
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
      padding: "14px 16px",
    }}
  >
    <div
      style={{
        fontSize: "11px",
        color: "#a0aec0",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: "6px",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: "22px",
        fontWeight: "700",
        color: "#1a202c",
        lineHeight: 1,
      }}
    >
      {value ?? "—"}
      {unit && value ? (
        <span style={{ fontSize: "13px", fontWeight: "400", color: "#718096" }}>
          {unit}
        </span>
      ) : (
        ""
      )}
    </div>
  </div>
);

const EntryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getEntry(id)
      .then(setEntry)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this entry permanently?")) return;
    setDeleting(true);
    await deleteEntry(id);
    navigate("/dashboard");
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading)
    return <div style={{ padding: "40px", color: "#a0aec0" }}>Loading...</div>;
  if (!entry)
    return (
      <div style={{ padding: "40px", color: "#a0aec0" }}>Entry not found.</div>
    );

  const symptoms =
    typeof entry.symptoms === "string"
      ? JSON.parse(entry.symptoms)
      : entry.symptoms || [];
  const tags =
    typeof entry.tags === "string" ? JSON.parse(entry.tags) : entry.tags || [];

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            background: "none",
            border: "none",
            color: "#718096",
            cursor: "pointer",
            fontSize: "13px",
            padding: 0,
          }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => navigate(`/log?edit=${id}`)}
            style={{
              fontSize: "12px",
              color: "#718096",
              background: "none",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "5px 12px",
              cursor: "pointer",
            }}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              fontSize: "12px",
              color: "#9B2335",
              background: "none",
              border: "1px solid #FEB2B2",
              borderRadius: "6px",
              padding: "5px 12px",
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>


      <p style={{ fontSize: "13px", color: "#718096", margin: "0 0 20px" }}>
        {formatDate(entry.logged_at)}
      </p>


      <div
        style={{
          background: "#F7FAFC",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "18px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#718096",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: "8px",
          }}
        >
          What you wrote
        </div>
        <p
          style={{
            fontSize: "14px",
            color: "#1a202c",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {entry.raw_input}
        </p>
      </div>


      {symptoms.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#2d3748",
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Symptoms detected by AI
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {symptoms.map((symptom, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: symptom.severity ? "10px" : 0,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#1a202c",
                        textTransform: "capitalize",
                      }}
                    >
                      {symptom.name}
                    </span>
                    {symptom.location && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#718096",
                          marginLeft: "8px",
                        }}
                      >
                        {symptom.location}
                      </span>
                    )}
                  </div>
                  {symptom.duration && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#a0aec0",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    >
                      {symptom.duration}
                    </span>
                  )}
                </div>
                {symptom.severity && <SeverityBar value={symptom.severity} />}
                {symptom.notes && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#718096",
                      margin: "8px 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {symptom.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {(entry.mood || entry.energy_level || entry.sleep_hours) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <MetricCard label="Mood" value={entry.mood} unit="/10" />
          <MetricCard label="Energy" value={entry.energy_level} unit="/10" />
          <MetricCard label="Sleep" value={entry.sleep_hours} unit="h" />
        </div>
      )}


      {entry.notes && (
        <div
          style={{
            background: "#F7FAFC",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#718096",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "6px",
            }}
          >
            Summary
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "#4a5568",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {entry.notes}
          </p>
        </div>
      )}


      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "11px",
                color: "#5A67D8",
                background: "#EBF4FF",
                border: "1px solid #C3DAFE",
                borderRadius: "99px",
                padding: "3px 10px",
                cursor: "pointer",
              }}
              onClick={() => navigate(`/dashboard?tag=${tag}`)}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default EntryDetail;
