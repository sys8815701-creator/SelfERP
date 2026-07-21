"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { useRole, canWrite, canDelete } from "@/hooks/useRole";

const ITEMS_PAGE_SIZE = 5;
const MONTHLY_PAGE_SIZE = 5;

const DEFAULT_CATEGORIES = [
  "매출", "카드매출", "기타수입",
  "인건비", "임차료", "광고비", "통신비", "소모품비", "교통비", "식비", "기타경비",
];

function fmt(v: any) {
  const n = parseFloat(String(v ?? 0));
  if (isNaN(n)) return "—";
  return n.toLocaleString("ko-KR") + "원";
}

function pct(actual: number, budget: number) {
  if (!budget) return null;
  return Math.round((actual / budget) * 100);
}

function RateBar({ rate, btype }: { rate: number | null; btype: string }) {
  if (rate === null) return <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>예산미설정</span>;
  const capped = Math.min(rate, 150);
  const color = btype === "revenue"
    ? rate >= 100 ? "#22C55E" : "#F59E0B"
    : rate >= 100 ? "#EF4444" : "#22C55E";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ flex: 1, height: "6px", backgroundColor: "var(--bg-surface-3)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${capped}%`, height: "100%", backgroundColor: color, borderRadius: "3px", transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: "11px", fontWeight: 700, color, minWidth: "40px" }}>{rate}%</span>
    </div>
  );
}

