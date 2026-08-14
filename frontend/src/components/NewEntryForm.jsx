import { useState } from "react";
import { entriesApi } from "../api/client";

export default function NewEntryForm({ toolId, date, onCreated, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await entriesApi.post("/entries", {
        toolId: toolId || null,
        title,
        description,
        date: date || null,
      });
      const entry = res.data.entry;

      if (file) {
        const formData = new FormData();
        formData.append("image", file);
        // Don't set Content-Type manually here -- the browser needs to generate it itself
        // for a FormData body so it includes the multipart boundary. A hardcoded
        // "multipart/form-data" header has no boundary, so the server can't parse the
        // body at all and the request just hangs until it times out.
        const imgRes = await entriesApi.post(`/entries/${entry.id}/images`, formData);
        entry.images = [imgRes.data.image];
      }

      onCreated(entry);
    } catch (err) {
      setError(err.response?.data?.error || "Could not create the note, try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="post-it" style={{ background: "white", border: "3px dashed #2b2b2e" }} onSubmit={handleSubmit}>
      <p className="post-it-title">New post-it</p>
      <input
        className="marker-input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        className="marker-textarea"
        placeholder="Notes..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
      {error && <span className="error-note">{error}</span>}
      <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
        <button type="submit" className="marker-btn small primary" disabled={submitting}>
          {submitting ? "Sticking..." : "Stick it"}
        </button>
        <button type="button" className="marker-btn small ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
