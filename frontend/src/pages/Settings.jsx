import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { entriesApi } from "../api/client";
import ToolCostModal from "../components/ToolCostModal";

export default function Settings() {
  const [myTools, setMyTools] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTool, setEditingTool] = useState(null);

  async function loadAll() {
    const [mine, all] = await Promise.all([
      entriesApi.get("/tools/mine").then((r) => r.data.tools),
      entriesApi.get("/tools").then((r) => r.data.tools),
    ]);
    setMyTools(mine);
    setCatalog(all);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!search.trim()) return setPreview(null);
      const res = await entriesApi.get("/tools/search", { params: { q: search } });
      setPreview(res.data.preview);
      if (res.data.existing.length > 0) {
        setCatalog((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          const extra = res.data.existing.filter((t) => !ids.has(t.id));
          return [...prev, ...extra];
        });
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const myToolIds = new Set(myTools.map((t) => t.id));

  async function addTool(toolId) {
    await entriesApi.post("/tools/mine", { toolId });
    loadAll();
  }

  async function removeTool(toolId) {
    await entriesApi.delete(`/tools/mine/${toolId}`);
    setMyTools((prev) => prev.filter((t) => t.id !== toolId));
  }

  async function saveCost(toolId, rawAmount, billingPeriod) {
    const trimmed = String(rawAmount).trim();
    if (trimmed !== "" && (Number.isNaN(Number(trimmed)) || Number(trimmed) < 0)) return; // ignore garbage input
    const res = await entriesApi.patch(`/tools/mine/${toolId}`, {
      cost: trimmed === "" ? null : trimmed,
      billingPeriod,
    });
    setMyTools((prev) =>
      prev.map((t) => (t.id === toolId ? { ...t, cost: res.data.cost, billing_period: res.data.billing_period } : t))
    );
  }

  async function addCustomTool() {
    const res = await entriesApi.post("/tools", { name: preview.name, domain: preview.domain });
    const tool = res.data.tool;
    await addTool(tool.id);
    setPreview(null);
    setSearch("");
  }

  const filtered = catalog.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <h2 className="section-heading">Settings</h2>

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>Your tools</h3>
      <p style={{ marginTop: 0, marginBottom: "10px", color: "var(--ink-soft)" }}>
        Click the ⚙ to set what a tool's subscription costs you (monthly or yearly) — it shows up in that
        tool's "i" info popover on the board. Click the name to remove a tool from your board.
      </p>
      <div className="tool-picker-grid" style={{ marginBottom: "28px" }}>
        {myTools.map((tool) => (
          <div key={tool.id} className="tool-picker-item selected" style={{ cursor: "default" }}>
            <img src={tool.icon_url} alt="" onError={(e) => (e.target.style.visibility = "hidden")} />
            <span style={{ cursor: "pointer" }} onClick={() => removeTool(tool.id)}>
              {tool.name} ✕
            </span>
            <button type="button" className="tool-settings-btn" onClick={() => setEditingTool(tool)}>
              ⚙{" "}
              {tool.cost != null
                ? `€${Number(tool.cost).toFixed(2)}/${tool.billing_period === "yearly" ? "yr" : "mo"}`
                : "Add cost"}
            </button>
          </div>
        ))}
      </div>

      {editingTool && (
        <ToolCostModal
          tool={editingTool}
          onCancel={() => setEditingTool(null)}
          onSave={async (amount, period) => {
            await saveCost(editingTool.id, amount, period);
            setEditingTool(null);
          }}
        />
      )}

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>Add more tools</h3>
      <p style={{ marginTop: 0, marginBottom: "10px", color: "var(--ink-soft)" }}>
        Search the catalog by name below. To add a tool that isn't listed yet, type its{" "}
        <strong>full website address</strong> (e.g. <code>notion.so</code> or <code>https://linear.app</code>) —
        a name on its own (e.g. "Notion") won't find the right icon.
      </p>
      <input
        className="marker-input"
        placeholder="Search by name, or paste a website address like notion.so..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: "400px", marginBottom: "12px" }}
      />
      <div className="tool-picker-grid">
        {filtered
          .filter((t) => !myToolIds.has(t.id))
          .map((tool) => (
            <div key={tool.id} className="tool-picker-item" onClick={() => addTool(tool.id)}>
              <img src={tool.icon_url} alt="" onError={(e) => (e.target.style.visibility = "hidden")} />
              {tool.name}
            </div>
          ))}
      </div>
      {preview && (
        <div className="tool-picker-item" style={{ display: "inline-flex", marginTop: "10px" }} onClick={addCustomTool}>
          <img src={preview.icon_url} alt="" onError={(e) => (e.target.style.visibility = "hidden")} />
          + Add "{preview.name}"
        </div>
      )}

      <p style={{ marginTop: "32px" }}>
        Manage your GitHub connection on the <Link to="/github">GitHub</Link> page.
      </p>
    </div>
  );
}
