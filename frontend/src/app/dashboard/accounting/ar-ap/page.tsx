"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";

type Tab = "ar" | "ap";

const AR_STATUSES = ["미수", "일부수금", "완료", "대손"];
const AP_STATUSES = ["미지급", "일부지급", "완료"];

const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  미수:    { bg: "rgba(220,38,38,0.12)",   color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)" },
  일부수금: { bg: "rgba(217,119,6,0.12)",  color: "#D97706", border: "1px solid rgba(217,119,6,0.40)" },
  대손:    { bg: "rgba(107,114,128,0.10)", color: "#9CA3AF", border: "1px solid rgba(107,114,128,0.30)" },
  미지급:  { bg: "rgba(220,38,38,0.12)",   color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)" },
  일부지급: { bg: "rgba(217,119,6,0.12)",  color: "#D97706", border: "1px solid rgba(217,119,6,0.40)" },
  완료:    { bg: "rgba(21,128,61,0.12)",   color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
};

const EMPTY_AR = { vendor_id: "", title: "", amount: "", paid_amount: "0", issue_date: "", due_date: "", status: "미수", note: "" };
const EMPTY_AP = { vendor_id: "", title: "", amount: "", paid_amount: "0", issue_date: "", due_date: "", status: "미지급", note: "" };

function fmt(v: any) {
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("ko-KR") + "원";
}

function isOverdue(due_date: string, status: string) {
  if (status === "완료" || status === "대손") return false;
  return new Date(due_date) < new Date();
}

