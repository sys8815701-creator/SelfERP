"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const REASON_COLOR: Record<string, string> = {
  품질불량: "#DC2626", 오배송: "#D97706", 주문취소: "#6B7280", 파손: "#7C3AED", 기타: "#6B7280",
};

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR", { maximumFractionDigits: 3 }); }

export default function ReturnsPage() {
  const [returns, setReturns]     = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [items, setItems]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<any>({ delivery_id: "", item_id: "", item_name: "", return_qty: "", reason: "기타", return_date: new Date().toISOString().split("T")[0], note: "", restock: false });
  const [saving, setSaving]       = useState(false);

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const h = () => ({ "X-Business-Id": bizId() });

  const load = useCallback(async () => {
    setLoading(true);
    const [r, d, i] = await Promise.all([
      api.get("/api/distribution/returns",    { headers: h() }).catch(() => ({ data: [] })),
      api.get("/api/distribution/deliveries", { headers: h() }).catch(() => ({ data: [] })),
      api.get("/api/production/items",        { headers: h() }).catch(() => ({ data: [] })),
    ]);
    setReturns(r.data);
    setDeliveries(d.data);
    setItems(i.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.return_qty || !form.return_date) return;
    setSaving(true);
    try {
      await api.post("/api/distribution/returns", {
        delivery_id: form.delivery_id ? Number(form.delivery_id) : null,
        item_id:     form.item_id ? Number(form.item_id) : null,
        item_name:   form.item_name || null,
        return_qty:  parseFloat(form.return_qty),
        reason:      form.reason,
        return_date: form.return_date,
        note:        form.note,
        restock:     form.restock,
      }, { headers: h() });
      setShowModal(false); await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const totalQty    = returns.reduce((s, r) => s + parseFloat(r.return_qty || 0), 0);
  const restockCount = returns.filter(r => r.is_restocked).length;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>반품 처리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>반품 접수 및 재고 복원을 관리합니다. · {returns.length}건</p>
        </div>
        <button onClick={() => { setForm({ delivery_id: "", item_id: "", item_name: "", return_qty: "", reason: "기타", return_date: new Date().toISOString().split("T")[0], note: "", restock: false }); setShowModal(true); }}
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + 반품 등록
        </button>
      </div>

      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "22px" }}>
        {[
          { label: "총 반품 건수", value: returns.length },
          { label: "총 반품 수량", value: fmt(totalQty), warn: totalQty > 0 },
          { label: "재고 복원 완료", value: `${restockCount}건` },
        ].map(c => (
          <div key={c.label} style={{ backgroundColor: "var(--bg-surface)", border: `1px solid ${c.warn ? "#FCA5A5" : "var(--border)"}`, borderRadius: "14px", padding: "18px 22px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{c.label}</p>
            <p style={{ fontSize: "24px", fontWeight: 900, color: c.warn ? "#DC2626" : "var(--text-primary)" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["반품일", "품목", "수량", "사유", "배송번호", "재고복원", "메모"].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            : returns.length === 0 ? <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>등록된 반품이 없습니다.</td></tr>
            : returns.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i < returns.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{r.return_date}</td>
                <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{r.item_display_name || r.item_name || "—"}</td>
                <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>{fmt(r.return_qty)}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", backgroundColor: `${REASON_COLOR[r.reason] || "#6B7280"}20`, color: REASON_COLOR[r.reason] || "#6B7280" }}>
                    {r.reason}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{r.delivery_no || "—"}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", backgroundColor: r.is_restocked ? "#DCFCE7" : "#F3F4F6", color: r.is_restocked ? "#15803D" : "#6B7280" }}>
                    {r.is_restocked ? "완료" : "미처리"}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 등록 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "480px", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>반품 등록</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>연결 배송</label>
                <select value={form.delivery_id} onChange={e => setForm((p: any) => ({ ...p, delivery_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택 안 함</option>
                  {deliveries.map((d: any) => <option key={d.id} value={d.id}>{d.delivery_no || `#${d.id}`} {d.recipient ? `→ ${d.recipient}` : ""}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>반품 품목</label>
                <select value={form.item_id} onChange={e => {
                  const v = e.target.value;
                  const item = items.find((i: any) => i.id === Number(v));
                  setForm((p: any) => ({ ...p, item_id: v, item_name: item?.item_name || "" }));
                }}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">품목 선택 (또는 직접 입력)</option>
                  {items.map((i: any) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
                {!form.item_id && (
                  <input value={form.item_name} onChange={e => setForm((p: any) => ({ ...p, item_name: e.target.value }))} placeholder="품목명 직접 입력"
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>반품 수량 *</label>
                  <input type="number" min="0" value={form.return_qty} onChange={e => setForm((p: any) => ({ ...p, return_qty: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>반품일 *</label>
                  <input type="date" value={form.return_date} onChange={e => setForm((p: any) => ({ ...p, return_date: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>반품 사유</label>
                <select value={form.reason} onChange={e => setForm((p: any) => ({ ...p, reason: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  {["품질불량", "오배송", "주문취소", "파손", "기타"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>메모</label>
                <input value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.restock} onChange={e => setForm((p: any) => ({ ...p, restock: e.target.checked }))} />
                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>재고 복원 (반품 즉시 입고 처리)</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleSave} disabled={saving || !form.return_qty || !form.return_date}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : "반품 등록"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
