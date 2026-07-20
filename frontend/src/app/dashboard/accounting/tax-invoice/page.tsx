"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";

const DIR_COLOR: Record<string, { backgroundColor: string; color: string; border: string }> = {
  발행: { backgroundColor: "rgba(21,128,61,0.12)",  color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  수취: { backgroundColor: "rgba(29,78,216,0.12)",  color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.40)" },
};
const STATUS_COLOR: Record<string, { backgroundColor: string; color: string; border: string }> = {
  임시저장: { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" },
  발행완료: { backgroundColor: "rgba(21,128,61,0.12)",   color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  취소:     { backgroundColor: "rgba(220,38,38,0.12)",   color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)" },
};

const EMPTY = { vendor_id: "", direction: "발행", invoice_no: "", issue_date: "", supply_amount: "", tax_amount: "", item_name: "", status: "임시저장", note: "" };

function fmt(v: any) {
  const n = parseFloat(String(v ?? 0));
  if (isNaN(n)) return "—";
  return n.toLocaleString("ko-KR") + "원";
}

export default function TaxInvoicePage() {
  const [list, setList]         = useState<any[]>([]);
  const [summary, setSummary]   = useState<any>(null);
  const [vendors, setVendors]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [direction, setDirection] = useState("");
  const [status, setStatus]     = useState("");
  const [year, setYear]         = useState(new Date().getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [form, setForm]           = useState<any>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [autoTax, setAutoTax]     = useState(true);
  const [modal, setModal]         = useState<ModalConfig | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const h = { "X-Business-Id": bizId() };
    const params: any = { year };
    if (direction) params.direction = direction;
    if (status)    params.status    = status;
    const [inv, sum, vnd] = await Promise.all([
      api.get("/api/accounting/tax-invoice/",       { params, headers: h }).catch(() => ({ data: [] })),
      api.get("/api/accounting/tax-invoice/summary", { params: { year }, headers: h }).catch(() => ({ data: null })),
      api.get("/api/accounting/vendors/",            { headers: h }).catch(() => ({ data: [] })),
    ]);
    setList(inv.data);
    setSummary(sum.data);
    setVendors(vnd.data);
    setLoading(false);
  }, [direction, status, year]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setAutoTax(true); setShowModal(true); };
  const openEdit   = (item: any) => {
    setEditing(item);
    setForm({
      vendor_id: item.vendor_id ?? "", direction: item.direction,
      invoice_no: item.invoice_no || "", issue_date: item.issue_date,
      supply_amount: String(item.supply_amount), tax_amount: String(item.tax_amount),
      item_name: item.item_name || "", status: item.status, note: item.note || "",
    });
    setAutoTax(false);
    setShowModal(true);
  };

  const handleSupplyChange = (v: string) => {
    const updated: any = { ...form, supply_amount: v };
    if (autoTax) {
      const n = parseFloat(v);
      updated.tax_amount = isNaN(n) ? "" : String(Math.round(n * 0.1));
    }
    setForm(updated);
  };

  const handleSave = async () => {
    if (!form.issue_date || !form.supply_amount) return;
    setSaving(true);
    try {
      const h = { "X-Business-Id": bizId() };
      const body: any = {
        ...form,
        vendor_id:     form.vendor_id ? Number(form.vendor_id) : null,
        supply_amount: parseFloat(form.supply_amount),
        tax_amount:    form.tax_amount ? parseFloat(form.tax_amount) : null,
      };
      if (editing) {
        await api.put(`/api/accounting/tax-invoice/${editing.id}`, body, { headers: h });
      } else {
        await api.post("/api/accounting/tax-invoice/", body, { headers: h });
      }
      setShowModal(false);
      await load();
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail ?? "저장에 실패했습니다.", variant: "error" });
    }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    setModal({ title: "삭제 확인", message: "세금계산서를 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        try {
          await api.delete(`/api/accounting/tax-invoice/${id}`, { headers: { "X-Business-Id": bizId() } });
          await load();
        } catch (e: any) {
          setModal({ message: e?.response?.data?.detail ?? "삭제에 실패했습니다.", variant: "error" });
        }
      } });
  };

  const handleStatusChange = async (item: any, newStatus: string) => {
    try {
      await api.put(`/api/accounting/tax-invoice/${item.id}`, { status: newStatus }, { headers: { "X-Business-Id": bizId() } });
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
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>세금계산서</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>매출/매입 세금계산서를 관리합니다. · {list.length}건</p>
        </div>
        <button onClick={openCreate}
          style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + 세금계산서 등록
        </button>
      </div>

      {/* 부가세 요약 */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: "매출 세금계산서", value: `${summary.issued_count}건`, sub: fmt(summary.issued_supply) },
            { label: "매입 세금계산서", value: `${summary.received_count}건`, sub: fmt(summary.received_supply) },
            { label: "부가세 납부 예정",  value: fmt(summary.vat_payable), warn: summary.vat_payable > 0 },
            { label: "매출 세액",  value: fmt(summary.issued_tax), sub: `매입세액 ${fmt(summary.received_tax)}` },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: (card as any).warn ? "rgba(220,38,38,0.12)" : "var(--bg-surface)", border: `1px solid ${(card as any).warn ? "rgba(220,38,38,0.40)" : "var(--border)"}`, borderRadius: "12px", padding: "16px 18px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{card.label}</p>
              <p style={{ fontSize: "18px", fontWeight: 900, color: (card as any).warn && summary.vat_payable > 0 ? "#DC2626" : "var(--text-primary)", lineHeight: 1 }}>{card.value}</p>
              {(card as any).sub && <p style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "4px" }}>{(card as any).sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={direction} onChange={e => setDirection(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 구분</option>
          <option value="발행">발행 (매출)</option>
          <option value="수취">수취 (매입)</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 상태</option>
          <option value="임시저장">임시저장</option>
          <option value="발행완료">발행완료</option>
          <option value="취소">취소</option>
        </select>
      </div>

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["구분", "거래처", "품목", "발행일", "공급가액", "세액", "합계", "상태", ""].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                등록된 세금계산서가 없습니다<br />
                <button onClick={openCreate} style={{ marginTop: "12px", padding: "8px 16px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>세금계산서 등록</button>
              </td></tr>
            ) : list.map((item, i) => {
              const dc = DIR_COLOR[item.direction] || { backgroundColor: "rgba(107,114,128,0.10)", color: "#374151", border: "1px solid rgba(107,114,128,0.30)" };
              const sc = STATUS_COLOR[item.status]  || { backgroundColor: "rgba(107,114,128,0.10)", color: "#374151", border: "1px solid rgba(107,114,128,0.30)" };
              return (
                <tr key={item.id}
                  style={{ borderBottom: i < list.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ ...dc, fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{item.direction}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{item.vendor_name || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-primary)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.item_name || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{item.issue_date}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-primary)", textAlign: "right" }}>{fmt(item.supply_amount)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)", textAlign: "right" }}>{fmt(item.tax_amount)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", textAlign: "right" }}>{fmt(item.total_amount)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <select
                      value={item.status}
                      onChange={e => { e.stopPropagation(); handleStatusChange(item, e.target.value); }}
                      style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, ...sc, cursor: "pointer" }}>
                      <option value="임시저장">임시저장</option>
                      <option value="발행완료">발행완료</option>
                      <option value="취소">취소</option>
                    </select>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => openEdit(item)}
                        style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}>수정</button>
                      <button onClick={() => handleDelete(item.id)}
                        style={{ fontSize: "12px", color: "#DC2626", backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.40)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}>삭제</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {/* 등록/수정 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "560px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>
                {editing ? "세금계산서 수정" : "세금계산서 등록"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {/* 구분 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>구분</label>
                <select value={form.direction} onChange={e => setForm((p: any) => ({ ...p, direction: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="발행">발행 (매출)</option>
                  <option value="수취">수취 (매입)</option>
                </select>
              </div>
              {/* 상태 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>상태</label>
                <select value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="임시저장">임시저장</option>
                  <option value="발행완료">발행완료</option>
                  <option value="취소">취소</option>
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
              {/* 품목 */}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>품목</label>
                <input value={form.item_name} onChange={e => setForm((p: any) => ({ ...p, item_name: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              {/* 발행일 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>발행일 *</label>
                <input type="date" value={form.issue_date} onChange={e => setForm((p: any) => ({ ...p, issue_date: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              {/* 문서번호 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>문서번호</label>
                <input value={form.invoice_no} onChange={e => setForm((p: any) => ({ ...p, invoice_no: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              {/* 공급가액 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>공급가액 *</label>
                <input type="number" value={form.supply_amount} onChange={e => handleSupplyChange(e.target.value)}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              {/* 세액 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  세액
                  <label style={{ fontSize: "10px", color: "var(--text-muted)", cursor: "pointer", fontWeight: 400, display: "flex", gap: "4px", alignItems: "center" }}>
                    <input type="checkbox" checked={autoTax} onChange={e => setAutoTax(e.target.checked)} />
                    자동(10%)
                  </label>
                </label>
                <input type="number" value={form.tax_amount} disabled={autoTax}
                  onChange={e => setForm((p: any) => ({ ...p, tax_amount: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: autoTax ? "var(--bg-surface-3)" : "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", opacity: autoTax ? 0.7 : 1 }} />
              </div>
              {/* 합계 표시 */}
              {form.supply_amount && (
                <div style={{ gridColumn: "1 / -1", padding: "12px 14px", backgroundColor: "var(--accent-light)", borderRadius: "8px", border: "1px solid rgba(255,190,80,0.2)" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>합계: </span>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--accent)" }}>
                    {(parseFloat(form.supply_amount || "0") + parseFloat(form.tax_amount || "0")).toLocaleString("ko-KR")}원
                  </span>
                </div>
              )}
              {/* 메모 */}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>메모</label>
                <textarea value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))} rows={2}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={handleSave} disabled={saving || !form.issue_date || !form.supply_amount}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : editing ? "수정 완료" : "등록"}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
