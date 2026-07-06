import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { logout, getEntries } from "../api/client.js";

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEntries({ limit: 10 })
      .then((res) => setEntries(res.entries))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate("/login");
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px" }}>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "36px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user?.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.name}
              style={{ width: "36px", height: "36px", borderRadius: "50%" }}
            />
          )}
          <div>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1a202c",
                margin: 0,
              }}
            >
              Health Journal
            </h1>
            <p style={{ fontSize: "12px", color: "#718096", margin: 0 }}>
              {user?.name}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            fontSize: "13px",
            color: "#718096",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <div
        onClick={() => navigate("/log")}
        style={{
          background: "#1a202c",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "28px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "500",
              color: "#fff",
              marginBottom: "4px",
            }}
          >
            How are you feeling?
          </div>
          <div style={{ fontSize: "12px", color: "#a0aec0" }}>
            Log today's symptoms in plain English
          </div>
        </div>
        <span style={{ fontSize: "22px", color: "#a0aec0" }}>+</span>
      </div>


      <h2
        style={{
          fontSize: "14px",
          fontWeight: "600",
          color: "#2d3748",
          margin: "0 0 14px",
        }}
      >
        Recent entries
      </h2>

      {loading ? (
        <div style={{ color: "#a0aec0", fontSize: "13px" }}>Loading...</div>
      ) : entries.length === 0 ? (
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
          No entries yet. Log your first symptom above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => navigate(`/entry/${entry.id}`)}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "14px 16px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "#a0aec0")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "#e2e8f0")
              }
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#2d3748",
                    margin: 0,
                    lineHeight: 1.5,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingRight: "12px",
                  }}
                >
                  {entry.raw_input}
                </p>
                <span
                  style={{ fontSize: "11px", color: "#a0aec0", flexShrink: 0 }}
                >
                  {formatDate(entry.logged_at)}
                </span>
              </div>
              {(entry.mood || entry.energy_level) && (
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  {entry.mood && (
                    <span style={{ fontSize: "11px", color: "#718096" }}>
                      Mood {entry.mood}/10
                    </span>
                  )}
                  {entry.energy_level && (
                    <span style={{ fontSize: "11px", color: "#718096" }}>
                      Energy {entry.energy_level}/10
                    </span>
                  )}
                  {entry.sleep_hours && (
                    <span style={{ fontSize: "11px", color: "#718096" }}>
                      Sleep {entry.sleep_hours}h
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
