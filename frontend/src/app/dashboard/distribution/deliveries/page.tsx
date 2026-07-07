"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";

const STATUS_COLOR: Record<string, { backgroundColor: string; color: string; border: string }> = {
  대기:  { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" },
  배송중: { backgroundColor: "rgba(29,78,216,0.12)",  color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.40)" },
  완료:  { backgroundColor: "rgba(21,128,61,0.12)",   color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  실패:  { backgroundColor: "rgba(220,38,38,0.12)",   color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)" },
  취소:  { backgroundColor: "rgba(220,38,38,0.12)",   color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)" },
};

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [vehicles, setVehicles]     = useState<any[]>([]);
  const [orders, setOrders]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter]       = useState("");
  const [dateFilter, setDateFilter]           = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<any>({ sales_order_id: "", vehicle_id: "", delivery_no: "", scheduled_date: "", destination: "", recipient: "", recipient_phone: "", delivery_fee: "", note: "" });
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState<ModalConfig | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const h = () => ({ "X-Business-Id": bizId() });

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = {};
    if (statusFilter) params.status = statusFilter;
    if (dateFilter)   params.scheduled_date = dateFilter;
    const [d, v, o] = await Promise.all([
      api.get("/api/distribution/deliveries",  { params, headers: h() }).catch(() => ({ data: [] })),
      api.get("/api/distribution/vehicles",    { headers: h() }).catch(() => ({ data: [] })),
      api.get("/api/distribution/orders",      { headers: h() }).catch(() => ({ data: [] })),
    ]);
    setDeliveries(d.data);
    setVehicles(v.data.filter((v: any) => v.is_active));
    setOrders(o.data.filter((o: any) => o.status !== "완료" && o.status !== "취소"));
    setLoading(false);
  }, [statusFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        sales_order_id: form.sales_order_id ? Number(form.sales_order_id) : null,
        vehicle_id:     form.vehicle_id ? Number(form.vehicle_id) : null,
        delivery_fee:   form.delivery_fee ? parseFloat(form.delivery_fee) : 0,
        scheduled_date: form.scheduled_date || null,
      };
      await api.post("/api/distribution/deliveries", body, { headers: h() });
      setShowModal(false); await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    const body: any = { status };
    if (status === "완료") body.completed_date = new Date().toISOString().split("T")[0];
    await api.put(`/api/distribution/deliveries/${id}`, body, { headers: h() });
    await load();
  };

  const handleDelete = (id: number) => {
    setModal({ title: "삭제 확인", message: "배송 지시를 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        await api.delete(`/api/distribution/deliveries/${id}`, { headers: h() });
        await load();
      } });
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>배송 지시</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>배송 계획을 수립하고 실시간 상태를 관리합니다. · {deliveries.length}건</p>
        </div>
        <button onClick={() => { setForm({ sales_order_id: "", vehicle_id: "", delivery_no: "", scheduled_date: new Date().toISOString().split("T")[0], destination: "", recipient: "", recipient_phone: "", delivery_fee: "", note: "" }); setShowModal(true); }}
          style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + 배송 지시
        </button>
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 상태</option>
          {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }} />
        {dateFilter && <button onClick={() => setDateFilter("")} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}>날짜 초기화</button>}
      </div>

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["배송번호", "차량", "기사", "배송지", "수령인", "예정일", "배송비", "상태", ""].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            : deliveries.length === 0 ? <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>등록된 배송 지시가 없습니다</td></tr>
            : deliveries.map((d, i) => {
              const sc = STATUS_COLOR[d.status] || { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" };
              return (
                <tr key={d.id} style={{ borderBottom: i < deliveries.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{d.delivery_no || `#${d.id}`}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{d.vehicle_plate || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{d.driver_name || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.destination || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{d.recipient || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{d.scheduled_date || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{parseFloat(d.delivery_fee || 0) > 0 ? `₩${fmt(d.delivery_fee)}` : "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <select value={d.status} onChange={e => handleStatusChange(d.id, e.target.value)}
                      style={{ ...sc, padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                      {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button onClick={() => handleDelete(d.id)} style={{ fontSize: "11px", color: "#DC2626", backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.40)", borderRadius: "6px", padding: "3px 7px", cursor: "pointer" }}>삭제</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {/* 등록 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "520px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>배송 지시</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { label: "배송번호",   key: "delivery_no",    span: false },
                { label: "예정일",     key: "scheduled_date", span: false, type: "date" },
              ].map(f => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{f.label}</label>
                  <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>연결 수주</label>
                <select value={form.sales_order_id} onChange={e => setForm((p: any) => ({ ...p, sales_order_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택 안 함</option>
                  {orders.map((o: any) => <option key={o.id} value={o.id}>{o.order_no || `#${o.id}`} {o.vendor_name ? `(${o.vendor_name})` : ""}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>배송 차량</label>
                <select value={form.vehicle_id} onChange={e => setForm((p: any) => ({ ...p, vehicle_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택 안 함</option>
                  {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plate_no} {v.driver_name ? `(${v.driver_name})` : ""}</option>)}
                </select>
              </div>
              {[
                { label: "배송지", key: "destination", span: true },
                { label: "수령인", key: "recipient",   span: false },
                { label: "수령인 연락처", key: "recipient_phone", span: false },
                { label: "배송비", key: "delivery_fee", span: false, type: "number" },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.span ? "1 / -1" : "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{f.label}</label>
                  <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>메모</label>
                <textarea value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))} rows={2}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : "지시"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
