"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useRole, canWrite, canDelete } from "@/hooks/useRole";
import Modal, { ModalConfig } from "@/components/Modal";

const STATUS_COLOR: Record<string, { backgroundColor: string; color: string; border: string }> = {
  접수:    { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" },
  생산중:  { backgroundColor: "rgba(29,78,216,0.12)",   color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.40)" },
  출하대기: { backgroundColor: "rgba(161,98,7,0.12)",   color: "#A16207", border: "1px solid rgba(161,98,7,0.40)" },
  배송중:  { backgroundColor: "rgba(67,56,202,0.12)",   color: "#4338CA", border: "1px solid rgba(67,56,202,0.40)" },
  완료:    { backgroundColor: "rgba(21,128,61,0.12)",   color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  취소:    { backgroundColor: "rgba(220,38,38,0.12)",   color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)" },
};

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

export default function SalesOrdersPage() {
  const role = useRole();
  const [orders, setOrders]   = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("status") ?? "";
  });
  const [selected, setSelected] = useState<any | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<any>({ vendor_id: "", order_no: "", order_date: "", due_date: "", note: "" });
  const [lines, setLines]         = useState<any[]>([{ item_name: "", quantity: "", unit_price: "", note: "" }]);
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState<ModalConfig | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const h = () => ({ "X-Business-Id": bizId() });

  const PENDING_STATUSES = ["접수", "생산중", "출하대기"];

  const load = useCallback(async () => {
    setLoading(true);
    const [o, v] = await Promise.all([
      (statusFilter === "처리대기"
        ? Promise.all(PENDING_STATUSES.map(s => api.get("/api/distribution/orders", { params: { status: s }, headers: h() }).catch(() => ({ data: [] }))))
            .then(results => ({ data: (results as any[]).flatMap(r => r.data) }))
        : api.get("/api/distribution/orders", { params: statusFilter ? { status: statusFilter } : {}, headers: h() }).catch(() => ({ data: [] }))
      ),
      api.get("/api/accounting/vendors", { headers: h() }).catch(() => ({ data: [] })),
    ]);
    setOrders(o.data);
    setVendors(v.data);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const validLines = lines.filter(l => l.item_name && l.quantity);
    if (!validLines.length) return;
    setSaving(true);
    try {
      await api.post("/api/distribution/orders", {
        vendor_id:  form.vendor_id ? Number(form.vendor_id) : null,
        order_no:   form.order_no,
        order_date: form.order_date || null,
        due_date:   form.due_date || null,
        note:       form.note,
        items: validLines.map(l => ({
          item_name:  l.item_name,
          quantity:   parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price) || 0,
          note:       l.note,
        })),
      }, { headers: h() });
      setShowModal(false); setSelected(null); await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    await api.put(`/api/distribution/orders/${id}`, { status }, { headers: h() });
    await load();
  };

  const handleDelete = (id: number) => {
    setModal({ title: "삭제 확인", message: "수주를 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        await api.delete(`/api/distribution/orders/${id}`, { headers: h() });
        setSelected(null); await load();
      } });
  };

  const loadDetail = async (id: number) => {
    const r = await api.get(`/api/distribution/orders/${id}`, { headers: h() }).catch(() => ({ data: null }));
    setSelected(r.data);
  };

  const addLine    = () => setLines(p => [...p, { item_name: "", quantity: "", unit_price: "", note: "" }]);
  const removeLine = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));
  const setLine    = (i: number, k: string, v: string) => setLines(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>수주 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>고객사 주문을 접수하고 관리합니다. · {orders.length}건</p>
        </div>
        {canWrite(role) && (
          <button onClick={() => { setForm({ vendor_id: "", order_no: "", order_date: new Date().toISOString().split("T")[0], due_date: "", note: "" }); setLines([{ item_name: "", quantity: "", unit_price: "", note: "" }]); setShowModal(true); }}
            style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            + 수주 등록
          </button>
        )}
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 상태</option>
          <option value="처리대기">처리 대기 (접수·생산중·출하대기)</option>
          {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: "20px" }}>
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                {["수주번호", "고객사", "납기일", "품목수", "합계금액", "상태"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
              : orders.length === 0 ? <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>등록된 수주가 없습니다</td></tr>
              : orders.map((o, i) => {
                const sc = STATUS_COLOR[o.status] || { bg: "#F3F4F6", color: "#374151" };
                const overdue = o.due_date && o.status !== "완료" && o.status !== "취소" && new Date(o.due_date) < new Date();
                return (
                  <tr key={o.id} onClick={() => loadDetail(o.id)}
                    style={{ borderBottom: i < orders.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer",
                      backgroundColor: selected?.id === o.id ? "var(--bg-surface-2)" : overdue ? "rgba(254,242,242,0.3)" : "transparent" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = selected?.id === o.id ? "var(--bg-surface-2)" : overdue ? "rgba(254,242,242,0.3)" : "transparent"; }}>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{o.order_no || `#${o.id}`}</td>
                    <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{o.vendor_name || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: overdue ? "#DC2626" : "var(--text-muted)", fontWeight: overdue ? 700 : 400 }}>
                      {o.due_date || "—"}{overdue && " ⚠"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{o.item_count}개</td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>₩{fmt(o.total_amount)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {canWrite(role) ? (
                        <select value={o.status} onChange={e => { e.stopPropagation(); handleStatusChange(o.id, e.target.value); }}
                          onClick={e => e.stopPropagation()}
                          style={{ ...sc, padding: "4px 8px", borderRadius: "6px", border: "none", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                          {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span style={{ ...sc, padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                          {o.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 상세 드로어 */}
        {selected && (
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>{selected.order_no || `수주 #${selected.id}`}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{selected.vendor_name || "고객사 미지정"}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
              {[
                { label: "수주일", value: selected.order_date },
                { label: "납기일", value: selected.due_date },
                { label: "합계금액", value: `₩${fmt(selected.total_amount)}` },
                { label: "상태", value: selected.status },
              ].map(r => (
                <div key={r.label} style={{ padding: "8px 10px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px" }}>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{r.label}</p>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginTop: "2px" }}>{r.value || "—"}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>품목 ({selected.items?.length ?? 0})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
              {(selected.items ?? []).map((item: any, idx: number) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px" }}>
                  <p style={{ fontSize: "13px", color: "var(--text-primary)" }}>{item.item_display_name || item.item_name}</p>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{fmt(item.quantity)} × ₩{fmt(item.unit_price)}</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>₩{fmt(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
            {canDelete(role) && (
              <button onClick={() => handleDelete(selected.id)}
                style={{ width: "100%", padding: "9px", backgroundColor: "var(--bg-surface-2)", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                수주 삭제
              </button>
            )}
          </div>
        )}
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {/* 등록 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "560px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>수주 등록</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>고객사</label>
                <select value={form.vendor_id} onChange={e => setForm((p: any) => ({ ...p, vendor_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택 안 함</option>
                  {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                </select>
              </div>
              {[
                { label: "수주번호", key: "order_no", type: "text" },
                { label: "수주일",   key: "order_date", type: "date" },
                { label: "납기일",   key: "due_date",   type: "date" },
              ].map(f => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>비고</label>
                <input value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>수주 품목</p>
                <button onClick={addLine} style={{ fontSize: "12px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" }}>+ 추가</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lines.map((line, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px" }}>
                    <input placeholder="품목명 *" value={line.item_name} onChange={e => setLine(idx, "item_name", e.target.value)}
                      style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px" }} />
                    <input type="number" placeholder="수량 *" value={line.quantity} onChange={e => setLine(idx, "quantity", e.target.value)}
                      style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px" }} />
                    <input type="number" placeholder="단가" value={line.unit_price} onChange={e => setLine(idx, "unit_price", e.target.value)}
                      style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px" }} />
                    <button onClick={() => removeLine(idx)} style={{ padding: "7px 10px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
                  </div>
                ))}
              </div>
              {lines.filter(l => l.item_name && l.unit_price).length > 0 && (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", textAlign: "right" }}>
                  합계: ₩{fmt(lines.reduce((s, l) => s + (parseFloat(l.quantity || "0") * parseFloat(l.unit_price || "0")), 0))}
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleSave} disabled={saving || !lines.some(l => l.item_name && l.quantity)}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : "수주 등록"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
