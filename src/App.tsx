import { useState, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Amount {
  id: number;
  value: number;
}

// ─── Algorithm ──────────────────────────────────────────────────────────────

function findCombinations(amounts: Amount[], target: number, maxSize: number): Amount[][] {
  const results: Amount[][] = [];
  const n = amounts.length;
  const EPSILON = 0.0001;

  function recurse(start: number, current: Amount[], currentSum: number): void {
    if (maxSize > 0 && current.length === maxSize) {
      if (Math.abs(currentSum - target) < EPSILON) {
        results.push([...current]);
      }
      return;
    }
    if (maxSize === 0 && Math.abs(currentSum - target) < EPSILON) {
      results.push([...current]);
    }
    for (let i = start; i < n; i++) {
      current.push(amounts[i]);
      recurse(i + 1, current, currentSum + amounts[i].value);
      current.pop();
      if (results.length >= 500) return;
    }
  }

  recurse(0, [], 0);
  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  let s = raw.trim();
  s = s.replace(/[\u00a0\u202f\s]/g, "");
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(",", ".");
  }
  return parseFloat(s);
}

function parsePaste(text: string): number[] {
  return text
    .split(/[\n\r\t]+/)
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((s) => parseAmount(s))
    .filter((v) => !isNaN(v));
}

function fmt(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

// ─── Components ──────────────────────────────────────────────────────────────

interface TagProps {
  amount: Amount;
  onRemove?: (id: number) => void;
  highlight: boolean;
}

const Tag = ({ amount, onRemove, highlight }: TagProps) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      borderRadius: "4px",
      fontSize: "13px",
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: 500,
      background: highlight
        ? amount.value < 0 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)"
        : amount.value < 0 ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
      color: amount.value < 0 ? "#ef4444" : "#16a34a",
      border: `1px solid ${
        highlight
          ? amount.value < 0 ? "#ef4444" : "#16a34a"
          : amount.value < 0 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"
      }`,
      transition: "all 0.15s",
    }}
  >
    {fmt(amount.value)} €
    {onRemove && (
      <button
        onClick={() => onRemove(amount.id)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "inherit", opacity: 0.6, padding: "0", lineHeight: 1, fontSize: "14px",
        }}
      >
        ×
      </button>
    )}
  </span>
);

