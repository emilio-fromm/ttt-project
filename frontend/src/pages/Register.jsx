import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { entriesApi } from "../api/client";
import { useAuth } from "../AuthContext";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    entriesApi.get("/tools").then((res) => setCatalog(res.data.tools));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!search.trim()) {
        setPreview(null);
        return;
      }
      const res = await entriesApi.get("/tools/search", { params: { q: search } });
      setPreview(res.data.preview);
      if (res.data.existing.length > 0) {
        // merge any not-yet-seen matches into the visible catalog
        setCatalog((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          const extra = res.data.existing.filter((t) => !ids.has(t.id));
          return [...prev, ...extra];
        });
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  function toggle(toolId) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(toolId) ? next.delete(toolId) : next.add(toolId);
      return next;
    });
  }

  async function addCustomTool() {
    const res = await entriesApi.post("/tools", { name: preview.name, domain: preview.domain });
    const tool = res.data.tool;
    setCatalog((prev) => [...prev, tool]);
    setSelected((prev) => new Set(prev).add(tool.id));
    setPreview(null);
    setSearch("");
  }

  const filtered = catalog.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await entriesApi.post("/auth/register", {
        email,
        password,
        toolIds: Array.from(selected),
      });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1 className="hero-title" style={{ fontSize: "3.5rem" }}>
        TTT
      </h1>
      <p className="hero-subtitle" style={{ marginBottom: "20px" }}>
        Let's set up your board
      </p>

      <div className="auth-card" style={{ maxWidth: "640px" }}>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">Email</label>
            <input
              className="marker-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              className="marker-input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Which tools do you want on your board?</label>
            <p style={{ marginTop: 0, marginBottom: "8px", color: "var(--ink-soft)", fontSize: "0.9rem" }}>
              Search the list below, or to add one that's missing type its{" "}
              <strong>full website address</strong> (e.g. <code>linear.app</code>) — a name on its own won't find
              the right icon.
            </p>
            <input
              className="marker-input"
              placeholder="Search by name, or paste a website address like linear.app..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="tool-picker-grid">
              {filtered.map((tool) => (
                <div
                  key={tool.id}
                  className={`tool-picker-item ${selected.has(tool.id) ? "selected" : ""}`}
                  onClick={() => toggle(tool.id)}
                >
                  <img src={tool.icon_url} alt="" onError={(e) => (e.target.style.visibility = "hidden")} />
                  {tool.name}
                </div>
              ))}
            </div>

            {preview && (
              <div
                className="tool-picker-item"
                style={{ display: "inline-flex", marginTop: "6px" }}
                onClick={addCustomTool}
              >
                <img src={preview.icon_url} alt="" onError={(e) => (e.target.style.visibility = "hidden")} />
                + Add "{preview.name}"
              </div>
            )}
          </div>

          {error && (
            <div className="field-group">
              <span className="error-note">{error}</span>
            </div>
          )}

          <button className="marker-btn primary" type="submit" disabled={submitting}>
            {submitting ? "Creating your board..." : "Create account"}
          </button>
        </form>
        <p style={{ marginTop: "18px" }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
