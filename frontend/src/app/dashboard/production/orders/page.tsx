"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";

const STATUS_COLOR: Record<string, { backgroundColor: string; color: string; border: string }> = {
  대기:   { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" },
  생산중: { backgroundColor: "rgba(29,78,216,0.12)",   color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.40)" },
  완료:   { backgroundColor: "rgba(21,128,61,0.12)",   color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  취소:   { backgroundColor: "rgba(220,38,38,0.12)",   color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)" },
};

const EMPTY = { order_no: "", product_id: "", bom_id: "", planned_qty: "", planned_date: "", note: "" };

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

export default function ProductionOrdersPage() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [items, setItems]     = useState<any[]>([]);
  const [boms, setBoms]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<any>({ ...EMPTY });
  const [saving, setSaving]       = useState(false);

  const [showResultModal, setShowResultModal] = useState(false);
  const [resultForm, setResultForm]           = useState({ order_id: 0, completed_qty: "", defect_qty: "0", completed_date: "", worker_note: "" });
  const [savingResult, setSavingResult]       = useState(false);
  const [modal, setModal]                     = useState<ModalConfig | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const h = { "X-Business-Id": bizId() };
    const params: any = {};
    if (statusFilter) params.status = statusFilter;
    const [ord, itm, bom] = await Promise.all([
      api.get("/api/production/orders", { params, headers: h }).catch(() => ({ data: [] })),
      api.get("/api/production/items",  { headers: h }).catch(() => ({ data: [] })),
      api.get("/api/production/boms",   { headers: h }).catch(() => ({ data: [] })),
    ]);
    setOrders(ord.data);
    setItems(itm.data.filter((i: any) => i.item_type === "완제품" || i.item_type === "반제품"));
    setBoms(bom.data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = () => {
    if (!form.product_id || !form.planned_qty) return;
    setModal({
      title: "생산 지시", variant: "info", showCancel: true, confirmLabel: "지시",
      message: "생산 지시서를 등록하시겠습니까?",
      onConfirm: async () => {
        setSaving(true);
        try {
          const body = {
            ...form,
            product_id: Number(form.product_id),
            bom_id:     form.bom_id ? Number(form.bom_id) : null,
            planned_qty: parseFloat(form.planned_qty),
          };
          await api.post("/api/production/orders", body, { headers: { "X-Business-Id": bizId() } });
          setShowModal(false);
          await load();
        } catch (e: any) {
          setModal({ message: e?.response?.data?.detail ?? "저장에 실패했습니다.", variant: "error" });
        }
        finally { setSaving(false); }
      },
    });
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.put(`/api/production/orders/${id}`, { status }, { headers: { "X-Business-Id": bizId() } });
      await load();
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail ?? "상태 변경에 실패했습니다.", variant: "error" });
    }
  };

  const openResultModal = (order: any) => {
    setResultForm({ order_id: order.id, completed_qty: String(order.planned_qty - (order.completed_qty || 0)), defect_qty: "0", completed_date: new Date().toISOString().split("T")[0], worker_note: "" });
    setShowResultModal(true);
  };

  const handleSaveResult = () => {
    if (!resultForm.completed_qty || !resultForm.completed_date) return;
    setModal({
      title: "생산 실적 등록", variant: "info", showCancel: true, confirmLabel: "등록",
      message: "생산 실적을 등록하시겠습니까?",
      onConfirm: async () => {
        setSavingResult(true);
        try {
          await api.post("/api/production/results", {
            order_id: resultForm.order_id,
            completed_qty: parseFloat(resultForm.completed_qty),
            defect_qty: parseFloat(resultForm.defect_qty) || 0,
            completed_date: resultForm.completed_date,
            worker_note: resultForm.worker_note,
          }, { headers: { "X-Business-Id": bizId() } });
          setShowResultModal(false);
          await load();
        } catch (e: any) {
          setModal({ message: e?.response?.data?.detail ?? "실적 등록에 실패했습니다.", variant: "error" });
        }
        finally { setSavingResult(false); }
      },
    });
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>생산 지시서</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>생산 계획을 수립하고 지시합니다. · {orders.length}건</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setShowModal(true); }}
          style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + 생산 지시
        </button>
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 상태</option>
          {["대기","생산중","완료","취소"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["지시번호", "제품명", "계획수량", "완료수량", "불량수량", "예정일", "상태", ""].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>생산 지시서가 없습니다</td></tr>
            ) : orders.map((order, i) => {
              const sc = STATUS_COLOR[order.status] || { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" };
              const pct = order.planned_qty > 0 ? Math.round((order.completed_qty || 0) / order.planned_qty * 100) : 0;
              return (
                <tr key={order.id}
                  style={{ borderBottom: i < orders.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{order.order_no || `#${order.id}`}</td>
                  <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{order.product_name}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-primary)" }}>{fmt(order.planned_qty)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmt(order.completed_qty || 0)}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>({pct}%)</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: order.defect_qty > 0 ? "#DC2626" : "var(--text-muted)" }}>
                    {fmt(order.defect_qty || 0)}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{order.planned_date || "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ ...sc, padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                      {["대기","생산중","완료","취소"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {order.status !== "완료" && order.status !== "취소" && (
                      <button onClick={() => openResultModal(order)}
                        style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>
                        실적 등록
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 지시서 등록 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "480px", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>생산 지시</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>지시번호</label>
                <input value={form.order_no} onChange={e => setForm((p: any) => ({ ...p, order_no: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>예정일</label>
                <input type="date" value={form.planned_date} onChange={e => setForm((p: any) => ({ ...p, planned_date: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>생산 제품 *</label>
                <select value={form.product_id} onChange={e => setForm((p: any) => ({ ...p, product_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택...</option>
                  {items.map((i: any) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>BOM (자재명세서)</label>
                <select value={form.bom_id} onChange={e => setForm((p: any) => ({ ...p, bom_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택 안 함</option>
                  {boms.filter((b: any) => !form.product_id || b.product_id === Number(form.product_id)).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.product_name} v{b.version}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>계획 수량 *</label>
                <input type="number" value={form.planned_qty} onChange={e => setForm((p: any) => ({ ...p, planned_qty: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>비고</label>
                <textarea value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))} rows={2}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={handleSave} disabled={saving || !form.product_id || !form.planned_qty}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : "지시"}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </>
      )}

      {/* 실적 등록 모달 */}
      {showResultModal && (
        <>
          <div onClick={() => setShowResultModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "440px", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>생산 실적 등록</h2>
              <button onClick={() => setShowResultModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "완료 수량 *", key: "completed_qty", type: "number" },
                { label: "불량 수량",   key: "defect_qty",    type: "number" },
                { label: "완료일 *",    key: "completed_date", type: "date" },
              ].map(f => (
                <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{f.label}</label>
                  <input type={f.type} value={(resultForm as any)[f.key]} onChange={e => setResultForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>작업 메모</label>
                <textarea value={resultForm.worker_note} onChange={e => setResultForm(p => ({ ...p, worker_note: e.target.value }))} rows={2}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleSaveResult} disabled={savingResult || !resultForm.completed_qty || !resultForm.completed_date}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: savingResult ? "not-allowed" : "pointer", opacity: savingResult ? 0.6 : 1 }}>
                {savingResult ? "저장 중..." : "실적 등록"}
              </button>
              <button onClick={() => setShowResultModal(false)}
                style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </>
      )}
      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