export default function ArApPage() {
  const [tab, setTab] = useState<Tab>("ar");
  const [arList, setArList] = useState<any[]>([]);
  const [apList, setApList] = useState<any[]>([]);
  const [arSummary, setArSummary] = useState<any>(null);
  const [apSummary, setApSummary] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [overdueOnly, setOverdueOnly]   = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [form, setForm]           = useState<any>(EMPTY_AR);
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState<ModalConfig | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const loadSummary = useCallback(async () => {
    const h = { "X-Business-Id": bizId() };
    const [ar, ap] = await Promise.all([
      api.get("/api/accounting/ar/summary", { headers: h }).catch(() => ({ data: null })),
      api.get("/api/accounting/ap/summary", { headers: h }).catch(() => ({ data: null })),
    ]);
    setArSummary(ar.data);
    setApSummary(ap.data);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const h = { "X-Business-Id": bizId() };
    const params: any = {};
    if (statusFilter) params.status = statusFilter;
    if (overdueOnly)  params.overdue_only = true;
    const [ar, ap, vnd] = await Promise.all([
      api.get("/api/accounting/ar/", { params, headers: h }).catch(() => ({ data: [] })),
      api.get("/api/accounting/ap/", { params, headers: h }).catch(() => ({ data: [] })),
      api.get("/api/accounting/vendors/", { headers: h }).catch(() => ({ data: [] })),
    ]);
    setArList(ar.data);
    setApList(ap.data);
    setVendors(vnd.data);
    await loadSummary();
    setLoading(false);
  }, [statusFilter, overdueOnly, loadSummary]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setForm(tab === "ar" ? { ...EMPTY_AR } : { ...EMPTY_AP });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      vendor_id:   item.vendor_id ?? "",
      title:       item.title,
      amount:      String(item.amount),
      paid_amount: String(item.paid_amount),
      issue_date:  item.issue_date,
      due_date:    item.due_date,
      status:      item.status,
      note:        item.note || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.amount || !form.issue_date || !form.due_date) return;
    setSaving(true);
    try {
      const h = { "X-Business-Id": bizId() };
      const body = {
        ...form,
        vendor_id:   form.vendor_id ? Number(form.vendor_id) : null,
        amount:      parseFloat(form.amount),
        paid_amount: parseFloat(form.paid_amount) || 0,
      };
      const path = tab === "ar" ? "/api/accounting/ar/" : "/api/accounting/ap/";
      if (editing) {
        await api.put(`${path}${editing.id}`, body, { headers: h });
      } else {
        await api.post(path, body, { headers: h });
      }
      setShowModal(false);
      await loadData();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    const path = tab === "ar" ? `/api/accounting/ar/${id}` : `/api/accounting/ap/${id}`;
    setModal({ title: "삭제 확인", message: "삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => { await api.delete(path, { headers: { "X-Business-Id": bizId() } }); await loadData(); } });
  };

  const handleStatusChange = async (item: any, newStatus: string) => {
    const path = tab === "ar" ? `/api/accounting/ar/${item.id}` : `/api/accounting/ap/${item.id}`;
    await api.put(path, { status: newStatus }, { headers: { "X-Business-Id": bizId() } });
    await loadData();
  };

  const list     = tab === "ar" ? arList : apList;
  const summary  = tab === "ar" ? arSummary : apSummary;
  const statuses = tab === "ar" ? AR_STATUSES : AP_STATUSES;

  const tabStyle = (t: Tab) => ({
    padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700,
    backgroundColor: tab === t ? "var(--accent)" : "var(--bg-surface-2)",
    color: tab === t ? "var(--accent-text)" : "var(--text-muted)",
  });

  const F = (key: string, label: string, type = "text", opts?: string[]) => (
    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
      {opts ? (
        <select value={form[key]} onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
          style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">선택 안 함</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
          style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
      )}
    </div>
  );

  return (
    <div style={{ width: "100%" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>미수금 · 미지급금</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>외상매출금(AR)과 외상매입금(AP)을 관리합니다</p>
        </div>
        <button onClick={openCreate}
          style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + {tab === "ar" ? "미수금 등록" : "미지급금 등록"}
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button style={tabStyle("ar")} onClick={() => { setTab("ar"); setStatusFilter(""); }}>미수금 (AR)</button>
        <button style={tabStyle("ap")} onClick={() => { setTab("ap"); setStatusFilter(""); }}>미지급금 (AP)</button>
      </div>

      {/* 요약 카드 */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: "전체 건수",  value: `${summary.total_count}건` },
            { label: "총 금액",    value: fmt(summary.total_amount) },
            { label: tab === "ar" ? "미수 잔액" : "미지급 잔액", value: fmt(summary.remaining), highlight: true },
            { label: "연체 건수",  value: `${summary.overdue_count}건`, warn: summary.overdue_count > 0 },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: "var(--bg-surface)", border: `1px solid ${card.warn ? "#FCA5A5" : "var(--border)"}`, borderRadius: "12px", padding: "16px 18px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{card.label}</p>
              <p style={{ fontSize: "20px", fontWeight: 900, color: card.warn ? "#DC2626" : card.highlight ? "var(--accent)" : "var(--text-primary)", lineHeight: 1 }}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 상태</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
          연체만 보기
        </label>
      </div>

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["거래처", "내용", "금액", "수금/지급액", "잔액", "발행일", "만기일", "상태", ""].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                등록된 항목이 없습니다<br />
                <button onClick={openCreate} style={{ marginTop: "12px", padding: "8px 16px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>첫 항목 등록</button>
              </td></tr>
            ) : list.map((item, i) => {
              const sc = STATUS_COLOR[item.status] || { bg: "#F3F4F6", color: "#374151" };
              const overdue = isOverdue(item.due_date, item.status);
              const remaining = parseFloat(item.amount) - parseFloat(item.paid_amount);
              return (
                <tr key={item.id}
                  style={{ borderBottom: i < list.length - 1 ? "1px solid var(--border-subtle)" : "none", backgroundColor: overdue ? "rgba(239,68,68,0.03)" : "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = overdue ? "rgba(239,68,68,0.03)" : "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{item.vendor_name || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                    {overdue && <span style={{ marginRight: "6px", fontSize: "11px", color: "#DC2626", fontWeight: 700 }}>⚠ 연체</span>}
                    {item.title}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-primary)", fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(item.amount)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmt(item.paid_amount)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: remaining > 0 ? "#DC2626" : "#15803D", whiteSpace: "nowrap" }}>{fmt(remaining)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{item.issue_date}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: overdue ? "#DC2626" : "var(--text-muted)", fontWeight: overdue ? 700 : 400 }}>{item.due_date}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <select
                      value={item.status}
                      onChange={e => { e.stopPropagation(); handleStatusChange(item, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      style={{ padding: "4px 8px", borderRadius: "6px", border: sc.border, fontSize: "11px", fontWeight: 700, backgroundColor: sc.bg, color: sc.color, cursor: "pointer" }}>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => openEdit(item)}
                        style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}>수정</button>
                      <button onClick={() => handleDelete(item.id)}
                        style={{ fontSize: "12px", color: "#EF4444", background: "none", border: "1px solid #FCA5A5", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}>삭제</button>
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
                {editing ? "수정" : tab === "ar" ? "미수금 등록" : "미지급금 등록"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {/* 거래처 */}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>거래처</label>
                <select value={form.vendor_id} onChange={e => setForm((p: any) => ({ ...p, vendor_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택 안 함</option>
                  {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>내용 *</label>
                <input value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))}
                  placeholder="거래 내용"
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              {F("amount", "금액 *", "number")}
              {F("paid_amount", tab === "ar" ? "수금액" : "지급액", "number")}
              {F("issue_date", "발행일", "date")}
              {F("due_date", "만기일", "date")}
              {F("status", "상태", "text", statuses)}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>메모</label>
                <textarea value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))} rows={2}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={handleSave} disabled={saving || !form.title || !form.amount || !form.issue_date || !form.due_date}
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