export default function BudgetPage() {
  const role = useRole();
  const [year, setYear]   = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm]           = useState({ budget_year: year, budget_month: 1, category: "", btype: "expense", amount: "", note: "" });
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState<ModalConfig | null>(null);
  const [itemsPage, setItemsPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const h = { "X-Business-Id": bizId() };
    const params: any = { year };
    if (month) params.month = month;
    try {
      const res = await api.get("/api/accounting/budget/vs-actual", { params, headers: h });
      setData(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setItemsPage(1); setMonthlyPage(1); }, [year, month]);

  const openCreate = (m?: number) => {
    setEditingId(null);
    setForm({ budget_year: year, budget_month: m || month || 1, category: "", btype: "expense", amount: "", note: "" });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      budget_year: item.budget_year, budget_month: item.budget_month,
      category: item.category, btype: item.btype,
      amount: String(item.amount), note: item.note || "",
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.category || !form.amount) return;
    setModal({
      title: editingId ? "예산 수정" : "예산 항목 등록", variant: "info", showCancel: true,
      confirmLabel: editingId ? "수정" : "등록",
      message: editingId ? "예산 항목을 수정하시겠습니까?" : "예산 항목을 등록하시겠습니까?",
      onConfirm: async () => {
        setSaving(true);
        try {
          const h = { "X-Business-Id": bizId() };
          const body = { ...form, amount: parseFloat(form.amount) };
          if (editingId) {
            await api.put(`/api/accounting/budget/${editingId}`, { amount: body.amount, note: body.note }, { headers: h });
          } else {
            await api.post("/api/accounting/budget/", body, { headers: h });
          }
          setShowModal(false);
          await load();
        } catch (e: any) {
          setModal({ message: e?.response?.data?.detail ?? "저장에 실패했습니다", variant: "error" });
        }
        finally { setSaving(false); }
      },
    });
  };

  const handleDelete = (id: number) => {
    setModal({ title: "삭제 확인", message: "예산 항목을 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        try {
          await api.delete(`/api/accounting/budget/${id}`, { headers: { "X-Business-Id": bizId() } });
          await load();
        } catch (e: any) {
          setModal({ message: e?.response?.data?.detail ?? "삭제에 실패했습니다.", variant: "error" });
        }
      } });
  };

  const monthly = data?.monthly || [];
  const items   = data?.items   || [];

  const itemsTotalPages = Math.max(1, Math.ceil(items.length / ITEMS_PAGE_SIZE));
  const pagedItems = items.slice((itemsPage - 1) * ITEMS_PAGE_SIZE, itemsPage * ITEMS_PAGE_SIZE);

  const monthlyTotalPages = Math.max(1, Math.ceil(monthly.length / MONTHLY_PAGE_SIZE));
  const pagedMonthly = monthly.slice((monthlyPage - 1) * MONTHLY_PAGE_SIZE, monthlyPage * MONTHLY_PAGE_SIZE);

  const pageNumsFor = (page: number, totalPages: number) => {
    const WINDOW = 5;
    let start = Math.max(1, page - Math.floor(WINDOW / 2));
    const end = Math.min(totalPages, start + WINDOW - 1);
    if (end - start + 1 < WINDOW) start = Math.max(1, end - WINDOW + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const pageBtnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    width: "32px", height: "32px", borderRadius: "8px", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    cursor: disabled ? "default" : "pointer", fontSize: "12px", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: active ? "var(--accent)" : "transparent",
    color: active ? "var(--accent-text)" : disabled ? "var(--border)" : "var(--text-muted)",
    transition: "all 0.15s", flexShrink: 0,
  });

  const totalBudgetRevenue = items.filter((b: any) => b.btype === "revenue").reduce((s: number, b: any) => s + parseFloat(b.amount), 0);
  const totalBudgetExpense = items.filter((b: any) => b.btype === "expense").reduce((s: number, b: any) => s + parseFloat(b.amount), 0);
  const totalActualRevenue = monthly.reduce((s: number, m: any) => s + m.actual_revenue, 0);
  const totalActualExpense = monthly.reduce((s: number, m: any) => s + m.actual_expense, 0);

  return (
    <div style={{ width: "100%" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>예산 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>월별 예산을 설정하고 실적과 비교합니다</p>
        </div>
        {canWrite(role) && (
          <button onClick={() => openCreate()}
            style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            + 예산 항목 등록
          </button>
        )}
      </div>

      {/* 연/월 선택 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month ?? ""} onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 (연간)</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
        <button onClick={load}
          style={{ padding: "8px 14px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          조회
        </button>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "예산 매출",  value: fmt(totalBudgetRevenue) },
          { label: "실적 매출",  value: fmt(totalActualRevenue), rate: pct(totalActualRevenue, totalBudgetRevenue), btype: "revenue" },
          { label: "예산 지출",  value: fmt(totalBudgetExpense) },
          { label: "실적 지출",  value: fmt(totalActualExpense), rate: pct(totalActualExpense, totalBudgetExpense), btype: "expense" },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 18px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{card.label}</p>
            <p style={{ fontSize: "18px", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1, marginBottom: "8px" }}>{card.value}</p>
            {(card as any).rate !== undefined && <RateBar rate={(card as any).rate} btype={(card as any).btype} />}
          </div>
        ))}
      </div>

      {/* 월별 예산 vs 실적 */}
      {!loading && monthly.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", marginBottom: "24px" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>월별 예산 vs 실적</p>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{monthly.length}개월</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-surface-2)" }}>
                {["월", "예산 매출", "실적 매출", "달성률", "예산 지출", "실적 지출", "달성률"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "right", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedMonthly.map((m: any) => (
                <tr key={m.month} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "11px 14px", fontSize: "13px", color: "var(--text-secondary)", textAlign: "right" }}>{m.month}월</td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", textAlign: "right", color: "var(--text-muted)" }}>{fmt(m.budget_revenue)}</td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", textAlign: "right", color: "var(--text-primary)", fontWeight: 600 }}>{fmt(m.actual_revenue)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", minWidth: "100px" }}><RateBar rate={m.revenue_rate} btype="revenue" /></td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", textAlign: "right", color: "var(--text-muted)" }}>{fmt(m.budget_expense)}</td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", textAlign: "right", color: "var(--text-primary)", fontWeight: 600 }}>{fmt(m.actual_expense)}</td>
                  <td style={{ padding: "11px 14px", textAlign: "right", minWidth: "100px" }}><RateBar rate={m.expense_rate} btype="expense" /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {monthlyTotalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setMonthlyPage(1)} disabled={monthlyPage === 1} style={pageBtnStyle(false, monthlyPage === 1)}><ChevronsLeft size={13} /></button>
              <button onClick={() => setMonthlyPage(p => Math.max(1, p - 1))} disabled={monthlyPage === 1} style={pageBtnStyle(false, monthlyPage === 1)}><ChevronLeft size={13} /></button>
              {pageNumsFor(monthlyPage, monthlyTotalPages).map(n => (
                <button key={n} onClick={() => setMonthlyPage(n)} style={pageBtnStyle(monthlyPage === n)}>{n}</button>
              ))}
              <button onClick={() => setMonthlyPage(p => Math.min(monthlyTotalPages, p + 1))} disabled={monthlyPage === monthlyTotalPages} style={pageBtnStyle(false, monthlyPage === monthlyTotalPages)}><ChevronRight size={13} /></button>
              <button onClick={() => setMonthlyPage(monthlyTotalPages)} disabled={monthlyPage === monthlyTotalPages} style={pageBtnStyle(false, monthlyPage === monthlyTotalPages)}><ChevronsRight size={13} /></button>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "8px" }}>
                {(monthlyPage - 1) * MONTHLY_PAGE_SIZE + 1}–{Math.min(monthlyPage * MONTHLY_PAGE_SIZE, monthly.length)} / {monthly.length}개월
              </span>
            </div>
          )}
        </div>
      )}

      {/* 예산 항목 목록 */}
      {items.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>예산 항목</p>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>총 {items.length}건</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-surface-2)" }}>
                {["월", "구분", "항목", "예산 금액", "메모", ...(canWrite(role) ? [""] : [])].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((b: any, i: number) => (
                <tr key={b.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "11px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{b.budget_month}월</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px",
                      backgroundColor: b.btype === "revenue" ? "rgba(21,128,61,0.12)" : "rgba(220,38,38,0.12)",
                      border: b.btype === "revenue" ? "1px solid rgba(21,128,61,0.40)" : "1px solid rgba(220,38,38,0.40)",
                      color: b.btype === "revenue" ? "#15803D" : "#DC2626" }}>
                      {b.btype === "revenue" ? "수입" : "지출"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{b.category}</td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{fmt(b.amount)}</td>
                  <td style={{ padding: "11px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{b.note || "—"}</td>
                  {canWrite(role) && (
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => openEdit(b)}
                          style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}>수정</button>
                        {canDelete(role) && (
                          <button onClick={() => handleDelete(b.id)}
                            style={{ fontSize: "12px", color: "#DC2626", backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.40)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}>삭제</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {itemsTotalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setItemsPage(1)} disabled={itemsPage === 1} style={pageBtnStyle(false, itemsPage === 1)}><ChevronsLeft size={13} /></button>
              <button onClick={() => setItemsPage(p => Math.max(1, p - 1))} disabled={itemsPage === 1} style={pageBtnStyle(false, itemsPage === 1)}><ChevronLeft size={13} /></button>
              {pageNumsFor(itemsPage, itemsTotalPages).map(n => (
                <button key={n} onClick={() => setItemsPage(n)} style={pageBtnStyle(itemsPage === n)}>{n}</button>
              ))}
              <button onClick={() => setItemsPage(p => Math.min(itemsTotalPages, p + 1))} disabled={itemsPage === itemsTotalPages} style={pageBtnStyle(false, itemsPage === itemsTotalPages)}><ChevronRight size={13} /></button>
              <button onClick={() => setItemsPage(itemsTotalPages)} disabled={itemsPage === itemsTotalPages} style={pageBtnStyle(false, itemsPage === itemsTotalPages)}><ChevronsRight size={13} /></button>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "8px" }}>
                {(itemsPage - 1) * ITEMS_PAGE_SIZE + 1}–{Math.min(itemsPage * ITEMS_PAGE_SIZE, items.length)} / {items.length}건
              </span>
            </div>
          )}
        </div>
      )}

      {!loading && items.length === 0 && monthly.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "280px", textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "13px" }}>
          설정된 예산이 없습니다<br />
          {canWrite(role) && (
            <button onClick={() => openCreate()} style={{ marginTop: "12px", padding: "8px 16px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              첫 예산 항목 등록
            </button>
          )}
        </div>
      )}

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {/* 등록/수정 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "480px", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>
                {editingId ? "예산 수정" : "예산 항목 등록"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {!editingId && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>연도</label>
                    <select value={form.budget_year} onChange={e => setForm(p => ({ ...p, budget_year: Number(e.target.value) }))}
                      style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                      {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>월</label>
                    <select value={form.budget_month} onChange={e => setForm(p => ({ ...p, budget_month: Number(e.target.value) }))}
                      style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                      {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>구분</label>
                    <select value={form.btype} onChange={e => setForm(p => ({ ...p, btype: e.target.value }))}
                      style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                      <option value="revenue">수입</option>
                      <option value="expense">지출</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>항목</label>
                    <input list="cat-list" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="항목명 입력 또는 선택"
                      style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                    <datalist id="cat-list">
                      {DEFAULT_CATEGORIES.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </>
              )}
              <div style={{ gridColumn: editingId ? "1 / -1" : "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>예산 금액 *</label>
                <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>메모</label>
                <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={handleSave} disabled={saving || !form.amount || (!editingId && !form.category)}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : editingId ? "수정 완료" : "등록"}
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
