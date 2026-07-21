"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useRole, canWrite } from "@/hooks/useRole";

const LOG_TYPE_COLOR: Record<string, { backgroundColor: string; color: string; border: string }> = {
  입고:     { backgroundColor: "rgba(21,128,61,0.12)",   color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  출고:     { backgroundColor: "rgba(220,38,38,0.12)",   color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)" },
  생산소비: { backgroundColor: "rgba(161,98,7,0.12)",    color: "#A16207", border: "1px solid rgba(161,98,7,0.40)" },
  생산완료: { backgroundColor: "rgba(29,78,216,0.12)",   color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.40)" },
  조정:     { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" },
  반품:     { backgroundColor: "rgba(126,34,206,0.12)",  color: "#7E22CE", border: "1px solid rgba(126,34,206,0.40)" },
};

function fmt(v: any) {
  const n = parseFloat(String(v ?? 0));
  const abs = Math.abs(n).toLocaleString("ko-KR", { maximumFractionDigits: 3 });
  return n >= 0 ? `+${abs}` : `-${abs}`;
}

export default function InventoryLogPage() {
  const role = useRole();
  const [logs, setLogs]         = useState<any[]>([]);
  const [items, setItems]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const [itemFilter, setItemFilter]   = useState("");
  const [typeFilter, setTypeFilter]   = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ item_id: "", log_type: "입고", quantity: "", reference_no: "", note: "" });
  const [saving, setSaving]       = useState(false);

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const headers = () => ({ "X-Business-Id": bizId() });

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = {};
    if (itemFilter) params.item_id = itemFilter;
    if (typeFilter) params.log_type = typeFilter;
    const [l, i] = await Promise.all([
      api.get("/api/production/inventory-logs", { params, headers: headers() }).catch(() => ({ data: [] })),
      api.get("/api/production/items",          { headers: headers() }).catch(() => ({ data: [] })),
    ]);
    setLogs(l.data);
    setItems(i.data);
    setLoading(false);
  }, [itemFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.item_id || !form.quantity) return;
    setSaving(true);
    try {
      const qty = parseFloat(form.quantity);
      await api.post("/api/production/inventory-logs", {
        item_id:      Number(form.item_id),
        log_type:     form.log_type,
        quantity:     ["출고", "생산소비"].includes(form.log_type) ? -Math.abs(qty) : Math.abs(qty),
        reference_no: form.reference_no,
        note:         form.note,
      }, { headers: headers() });
      setShowModal(false);
      setForm({ item_id: "", log_type: "입고", quantity: "", reference_no: "", note: "" });
      await load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>입출고 이력</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>자재 입출고 이력을 조회하고 등록합니다. · {logs.length}건</p>
        </div>
        {canWrite(role) && (
          <button onClick={() => setShowModal(true)}
            style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            + 입출고 등록
          </button>
        )}
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <select value={itemFilter} onChange={e => setItemFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 품목</option>
          {items.map((i: any) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 유형</option>
          {Object.keys(LOG_TYPE_COLOR).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["날짜", "품목명", "유형", "수량", "참조번호", "메모"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>입출고 이력이 없습니다</td></tr>
            ) : logs.map((log, i) => {
              const tc = LOG_TYPE_COLOR[log.log_type] || { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" };
              const isNeg = parseFloat(log.quantity) < 0;
              return (
                <tr key={log.id}
                  style={{ borderBottom: i < logs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>
                    {log.log_date || (log.created_at ? new Date(log.created_at).toLocaleDateString("ko-KR") : "—")}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{log.item_name}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ ...tc, padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>{log.log_type}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 700, color: isNeg ? "#DC2626" : "#15803D" }}>
                    {fmt(log.quantity)}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{log.reference_no || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.note || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 등록 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "460px", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>입출고 등록</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>품목 *</label>
                <select value={form.item_id} onChange={e => setForm(p => ({ ...p, item_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택...</option>
                  {items.map((i: any) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>유형 *</label>
                  <select value={form.log_type} onChange={e => setForm(p => ({ ...p, log_type: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                    {["입고", "출고", "조정", "반품"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>수량 *</label>
                  <input type="number" min="0" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    placeholder="양수 입력"
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>참조번호</label>
                <input value={form.reference_no} onChange={e => setForm(p => ({ ...p, reference_no: e.target.value }))}
                  placeholder="발주번호, 납품서 번호 등"
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>메모</label>
                <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={2}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
              {["출고", "생산소비"].includes(form.log_type) && (
                <p style={{ fontSize: "11px", color: "var(--text-muted)", backgroundColor: "var(--bg-surface-2)", padding: "8px 12px", borderRadius: "8px" }}>
                  ※ 출고/생산소비는 자동으로 음수(-) 처리됩니다.
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleSave} disabled={saving || !form.item_id || !form.quantity}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
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
