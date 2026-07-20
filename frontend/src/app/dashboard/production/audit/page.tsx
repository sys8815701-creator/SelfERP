"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useRole, canWrite } from "@/hooks/useRole";

function fmt(v: any, dec = 3) {
  return parseFloat(String(v ?? 0)).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: dec });
}

export default function StockAuditPage() {
  const role = useRole();
  const [items, setItems]       = useState<any[]>([]);
  const [counted, setCounted]   = useState<Record<number, string>>({});
  const [notes, setNotes]       = useState<Record<number, string>>({});
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [result, setResult]     = useState<any[] | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const headers = () => ({ "X-Business-Id": bizId() });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get("/api/production/stock-audit", { headers: headers() }).catch(() => ({ data: [] }));
    setItems(r.data);
    const init: Record<number, string> = {};
    r.data.forEach((i: any) => { init[i.id] = String(i.book_qty); });
    setCounted(init);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApply = async () => {
    const adjustments = items.map(i => ({
      item_id:     i.id,
      counted_qty: parseFloat(counted[i.id] ?? String(i.book_qty)),
      note:        notes[i.id] || "재고 실사 조정",
    }));
    setSaving(true);
    try {
      const r = await api.post("/api/production/stock-audit", { adjustments, audit_date: auditDate }, { headers: headers() });
      setResult(r.data.applied);
      await load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const diffs = items.map(i => {
    const c = parseFloat(counted[i.id] ?? String(i.book_qty));
    return c - i.book_qty;
  });
  const hasDiff = diffs.some(d => Math.abs(d) >= 0.001);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>재고 실사</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {canWrite(role)
              ? `실사 수량을 입력하면 장부와 자동 비교 후 조정됩니다. · ${items.length}개 품목`
              : `장부 수량 열람 전용 · ${items.length}개 품목`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {canWrite(role) && (
            <>
              <input type="date" value={auditDate} onChange={e => setAuditDate(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }} />
              <button onClick={handleApply} disabled={saving || !hasDiff || loading}
                style={{ backgroundColor: hasDiff ? "var(--accent-light)" : "var(--bg-surface-2)", color: hasDiff ? "var(--accent)" : "var(--text-muted)", border: hasDiff ? "1.5px solid #C49A30" : "1px solid var(--border)", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: saving || !hasDiff ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "적용 중..." : "조정 적용"}
              </button>
            </>
          )}
        </div>
      </div>

      {result && (
        <div style={{ backgroundColor: "rgba(21,128,61,0.12)", border: "1px solid rgba(21,128,61,0.40)", borderRadius: "12px", padding: "14px 18px", marginBottom: "18px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#15803D", marginBottom: "8px" }}>
            실사 완료 — {result.filter(r => r.action === "adjusted").length}개 품목 조정됨
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {result.filter(r => r.action === "adjusted").map((r: any) => (
              <span key={r.item_id} style={{ fontSize: "12px", padding: "3px 10px", backgroundColor: "rgba(21,128,61,0.12)", borderRadius: "20px", color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" }}>
                {r.item_name}: {r.diff > 0 ? "+" : ""}{fmt(r.diff)}
              </span>
            ))}
          </div>
          <button onClick={() => setResult(null)} style={{ fontSize: "11px", color: "#15803D", background: "none", border: "none", cursor: "pointer", marginTop: "8px" }}>닫기</button>
        </div>
      )}

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {(canWrite(role) ? ["품목명", "유형", "단위", "장부 수량", "실사 수량", "차이", "메모"] : ["품목명", "유형", "단위", "장부 수량"]).map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canWrite(role) ? 7 : 4} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={canWrite(role) ? 7 : 4} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>등록된 품목이 없습니다</td></tr>
            ) : items.map((item, i) => {
              const c = parseFloat(counted[item.id] ?? String(item.book_qty));
              const diff = c - item.book_qty;
              const hasDiffRow = Math.abs(diff) >= 0.001;
              return (
                <tr key={item.id}
                  style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    backgroundColor: hasDiffRow ? (diff > 0 ? "rgba(21,128,61,0.06)" : "rgba(220,38,38,0.06)") : "transparent" }}>
                  <td style={{ padding: "10px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{item.item_name}</td>
                  <td style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{item.item_type}</td>
                  <td style={{ padding: "10px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{item.unit}</td>
                  <td style={{ padding: "10px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{fmt(item.book_qty)}</td>
                  {canWrite(role) && (
                    <>
                      <td style={{ padding: "6px 14px" }}>
                        <input
                          type="number"
                          step="0.001"
                          value={counted[item.id] ?? String(item.book_qty)}
                          onChange={e => setCounted(p => ({ ...p, [item.id]: e.target.value }))}
                          style={{ width: "100px", padding: "6px 8px", border: `1px solid ${hasDiffRow ? (diff > 0 ? "#86EFAC" : "#FCA5A5") : "var(--border)"}`, borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", fontWeight: hasDiffRow ? 700 : 400 }}
                        />
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "13px", fontWeight: 700, color: diff > 0 ? "#15803D" : diff < 0 ? "#DC2626" : "var(--text-muted)" }}>
                        {hasDiffRow ? `${diff > 0 ? "+" : ""}${fmt(diff)}` : "—"}
                      </td>
                      <td style={{ padding: "6px 14px" }}>
                        {hasDiffRow && (
                          <input
                            value={notes[item.id] || ""}
                            onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))}
                            placeholder="조정 사유..."
                            style={{ width: "140px", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px" }}
                          />
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canWrite(role) && hasDiff && !loading && (
        <div style={{ marginTop: "12px", padding: "12px 16px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {diffs.filter(d => Math.abs(d) >= 0.001).length}개 품목에 차이가 있습니다. 조정 적용 시 해당 수량이 자동 입출고 처리됩니다.
          </p>
          <button onClick={handleApply} disabled={saving}
            style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            {saving ? "적용 중..." : "조정 적용"}
          </button>
        </div>
      )}
    </div>
  );
}
