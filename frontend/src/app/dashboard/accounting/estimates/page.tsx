"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { useRole, canWrite, canDelete } from "@/hooks/useRole";

const DOC_TYPE_COLOR: Record<string, { backgroundColor: string; color: string; border: string }> = {
  견적서: { backgroundColor: "rgba(29,78,216,0.12)",  color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.40)" },
  청구서: { backgroundColor: "rgba(21,128,61,0.12)",  color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  발주서: { backgroundColor: "rgba(126,34,206,0.12)", color: "#7E22CE", border: "1px solid rgba(126,34,206,0.40)" },
};
const STATUS_COLOR: Record<string, { backgroundColor: string; color: string; border: string }> = {
  초안: { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" },
  발송: { backgroundColor: "rgba(217,119,6,0.12)",  color: "#D97706", border: "1px solid rgba(217,119,6,0.40)" },
  승인: { backgroundColor: "rgba(21,128,61,0.12)",  color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  취소: { backgroundColor: "rgba(220,38,38,0.12)",  color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)" },
};

const EMPTY_FORM = { vendor_id: "", doc_type: "견적서", doc_no: "", issue_date: "", due_date: "", status: "초안", note: "" };
const EMPTY_ITEM = { item_name: "", quantity: 1, unit_price: 0, note: "" };

function fmt(v: any) {
  const n = parseFloat(String(v ?? 0));
  if (isNaN(n)) return "—";
  return n.toLocaleString("ko-KR") + "원";
}

export default function EstimatesPage() {
  const role = useRole();
  const [list, setList]       = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState("");
  const [status, setStatus]   = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [form, setForm]           = useState<any>({ ...EMPTY_FORM });
  const [items, setItems]         = useState<any[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState<ModalConfig | null>(null);

  const [drawer, setDrawer] = useState<any>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const h = { "X-Business-Id": bizId() };
    const params: any = {};
    if (docType) params.doc_type = docType;
    if (status)  params.status   = status;
    const [est, vnd] = await Promise.all([
      api.get("/api/accounting/estimates/",  { params, headers: h }).catch(() => ({ data: [] })),
      api.get("/api/accounting/vendors/",    { headers: h }).catch(() => ({ data: [] })),
    ]);
    setList(est.data);
    setVendors(vnd.data);
    setLoading(false);
  }, [docType, status]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setItems([{ ...EMPTY_ITEM }]);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      vendor_id: item.vendor_id ?? "", doc_type: item.doc_type,
      doc_no: item.doc_no || "", issue_date: item.issue_date,
      due_date: item.due_date || "", status: item.status, note: item.note || "",
    });
    setItems(item.items?.length ? item.items.map((i: any) => ({
      item_name: i.item_name, quantity: Number(i.quantity), unit_price: Number(i.unit_price), note: i.note || "",
    })) : [{ ...EMPTY_ITEM }]);
    setShowModal(true);
  };

  const addItem  = () => setItems(p => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: string, val: any) =>
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [key]: val } : it));

  const supply = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const tax    = Math.round(supply * 0.1);
  const total  = supply + tax;

  const handleSave = async () => {
    if (!form.issue_date) return;
    setSaving(true);
    try {
      const h = { "X-Business-Id": bizId() };
      const body = {
        ...form,
        vendor_id: form.vendor_id ? Number(form.vendor_id) : null,
        items: items.map(i => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
      };
      if (editing) {
        await api.put(`/api/accounting/estimates/${editing.id}`, body, { headers: h });
      } else {
        await api.post("/api/accounting/estimates/", body, { headers: h });
      }
      setShowModal(false);
      await load();
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail ?? "저장에 실패했습니다.", variant: "error" });
    }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    setModal({ title: "삭제 확인", message: "삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        try {
          await api.delete(`/api/accounting/estimates/${id}`, { headers: { "X-Business-Id": bizId() } });
          setDrawer(null);
          await load();
        } catch (e: any) {
          setModal({ message: e?.response?.data?.detail ?? "삭제에 실패했습니다.", variant: "error" });
        }
      } });
  };

  const handleStatusChange = async (item: any, newStatus: string) => {
    try {
      await api.put(`/api/accounting/estimates/${item.id}`, { status: newStatus }, { headers: { "X-Business-Id": bizId() } });
      await load();
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail ?? "상태 변경에 실패했습니다.", variant: "error" });
    }
  };

  return (
    <div style={{ width: "100%" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>견적서 · 청구서</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>견적서 · 청구서 · 발주서를 발행하고 이력을 관리합니다. · {list.length}건</p>
        </div>
        {canWrite(role) && (
          <button onClick={openCreate}
            style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            + 문서 발행
          </button>
        )}
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <select value={docType} onChange={e => setDocType(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 유형</option>
          <option value="견적서">견적서</option>
          <option value="청구서">청구서</option>
          <option value="발주서">발주서</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 상태</option>
          <option value="초안">초안</option>
          <option value="발송">발송</option>
          <option value="승인">승인</option>
          <option value="취소">취소</option>
        </select>
      </div>

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["유형", "거래처", "문서번호", "발행일", "공급가액", "세액", "합계", "상태", ""].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                발행된 문서가 없습니다<br />
                {canWrite(role) && (
                  <button onClick={openCreate} style={{ marginTop: "12px", padding: "8px 16px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>문서 발행</button>
                )}
              </td></tr>
            ) : list.map((item, i) => {
              const dc = DOC_TYPE_COLOR[item.doc_type] || { backgroundColor: "rgba(107,114,128,0.10)", color: "#374151", border: "1px solid rgba(107,114,128,0.30)" };
              const sc = STATUS_COLOR[item.status] || { backgroundColor: "rgba(107,114,128,0.10)", color: "#374151", border: "1px solid rgba(107,114,128,0.30)" };
              return (
                <tr key={item.id}
                  onClick={() => setDrawer(item)}
                  style={{ borderBottom: i < list.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ ...dc, fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{item.doc_type}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{item.vendor_name || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{item.doc_no || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{item.issue_date}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-primary)", textAlign: "right" }}>{fmt(item.supply_amount)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)", textAlign: "right" }}>{fmt(item.tax_amount)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>{fmt(item.total_amount)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {canWrite(role) ? (
                      <select value={item.status} onChange={e => { e.stopPropagation(); handleStatusChange(item, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, ...sc, cursor: "pointer" }}>
                        {["초안","발송","승인","취소"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, ...sc }}>{item.status}</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {canWrite(role) && (
                      <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                        style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}>수정</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {/* 상세 드로어 */}
      {drawer && (
        <>
          <div onClick={() => setDrawer(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "440px", backgroundColor: "var(--bg-surface)", borderLeft: "1px solid var(--border)", zIndex: 201, overflowY: "auto", padding: "28px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>{drawer.doc_type} {drawer.doc_no ? `#${drawer.doc_no}` : ""}</h2>
              <button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            {[
              { label: "거래처",  value: drawer.vendor_name },
              { label: "발행일",  value: drawer.issue_date },
              { label: "만기일",  value: drawer.due_date },
              { label: "상태",    value: drawer.status },
            ].map(r => r.value ? (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>{r.label}</span>
                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{r.value}</span>
              </div>
            ) : null)}

            {/* 품목 */}
            {drawer.items?.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>품목 내역</p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-surface-2)" }}>
                      {["품목", "수량", "단가", "금액"].map(h => (
                        <th key={h} style={{ padding: "7px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drawer.items.map((it: any, i: number) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "7px 10px", color: "var(--text-primary)" }}>{it.item_name}</td>
                        <td style={{ padding: "7px 10px", color: "var(--text-secondary)" }}>{it.quantity}</td>
                        <td style={{ padding: "7px 10px", color: "var(--text-secondary)" }}>{Number(it.unit_price).toLocaleString()}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: "var(--text-primary)" }}>{Number(it.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: "12px", textAlign: "right" }}>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>공급가액: {fmt(drawer.supply_amount)}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>세액: {fmt(drawer.tax_amount)}</p>
                  <p style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>합계: {fmt(drawer.total_amount)}</p>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
              {canWrite(role) && (
                <button onClick={() => { setDrawer(null); openEdit(drawer); }}
                  style={{ flex: 1, padding: "10px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>수정</button>
              )}
              {canDelete(role) && (
                <button onClick={() => handleDelete(drawer.id)}
                  style={{ padding: "10px 14px", backgroundColor: "rgba(220,38,38,0.12)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>삭제</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* 등록/수정 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "680px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>
                {editing ? "문서 수정" : "문서 발행"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
              {/* 유형 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>문서 유형</label>
                <select value={form.doc_type} onChange={e => setForm((p: any) => ({ ...p, doc_type: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="견적서">견적서</option>
                  <option value="청구서">청구서</option>
                  <option value="발주서">발주서</option>
                </select>
              </div>
              {/* 상태 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>상태</label>
                <select value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  {["초안","발송","승인","취소"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* 거래처 */}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>거래처</label>
                <select value={form.vendor_id} onChange={e => setForm((p: any) => ({ ...p, vendor_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택 안 함</option>
                  {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                </select>
              </div>
              {/* 발행일 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>발행일 *</label>
                <input type="date" value={form.issue_date} onChange={e => setForm((p: any) => ({ ...p, issue_date: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              {/* 만기일 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>만기일</label>
                <input type="date" value={form.due_date} onChange={e => setForm((p: any) => ({ ...p, due_date: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              {/* 문서번호 */}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>문서번호</label>
                <input value={form.doc_no} onChange={e => setForm((p: any) => ({ ...p, doc_no: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
            </div>

            {/* 품목 입력 */}
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px", borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>품목 내역</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              {items.map((it, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 40px", gap: "8px", alignItems: "center" }}>
                  <input value={it.item_name} onChange={e => updateItem(i, "item_name", e.target.value)} placeholder="품목명"
                    style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "7px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                  <input type="number" value={it.quantity} min="0" onChange={e => updateItem(i, "quantity", e.target.value)} placeholder="수량"
                    style={{ padding: "7px 8px", border: "1px solid var(--border)", borderRadius: "7px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                  <input type="number" value={it.unit_price} min="0" onChange={e => updateItem(i, "unit_price", e.target.value)} placeholder="단가"
                    style={{ padding: "7px 8px", border: "1px solid var(--border)", borderRadius: "7px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                  <button onClick={() => removeItem(i)} disabled={items.length === 1}
                    style={{ padding: "7px", border: "1px solid rgba(220,38,38,0.40)", borderRadius: "7px", backgroundColor: "rgba(220,38,38,0.12)", color: "#DC2626", cursor: items.length === 1 ? "not-allowed" : "pointer", fontSize: "14px", opacity: items.length === 1 ? 0.4 : 1 }}>×</button>
                </div>
              ))}
            </div>
            <button onClick={addItem}
              style={{ padding: "7px 14px", border: "1px dashed var(--border)", borderRadius: "7px", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer", width: "100%" }}>
              + 품목 추가
            </button>

            {/* 합계 */}
            <div style={{ marginTop: "16px", padding: "14px", backgroundColor: "var(--accent-light)", borderRadius: "10px", border: "1px solid rgba(255,190,80,0.2)", textAlign: "right" }}>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>공급가액: {supply.toLocaleString("ko-KR")}원</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>세액(10%): {tax.toLocaleString("ko-KR")}원</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "var(--accent)", marginTop: "4px" }}>합계: {total.toLocaleString("ko-KR")}원</p>
            </div>

            {/* 메모 */}
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>메모</label>
              <textarea value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))} rows={2}
                style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleSave} disabled={saving || !form.issue_date}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : editing ? "수정 완료" : "발행"}
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