export default function App() {
  const [amounts, setAmounts] = useState<Amount[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [maxLines, setMaxLines] = useState("");
  const [results, setResults] = useState<Amount[][] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [highlightedCombo, setHighlightedCombo] = useState<number | null>(null);
  const idRef = useRef(0);

  const addAmount = useCallback((val: string | number): boolean => {
    const v = parseAmount(String(val));
    if (isNaN(v)) return false;
    setAmounts((prev) => [...prev, { id: idRef.current++, value: Math.round(v * 100) / 100 }]);
    return true;
  }, []);

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (addAmount(inputVal)) setInputVal("");
      else if (inputVal.trim() !== "") setError("Montant invalide");
    }
  };

  const handleAddBtn = () => {
    if (addAmount(inputVal)) { setInputVal(""); setError(""); }
    else setError("Montant invalide");
  };

  const handlePasteImport = () => {
    const parsed = parsePaste(pasteText);
    if (parsed.length === 0) { setError("Aucun montant reconnu dans le texte collé."); return; }
    parsed.forEach((v) => addAmount(v));
    setPasteText(""); setPasteMode(false); setError("");
  };

  const removeAmount = (id: number) => setAmounts((prev) => prev.filter((a) => a.id !== id));

  const clearAll = () => { setAmounts([]); setResults(null); setHighlightedCombo(null); setError(""); };

  const handleSearch = () => {
    setError("");
    const target = parseAmount(targetInput);
    if (isNaN(target)) { setError("Montant cible invalide."); return; }
    if (amounts.length === 0) { setError("Ajoutez au moins un montant."); return; }
    const max = maxLines.trim() === "" ? 0 : parseInt(maxLines);
    setRunning(true); setResults(null); setHighlightedCombo(null);
    setTimeout(() => {
      const res = findCombinations(amounts, target, isNaN(max) ? 0 : max);
      res.sort((a, b) => a.length - b.length);
      setResults(res); setRunning(false);
    }, 30);
  };

  const positives = amounts.filter((a) => a.value > 0);
  const negatives = amounts.filter((a) => a.value < 0);
  const target = parseAmount(targetInput);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", padding: "0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #4a5568; }
        textarea::placeholder { color: #4a5568; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1a1f2e; }
        ::-webkit-scrollbar-thumb { background: #2d3748; border-radius: 3px; }
        .combo-row { transition: background 0.15s; cursor: pointer; }
        .combo-row:hover { background: rgba(99,102,241,0.06) !important; }
        .combo-row.active { background: rgba(99,102,241,0.12) !important; border-color: rgba(99,102,241,0.4) !important; }
        .add-btn:hover { background: #2563eb !important; }
        .search-btn:hover { background: #4f46e5 !important; }
        .paste-btn:hover { opacity: 0.85; }
        input:focus, textarea:focus { outline: none; border-color: #6366f1 !important; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e2433", padding: "20px 40px", display: "flex", alignItems: "center", gap: "16px", background: "#0d1018" }}>
        <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>⊕</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: "16px", letterSpacing: "-0.3px" }}>ReconcilMatch</div>
          <div style={{ fontSize: "12px", color: "#4a5568", marginTop: "1px" }}>Rapprochement de montants · Factures & Avoirs</div>
        </div>
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>

        {/* LEFT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Target */}
          <div style={{ background: "#13161f", border: "1px solid #1e2433", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#6366f1", fontWeight: 600, marginBottom: "12px", textTransform: "uppercase" }}>Montant Cible</div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="ex: 1 234,56"
                style={{ flex: 1, background: "#0f1117", border: "1px solid #2d3748", borderRadius: "8px", padding: "10px 14px", color: "#e2e8f0", fontSize: "20px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}
              />
              <span style={{ color: "#4a5568", fontSize: "16px" }}>€</span>
            </div>
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "11px", color: "#4a5568", marginBottom: "6px" }}>Nombre de lignes max (optionnel)</div>
              <input
                value={maxLines}
                onChange={(e) => setMaxLines(e.target.value)}
                placeholder="illimité"
                style={{ width: "100%", background: "#0f1117", border: "1px solid #2d3748", borderRadius: "8px", padding: "8px 12px", color: "#e2e8f0", fontSize: "14px", fontFamily: "'IBM Plex Mono', monospace" }}
              />
            </div>
          </div>

          {/* Amounts input */}
          <div style={{ background: "#13161f", border: "1px solid #1e2433", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#6366f1", fontWeight: 600, textTransform: "uppercase" }}>Montants ({amounts.length})</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { setPasteMode(!pasteMode); setError(""); }} className="paste-btn"
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", color: "#818cf8", fontSize: "11px", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  {pasteMode ? "✕ Annuler" : "⧉ Coller depuis Excel"}
                </button>
                {amounts.length > 0 && (
                  <button onClick={clearAll}
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", color: "#ef4444", fontSize: "11px", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    Tout effacer
                  </button>
                )}
              </div>
            </div>

            {pasteMode ? (
              <div>
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>Copiez une colonne depuis Excel et collez-la ici (une valeur par ligne)</div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"1234.56\n-89.00\n456.78\n..."}
                  rows={6}
                  style={{ width: "100%", background: "#0f1117", border: "1px solid #2d3748", borderRadius: "8px", padding: "10px 12px", color: "#e2e8f0", fontSize: "13px", fontFamily: "'IBM Plex Mono', monospace", resize: "vertical" }}
                />
                <button onClick={handlePasteImport}
                  style={{ marginTop: "10px", background: "#6366f1", border: "none", borderRadius: "8px", color: "white", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: "13px", padding: "8px 16px", cursor: "pointer", width: "100%" }}>
                  Importer les montants
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                  <input
                    value={inputVal}
                    onChange={(e) => { setInputVal(e.target.value); setError(""); }}
                    onKeyDown={handleInputKey}
                    placeholder="Montant (négatif pour un avoir)"
                    style={{ flex: 1, background: "#0f1117", border: "1px solid #2d3748", borderRadius: "8px", padding: "9px 13px", color: "#e2e8f0", fontSize: "14px", fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                  <button onClick={handleAddBtn} className="add-btn"
                    style={{ background: "#4f46e5", border: "none", borderRadius: "8px", color: "white", fontWeight: 600, fontSize: "18px", width: "40px", cursor: "pointer", transition: "background 0.15s" }}>
                    +
                  </button>
                </div>

                {amounts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px", color: "#2d3748", fontSize: "13px", border: "1px dashed #1e2433", borderRadius: "8px" }}>
                    Aucun montant saisi
                  </div>
                ) : (
                  <div>
                    {positives.length > 0 && (
                      <div style={{ marginBottom: "10px" }}>
                        <div style={{ fontSize: "11px", color: "#16a34a", marginBottom: "6px", opacity: 0.7 }}>FACTURES (+)</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {positives.map((a) => <Tag key={a.id} amount={a} onRemove={removeAmount} highlight={false} />)}
                        </div>
                      </div>
                    )}
                    {negatives.length > 0 && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#ef4444", marginBottom: "6px", opacity: 0.7 }}>AVOIRS (−)</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {negatives.map((a) => <Tag key={a.id} amount={a} onRemove={removeAmount} highlight={false} />)}
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #1e2433", fontSize: "12px", color: "#4a5568", display: "flex", justifyContent: "space-between" }}>
                      <span>Total saisi</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#94a3b8" }}>
                        {fmt(amounts.reduce((s, a) => s + a.value, 0))} €
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "10px 14px", color: "#ef4444", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <button onClick={handleSearch} disabled={running} className="search-btn"
            style={{ background: running ? "#2d3748" : "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: "10px", color: running ? "#64748b" : "white", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "15px", padding: "14px", cursor: running ? "not-allowed" : "pointer", transition: "all 0.2s", letterSpacing: "-0.2px" }}>
            {running ? "⟳ Recherche en cours…" : "Rechercher les combinaisons"}
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ background: "#13161f", border: "1px solid #1e2433", borderRadius: "12px", padding: "20px", minHeight: "400px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#6366f1", fontWeight: 600, textTransform: "uppercase", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Résultats</span>
            {results !== null && (
              <span style={{
                background: results.length === 0 ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                color: results.length === 0 ? "#ef4444" : "#16a34a",
                border: `1px solid ${results.length === 0 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                borderRadius: "20px", padding: "2px 10px", fontSize: "11px", fontWeight: 600,
              }}>
                {results.length === 0 ? "Aucune" : `${results.length} combinaison${results.length > 1 ? "s" : ""}`}
                {results.length >= 500 ? " (max)" : ""}
              </span>
            )}
          </div>

          {results === null && !running && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", color: "#2d3748", gap: "12px" }}>
              <div style={{ fontSize: "36px", opacity: 0.3 }}>⊕</div>
              <div style={{ fontSize: "13px" }}>Saisissez vos montants et lancez la recherche</div>
            </div>
          )}

          {running && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#6366f1", fontSize: "13px", gap: "10px" }}>
              <div style={{ width: "18px", height: "18px", border: "2px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Calcul en cours…
            </div>
          )}

          {results !== null && !running && results.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#ef4444", opacity: 0.7, fontSize: "13px" }}>
              Aucune combinaison ne correspond à <strong>{fmt(target)} €</strong>
            </div>
          )}

          {results !== null && !running && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "520px", overflowY: "auto", paddingRight: "4px" }}>
              {results.map((combo, idx) => {
                const isActive = highlightedCombo === idx;
                return (
                  <div key={idx} onClick={() => setHighlightedCombo(isActive ? null : idx)}
                    className={`combo-row${isActive ? " active" : ""}`}
                    style={{ background: isActive ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.02)", border: `1px solid ${isActive ? "rgba(99,102,241,0.4)" : "#1e2433"}`, borderRadius: "8px", padding: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", color: "#4a5568", fontFamily: "'IBM Plex Mono', monospace" }}>
                        #{idx + 1} · {combo.length} ligne{combo.length > 1 ? "s" : ""}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px", fontWeight: 600, color: "#6366f1" }}>
                        = {fmt(target)} €
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {combo.map((a, j) => <Tag key={j} amount={a} highlight={isActive} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
