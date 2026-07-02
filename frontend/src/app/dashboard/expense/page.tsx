"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { addNotif } from "@/lib/notif";

interface Expense { id: number; title: string; amount: number; category: string; status: string; requested_at: string; }

const CATS = ["식비", "교통비", "사무용품", "통신비", "소모품비", "접대비", "교육비", "기타"];

export default function ExpensePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "식비" });
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [month, setMonth] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedMonth");
      if (stored) return stored;
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get("/api/expense/"); setExpenses(res.data); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  useEffect(() => {
    const handler = (e: Event) => setMonth((e as CustomEvent<string>).detail);
    window.addEventListener("month-changed", handler);
    return () => window.removeEventListener("month-changed", handler);
  }, []);

  const submit = () => {
    if (!form.title || !form.amount) return;
    setModal({
      title: "경비 신청",
      message: `[${form.category}] ${form.title}\n금액: ${Number(form.amount.replace(/,/g, "")).toLocaleString("ko-KR")}원\n\n위 내용으로 경비를 신청하시겠습니까?`,
      variant: "info",
      showCancel: true,
      confirmLabel: "신청하기",
      onConfirm: async () => {
        setSubmitting(true);
        try {
          const expAmt = parseFloat(form.amount.replace(/,/g, ""));
          await api.post("/api/expense/", { title: form.title, amount: expAmt, category: form.category });
          addNotif(`경비 정산 신청 — ${form.title} ₩${Math.round(expAmt).toLocaleString("ko-KR")}`, "/dashboard/expense", "#f97316");
          setForm({ title: "", amount: "", category: "식비" });
          setShowForm(false);
          fetchExpenses();
        } catch (e: any) { setModal({ message: e?.response?.data?.detail ?? "오류가 발생했습니다.", variant: "error" }); }
        finally { setSubmitting(false); }
      },
    });
  };

  const approve = async (id: number) => {
    try { await api.patch(`/api/expense/${id}/approve`); fetchExpenses(); }
    catch (e: any) { setModal({ message: e?.response?.data?.detail ?? "승인 실패", variant: "error" }); }
  };

  const reject = async (id: number) => {
    try { await api.patch(`/api/expense/${id}/reject`); fetchExpenses(); }
    catch (e: any) { setModal({ message: e?.response?.data?.detail ?? "반려 실패", variant: "error" }); }
  };

  const monthExpenses = expenses.filter(e => e.requested_at?.startsWith(month));
  const pending = monthExpenses.filter(e => e.status === "pending");
  const approved = monthExpenses.filter(e => e.status === "approved");
  const totalApproved = approved.reduce((s, e) => s + Number(e.amount), 0);

  const card: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)" };

  const StatusBadge = ({ s }: { s: string }) => {
    const map: Record<string, { label: string; color: string; bg: string; icon: any }> = {
      pending: { label: "대기", color: "#f97316", bg: "rgba(249,115,22,0.1)", icon: <Clock size={12} /> },
      approved: { label: "승인", color: "#22C55E", bg: "rgba(34,197,94,0.1)", icon: <CheckCircle size={12} /> },
      rejected: { label: "반려", color: "#EF4444", bg: "rgba(239,68,68,0.1)", icon: <XCircle size={12} /> },
    };
    const m = map[s] ?? map["pending"];
    return <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: m.color, backgroundColor: m.bg, padding: "3px 8px", borderRadius: "6px" }}>{m.icon}{m.label}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>경비 정산</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>직원 경비 신청을 관리하세요</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "10px", padding: "10px 18px", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
          <Plus size={15} /> 경비 신청
        </button>
      </div>

      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "대기 중", count: pending.length, color: "#f97316" },
          { label: "승인됨", count: approved.length, color: "#22C55E" },
          { label: "총 승인 금액", count: totalApproved, color: "var(--accent)", isAmount: true },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: "16px" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "6px" }}>{s.label}</p>
            <p style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>
              {s.isAmount ? `${Math.round(s.count).toLocaleString("ko-KR")}원` : `${s.count}건`}
            </p>
          </div>
        ))}
      </div>

      {/* 신청 폼 */}
      {showForm && (
        <div style={{ ...card, padding: "20px" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>경비 신청</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            {[
              { label: "제목", key: "title", type: "text", placeholder: "예: 팀 식사비" },
              { label: "금액 (원)", key: "amount", type: "text", placeholder: "50,000" },
            ].map(f => (
              <div key={f.key}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>{f.label}</p>
                <input
                  type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>카테고리</p>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", outline: "none", cursor: "pointer" }}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={submit} disabled={submitting} style={{ flex: 1, backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              {submitting ? "처리 중..." : "신청하기"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ backgroundColor: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", cursor: "pointer" }}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* 경비 목록 */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>경비 내역 ({monthExpenses.length}건)</p>
        </div>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>불러오는 중...</div>
        ) : monthExpenses.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>등록된 경비가 없습니다</p>
            <p style={{ fontSize: "13px" }}>경비 신청 버튼을 눌러 첫 번째 경비를 등록해보세요</p>
          </div>
        ) : monthExpenses.map((exp, i) => {
          const d = new Date(exp.requested_at);
          return (
            <div key={exp.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{exp.title}</span>
                  <StatusBadge s={exp.status} />
                  <span style={{ fontSize: "11px", backgroundColor: "var(--bg-surface-3)", color: "var(--text-muted)", padding: "2px 6px", borderRadius: "5px" }}>{exp.category}</span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>신청일: {d.getFullYear()}.{String(d.getMonth() + 1).padStart(2, "0")}.{String(d.getDate()).padStart(2, "0")}</p>
              </div>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>{Number(exp.amount).toLocaleString("ko-KR")}원</span>
              {exp.status !== "draft" && (() => {
                const isApproved = exp.status === "approved";
                const isRejected = exp.status === "rejected";
                return (
                  <div style={{ display: "flex", gap: "6px" }}>
                    {/* 확인 버튼: approved면 선택됨(비활성), 아니면 클릭 가능 */}
                    <button
                      onClick={isApproved ? undefined : () => approve(exp.id)}
                      disabled={isApproved}
                      style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        backgroundColor: isApproved ? "#22C55E" : "rgba(34,197,94,0.1)",
                        color: isApproved ? "#fff" : "#22C55E",
                        border: isApproved ? "none" : "none",
                        borderRadius: "7px", padding: "6px 12px",
                        fontSize: "12px", fontWeight: 700,
                        cursor: isApproved ? "default" : "pointer",
                        opacity: isApproved ? 0.75 : 1,
                        transition: "all 0.15s",
                      }}>
                      <CheckCircle size={13} /> 확인
                    </button>
                    {/* 반려 버튼: rejected면 선택됨(비활성), 아니면 클릭 가능 */}
                    <button
                      onClick={isRejected ? undefined : () => reject(exp.id)}
                      disabled={isRejected}
                      style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        backgroundColor: isRejected ? "#EF4444" : "rgba(239,68,68,0.08)",
                        color: isRejected ? "#fff" : "#EF4444",
                        border: "none",
                        borderRadius: "7px", padding: "6px 12px",
                        fontSize: "12px", fontWeight: 700,
                        cursor: isRejected ? "default" : "pointer",
                        opacity: isRejected ? 0.75 : 1,
                        transition: "all 0.15s",
                      }}>
                      <XCircle size={13} /> 반려
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
