import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { entriesApi } from "../api/client";
import { useAuth } from "../AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await entriesApi.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page" style={{ textAlign: "center" }}>
      <h1 className="hero-title">TTT</h1>
      <p className="hero-subtitle">Tool Task Tracker</p>

      <div className="auth-card" style={{ textAlign: "left" }}>
        <h2 className="section-heading" style={{ fontSize: "1.8rem" }}>
          Welcome back
        </h2>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="field-group">
              <span className="error-note">{error}</span>
            </div>
          )}
          <button className="marker-btn primary" type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p style={{ marginTop: "18px" }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
