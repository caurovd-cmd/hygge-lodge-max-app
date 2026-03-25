import { useEffect } from "react";

// ── TOAST ─────────────────────────────────────────────────────────────────────
export function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="toast">{msg}</div>;
}

// ── STARS ─────────────────────────────────────────────────────────────────────
export function Stars({ n = 5 }) {
  return (
    <div className="stars">
      {"★".repeat(Math.min(5, n))}{"☆".repeat(Math.max(0, 5 - n))}
    </div>
  );
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = "" }) {
  return <span className={`badge${variant ? " badge-" + variant : ""}`}>{children}</span>;
}

// ── PILLS FILTER ─────────────────────────────────────────────────────────────
export function Pills({ items, active, onChange }) {
  return (
    <div className="pills">
      {items.map(item => (
        <button
          key={item}
          className={`pill${active === item ? " active" : ""}`}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// ── MODAL SHEET ───────────────────────────────────────────────────────────────
export function Sheet({ children, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">{children}</div>
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function Empty({ icon = "🔍", title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--t2)" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t)", marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  );
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
export function Confirm({ text, onYes, onNo }) {
  return (
    <div className="overlay" onClick={onNo}>
      <div className="sheet" style={{ padding: "24px 16px 32px" }}>
        <div className="sheet-handle" />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, textAlign: "center" }}>{text}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onYes}>Удалить</button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onNo}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
