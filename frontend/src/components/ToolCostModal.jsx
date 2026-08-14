import { useState } from "react";

// Opened from the gear icon on a tool in Settings. Lets you set what a subscription costs
// and whether it's billed monthly or yearly, with explicit Save/Cancel so nothing is
// written until you mean it to be.
export default function ToolCostModal({ tool, onSave, onCancel }) {
  const [amount, setAmount] = useState(tool.cost ?? "");
  const [period, setPeriod] = useState(tool.billing_period === "yearly" ? "yearly" : "monthly");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(amount, period);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <img
            src={tool.icon_url}
            alt=""
            width={36}
            height={36}
            style={{ borderRadius: 8 }}
            onError={(e) => (e.target.style.visibility = "hidden")}
          />
          <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>
            {tool.name} subscription
          </h3>
        </div>

        <div className="field-group">
          <label className="field-label">Cost</label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>€</span>
            <input
              className="marker-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Billing period</label>
          <div className="billing-toggle">
            <button
              type="button"
              className={`billing-toggle-option ${period === "monthly" ? "active" : ""}`}
              onClick={() => setPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`billing-toggle-option ${period === "yearly" ? "active" : ""}`}
              onClick={() => setPeriod("yearly")}
            >
              Yearly
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button type="button" className="marker-btn small primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" className="marker-btn small ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
