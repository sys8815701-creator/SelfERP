"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

export default function ProductionResultsPage() {
  const [results, setResults]   = useState<any[]>([]);
  const [orders, setOrders]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ order_id: "", completed_qty: "", defect_qty: "0", completed_date: new Date().toISOString().split("T")[0], worker_note: "" });
  const [saving, setSaving]       = useState(false);

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const headers = () => ({ "X-Business-Id": bizId() });

  const load = useCallback(async () => {
    setLoading(true);
    const [r, o] = await Promise.all([
      api.get("/api/production/results", { headers: headers() }).catch(() => ({ data: [] })),
      api.get("/api/production/orders",  { params: { status: "생산중" }, headers: headers() }).catch(() => ({ data: [] })),
    ]);
    setResults(r.data);
    setOrders(o.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.order_id || !form.completed_qty || !form.completed_date) return;
    setSaving(true);
    try {
      await api.post("/api/production/results", {
        order_id:      Number(form.order_id),
        completed_qty: parseFloat(form.completed_qty),
        defect_qty:    parseFloat(form.defect_qty) || 0,
        completed_date: form.completed_date,
        worker_note:   form.worker_note,
      }, { headers: headers() });
      setShowModal(false);
      setForm({ order_id: "", completed_qty: "", defect_qty: "0", completed_date: new Date().toISOString().split("T")[0], worker_note: "" });
      await load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const totalCompleted = results.reduce((s, r) => s + (r.completed_qty || 0), 0);
  const totalDefect    = results.reduce((s, r) => s + (r.defect_qty || 0), 0);
  const defectRate     = totalCompleted > 0 ? (totalDefect / totalCompleted * 100).toFixed(1) : "0.0";

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>생산 실적</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>생산 완료 실적을 등록하고 조회합니다. · {results.length}건</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + 실적 등록
        </button>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "총 완료 수량", value: fmt(totalCompleted) },
          { label: "총 불량 수량", value: fmt(totalDefect), warn: totalDefect > 0 },
          { label: "불량률",       value: `${defectRate}%`, warn: parseFloat(defectRate) > 5 },
        ].map(c => (
          <div key={c.label} style={{ backgroundColor: "var(--bg-surface)", border: `1px solid ${c.warn ? "#FCA5A5" : "var(--border)"}`, borderRadius: "14px", padding: "18px 22px" }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>{c.label}</p>
            <p style={{ fontSize: "26px", fontWeight: 900, color: c.warn ? "#DC2626" : "var(--text-primary)" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* 목록 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["지시서", "제품명", "완료 수량", "불량 수량", "불량률", "완료일", "작업 메모"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            ) : results.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>등록된 실적이 없습니다.</td></tr>
            ) : results.map((r, i) => {
              const rate = r.completed_qty > 0 ? (r.defect_qty / r.completed_qty * 100).toFixed(1) : "0.0";
              return (
                <tr key={r.id} style={{ borderBottom: i < results.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{r.order_no || `#${r.order_id}`}</td>
                  <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{r.product_name || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{fmt(r.completed_qty)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: r.defect_qty > 0 ? "#DC2626" : "var(--text-muted)" }}>{fmt(r.defect_qty || 0)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px" }}>
                    <span style={{ padding: "2px 7px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                      backgroundColor: parseFloat(rate) > 5 ? "#FEF2F2" : "#DCFCE7",
                      color: parseFloat(rate) > 5 ? "#DC2626" : "#15803D" }}>{rate}%</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{r.completed_date}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.worker_note || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 실적 등록 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "460px", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>생산 실적 등록</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>생산 지시서 *</label>
                <select value={form.order_id} onChange={e => setForm(p => ({ ...p, order_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택...</option>
                  {orders.map((o: any) => (
                    <option key={o.id} value={o.id}>{o.order_no || `#${o.id}`} - {o.product_name} (계획: {fmt(o.planned_qty)})</option>
                  ))}
                </select>
                {orders.length === 0 && <p style={{ fontSize: "11px", color: "#EF4444" }}>생산중 상태의 지시서가 없습니다.</p>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>완료 수량 *</label>
                  <input type="number" value={form.completed_qty} onChange={e => setForm(p => ({ ...p, completed_qty: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>불량 수량</label>
                  <input type="number" value={form.defect_qty} onChange={e => setForm(p => ({ ...p, defect_qty: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>완료일 *</label>
                <input type="date" value={form.completed_date} onChange={e => setForm(p => ({ ...p, completed_date: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>작업 메모</label>
                <textarea value={form.worker_note} onChange={e => setForm(p => ({ ...p, worker_note: e.target.value }))} rows={2}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleSave} disabled={saving || !form.order_id || !form.completed_qty || !form.completed_date}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : "등록"}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
