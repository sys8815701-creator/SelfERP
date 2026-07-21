"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, MoreVertical, Camera, Zap, Globe,
  CreditCard, BookOpen, DollarSign, Users, Bot, Plus, ArrowRight,
  Send, X, CheckSquare, Square, Loader2, Pencil, Trash2, Check, Lock,
  Sun, Landmark,
} from "lucide-react";
import api from "@/lib/api";
import QuickJournalModal from "./QuickJournalModal";
import Modal, { ModalConfig } from "@/components/Modal";

/* ── 타입 ── */
interface Summary {
  month: string; revenue: number; expense: number; net_income: number;
  vat_estimate: number; vat_period: string; vat_days_until: number;
  revenue_change_pct: number | null; expense_change_pct: number | null;
  net_change_pct: number | null; auto_classified_count: number;
  card_count: number; business_name: string; owner_name: string;
}
interface TrendPoint { month: string; revenue: number; expense: number; }
interface Transaction {
  id: number; date: string; description: string; deposit: number;
  withdrawal: number; category: string | null; is_income: boolean; amount: number;
}
interface CostItem { label: string; amount: number; pct: number; color: string; }
interface VatStatus {
  period: string; deadline: string; days_until: number; progress_pct: number;
  checklist: { label: string; done: boolean }[];
}
interface TodoItem { id: number; text: string; done: boolean; }
interface VatCheckItem { id: number; text: string; done: boolean; }

const DEFAULT_VAT_CHECKLIST: VatCheckItem[] = [
  { id: 1, text: "매출세금계산서 합계 확인", done: false },
  { id: 2, text: "매입세금계산서 합계 확인", done: false },
  { id: 3, text: "신용카드 매출 집계", done: false },
  { id: 4, text: "홈택스 신고서 작성", done: false },
];

/* ── 유틸 ── */
const fmt = (n: number) =>
  `${n >= 0 ? "" : "-"}${Math.abs(Math.round(n)).toLocaleString("ko-KR")}원`;
const fmtPct = (v: number | null, positive_is_up = true) => {
  if (v === null) return null;
  const up = positive_is_up ? v >= 0 : v <= 0;
  return { label: `${v > 0 ? "+" : ""}${v}% 전월 대비`, up };
};
const card: React.CSSProperties = {
  backgroundColor: "var(--bg-surface)", borderRadius: "16px",
  border: "1px solid var(--border)", boxShadow: "var(--shadow)",
};

/* ── SVG 차트 ── */
function LineChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) return null;
  const sales = data.map(d => d.revenue);
  const costs = data.map(d => d.expense);
  const maxVal = Math.max(...sales, ...costs, 1);
  const W = 700; const H = 170; const pl = 8; const pr = 8; const pt = 8; const pb = 18;
  const x = (i: number) => pl + (i / Math.max(data.length - 1, 1)) * (W - pl - pr);
  const y = (v: number) => H - pb - (v / maxVal) * (H - pt - pb);
  const line = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = (arr: number[]) =>
    `${line(arr)} L${x(arr.length - 1).toFixed(1)},${H - pb} L${x(0).toFixed(1)},${H - pb} Z`;
  const months = data.map(d => d.month.slice(5) + "월");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 170 }}>
      <defs>
        <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFBE50" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FFBE50" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area(sales)} fill="url(#gs)" />
      <path d={area(costs)} fill="url(#gc)" />
      <path d={line(sales)} fill="none" stroke="#FFBE50" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={line(costs)} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {months.map((m, i) => (
        <text key={m} x={x(i)} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--text-subtle)">{m}</text>
      ))}
    </svg>
  );
}

/* ── 메인 ── */
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [vat, setVat] = useState<VatStatus | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [txTab, setTxTab] = useState<"all" | "income" | "expense">("all");
  const [chartMonths, setChartMonths] = useState(12);
  const [aiOpen, setAiOpen] = useState(true);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "ai" | "user"; text: string }[]>([
    { role: "ai", text: "안녕하세요! 오늘 사업 현황을 분석해드릴게요. 무엇이든 물어보세요" },
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editTodoText, setEditTodoText] = useState("");
  const [kpiMenuOpen, setKpiMenuOpen] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const getProKey = () => { try { const id = JSON.parse(localStorage.getItem("user") || "{}").id; return id ? `pro_plan_${id}` : "pro_plan"; } catch { return "pro_plan"; } };
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(getProKey()) === "true";
    return false;
  });
  const [vatChecklist, setVatChecklist] = useState<VatCheckItem[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("bk-vat-checklist");
      if (stored) { try { return JSON.parse(stored); } catch { /* fall through */ } }
      localStorage.setItem("bk-vat-checklist", JSON.stringify(DEFAULT_VAT_CHECKLIST));
    }
    return DEFAULT_VAT_CHECKLIST;
  });

  /* URL ?modal=journal 처리 (layout의 거래 추가 버튼) */
  useEffect(() => {
    if (searchParams.get("modal") === "journal") {
      setShowModal(true);
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  /* PRO 플랜 · VAT 체크리스트 동기화 */
  useEffect(() => {
    const handlePro = () => setIsPro(localStorage.getItem(getProKey()) === "true");
    const handleVatChecklist = () => {
      const stored = localStorage.getItem("bk-vat-checklist");
      if (stored) { try { setVatChecklist(JSON.parse(stored)); } catch { /* ignore */ } }
    };
    window.addEventListener("pro-plan-updated", handlePro);
    window.addEventListener("vat-checklist-updated", handleVatChecklist);
    return () => {
      window.removeEventListener("pro-plan-updated", handlePro);
      window.removeEventListener("vat-checklist-updated", handleVatChecklist);
    };
  }, []);

  /* KPI 메뉴 바깥 클릭 시 닫기 */
  useEffect(() => {
    if (!kpiMenuOpen) return;
    const close = () => setKpiMenuOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [kpiMenuOpen]);

  const fetchAll = useCallback(async () => {
    const month = searchParams.get("month");
    const mq = month ? `?month=${month}` : "";
    const mqs = month ? `&month=${month}` : "";
    try {
      const [s, t, txAll, c, v, td] = await Promise.all([
        api.get(`/api/dashboard/summary${mq}`),
        api.get(`/api/dashboard/monthly-trend?months=${chartMonths}`),
        api.get(`/api/dashboard/recent-transactions?limit=20${mqs}`),
        api.get(`/api/dashboard/cost-breakdown${mq}`),
        api.get("/api/dashboard/vat-status"),
        api.get("/api/dashboard/todos"),
      ]);
      setSummary(s.data);
      setTrend(t.data);
      setTransactions(txAll.data);
      setCosts(c.data);
      setVat(v.data);
      setTodos(td.data);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [chartMonths, searchParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* 거래 필터링 */
  const filteredTx = transactions.filter(t => {
    if (txTab === "income") return t.is_income;
    if (txTab === "expense") return !t.is_income;
    return true;
  });

  /* Todo 토글 */
  const toggleTodo = async (id: number) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    try { await api.patch(`/api/dashboard/todos/${id}/toggle`); }
    catch (e: any) {
      setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
      setModal({ message: e?.response?.data?.detail ?? "할 일 상태 변경에 실패했습니다", variant: "error" });
    }
  };

  /* Todo 추가 */
  const addTodo = async () => {
    const text = newTodoText.trim();
    if (!text) return;
    try {
      const res = await api.post("/api/dashboard/todos", { text });
      setTodos(prev => [...prev, res.data]);
      setNewTodoText("");
      setAddingTodo(false);
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail ?? "할 일 추가에 실패했습니다", variant: "error" });
    }
  };

  /* Todo 수정 저장 */
  const saveTodo = async (id: number) => {
    const text = editTodoText.trim();
    if (!text) return;
    try {
      await api.patch(`/api/dashboard/todos/${id}`, { text });
      setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t));
      setEditingTodoId(null);
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail ?? "할 일 수정에 실패했습니다", variant: "error" });
    }
  };

  /* Todo 삭제 */
  const deleteTodo = async (id: number) => {
    try {
      await api.delete(`/api/dashboard/todos/${id}`);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail ?? "할 일 삭제에 실패했습니다", variant: "error" });
    }
  };

  /* AI 질문 */
  const sendAi = async () => {
    const q = aiInput.trim();
    if (!q || aiLoading) return;
    setAiMessages(prev => [...prev, { role: "user", text: q }]);
    setAiInput("");
    setAiLoading(true);
    try {
      const res = await api.post("/api/ai/chat", { message: q });
      setAiMessages(prev => [...prev, { role: "ai", text: res.data.reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "ai", text: "잠시 후 다시 시도해 주세요" }]);
    } finally { setAiLoading(false); }
  };

  const doneCnt = todos.filter(t => t.done).length;

  /* VAT 진행률: PRO면 체크리스트 기반, 아니면 API 기반 */
  const vatDoneCnt = vatChecklist.filter(c => c.done).length;
  const vatProgressPct = isPro && vatChecklist.length > 0
    ? Math.round(vatDoneCnt / vatChecklist.length * 100)
    : vat?.progress_pct ?? 0;

  /* CSV 내보내기 */
  const exportCsv = async () => {
    setKpiMenuOpen(null);
    if (!isPro) {
      setModal({ title: "PRO 플랜 전용", message: "CSV 내보내기 기능은 PRO 플랜에서 제공됩니다.\n지금 업그레이드하고 데이터를 활용하세요", variant: "info", showCancel: true, confirmLabel: "PRO 가입하기", onConfirm: () => router.push("/dashboard/pro") });
      return;
    }
    try {
      const res = await api.get("/api/dashboard/recent-transactions?limit=9999");
      const txs: Transaction[] = res.data;
      const headers = ["날짜", "설명", "카테고리", "유형", "금액"];
      const rows = txs.map(t => [t.date, `"${(t.description || "").replace(/"/g, '""')}"`, t.category ?? "미분류", t.is_income ? "수입" : "지출", t.amount]);
      const csv = "﻿" + [headers, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `거래내역_${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { setModal({ message: "CSV 내보내기에 실패했습니다", variant: "error" }); }
  };
  const now = new Date();

  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("user") || "{}").name || ""; } catch { return ""; }
    }
    return "";
  });
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ name: string }>).detail;
      if (d?.name) setUserName(d.name);
    };
    window.addEventListener("user-updated", h);
    return () => window.removeEventListener("user-updated", h);
  }, []);

  const activeMonthParam = searchParams.get("month");
  const [activeY, activeM] = activeMonthParam
    ? activeMonthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const isCurrentMonth = !activeMonthParam ||
    (activeY === now.getFullYear() && activeM === now.getMonth() + 1);

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontSize: "12px", fontWeight: 600,
    backgroundColor: active ? "var(--accent)" : "transparent",
    color: active ? "var(--accent-text)" : "var(--text-muted)",
  });

  const shortcuts = [
    { icon: Globe,      label: "영수증 OCR",    sub: "영수증 업로드 및 자동 처리",    href: "/dashboard/ocr" },
    { icon: CreditCard, label: "카드 · 은행",    sub: "거래 내역 조회 및 관리",        href: "/dashboard/card" },
    { icon: BookOpen,   label: "자동 장부",      sub: "수입 · 지출 자동 분개",         href: "/dashboard/ledger" },
    { icon: DollarSign, label: "경비 정산",      sub: "경비 신청 및 승인 처리",        href: "/dashboard/expense" },
    { icon: Users,      label: "거래처 · 사업장", sub: "거래처 · 사업장 관리",          href: "/dashboard/business" },
    { icon: Bot,        label: "AI 회계 비서",  sub: "회계 질의 및 AI 분석",          href: "/dashboard/ai" },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: "16px" }}>
        <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>데이터 불러오는 중...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <QuickJournalModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAll(); }}
        />
      )}

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

        {/* ── 왼쪽 메인 ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* 인사 배너 */}
          <div style={{ ...card, padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1.5px solid #C49A30" }}><Sun size={22} color="var(--accent)" /></div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "2px" }}>
                {isCurrentMonth
                  ? `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`
                  : `${activeY}년 ${activeM}월 데이터를 조회 중입니다`}
              </p>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>
                {userName || summary?.owner_name || "사장"}님, 오늘도 화이팅이에요!
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                이번 달{" "}
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>{summary?.auto_classified_count ?? 0}건</span>의 거래가 자동 정리되었어요.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <Link href="/dashboard/ocr"
                style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid var(--border)", borderRadius: "10px", padding: "8px 14px", fontSize: "13px", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", fontWeight: 500, textDecoration: "none" }}>
                <Camera size={14} /> 영수증 업로드
              </Link>
              <button onClick={() => setShowModal(true)}
                style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "10px", padding: "8px 14px", fontSize: "13px", fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(255,190,80,0.3)" }}>
                <Zap size={14} /> 빠른 장부
              </button>
            </div>
          </div>

          {/* KPI 카드 4개 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {[
              { label: "이번 달 매출",     value: fmt(summary?.revenue ?? 0),     trend: fmtPct(summary?.revenue_change_pct ?? null),              Icon: TrendingUp },
              { label: "이번 달 비용",     value: fmt(summary?.expense ?? 0),     trend: fmtPct(summary?.expense_change_pct ?? null, false),       Icon: TrendingDown },
              { label: "예상 순이익",      value: fmt(summary?.net_income ?? 0),  trend: fmtPct(summary?.net_change_pct ?? null),                  Icon: DollarSign },
              { label: "이번 분기 부가세", value: fmt(summary?.vat_estimate ?? 0), badge: `D-${summary?.vat_days_until ?? 0}`, badgeSub: `${summary?.vat_period ?? ""} ${summary?.vat_days_until ?? 0}일 전`, Icon: Landmark },
            ].map((k) => (
              <div key={k.label} style={{ ...card, padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #C49A30" }}><k.Icon size={16} color="var(--accent)" /></div>
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setKpiMenuOpen(prev => prev === k.label ? null : k.label)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)", padding: "2px", borderRadius: "4px" }}>
                      <MoreVertical size={14} />
                    </button>
                    {kpiMenuOpen === k.label && (
                      <div style={{ position: "absolute", top: "100%", right: 0, width: "150px", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "10px", boxShadow: "var(--shadow-lg)", zIndex: 50, overflow: "hidden" }}>
                        {[
                          { label: "상세 보기", action: () => { router.push("/dashboard/ledger"); setKpiMenuOpen(null); } },
                          { label: "CSV 내보내기", action: exportCsv },
                          { label: "새로고침", action: () => { window.location.reload(); setKpiMenuOpen(null); } },
                        ].map(({ label, action }) => (
                          <button key={label} onClick={action} style={{ display: "block", width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>{k.label}</p>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>{k.value}</p>
                {k.trend && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px", fontSize: "12px", fontWeight: 600, color: k.trend.up ? "#22C55E" : "#EF4444" }}>
                    {k.trend.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {k.trend.label}
                  </div>
                )}
                {k.badge && (
                  <div style={{ marginTop: "6px" }}>
                    <span style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", border: "1.5px solid #C49A30" }}>{k.badge}</span>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>{k.badgeSub}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 차트 */}
          <div style={{ ...card, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>매출 vs 비용 추이</h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>단위 원</p>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                {([3, 6, 12] as const).map(m => (
                  <button key={m} onClick={() => setChartMonths(m)} style={tabBtn(chartMonths === m)}>
                    {m === 12 ? "1년" : `${m}개월`}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "16px", margin: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ width: "16px", height: "2px", backgroundColor: "#FFBE50", display: "inline-block", borderRadius: "2px" }} /> 매출
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ width: "16px", height: "2px", backgroundColor: "#EF4444", display: "inline-block", borderRadius: "2px" }} /> 비용
              </div>
            </div>
            <LineChart data={trend} />
          </div>

          {/* 최근 거래 */}
          <div style={{ ...card, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>최근 거래</h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>자동 분류된 거래를 확인해 보세요</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {(["all", "income", "expense"] as const).map(t => (
                  <button key={t} onClick={() => setTxTab(t)} style={tabBtn(txTab === t)}>
                    {t === "all" ? "전체" : t === "income" ? "매출" : "비용"}
                  </button>
                ))}
                <Link href="/dashboard/ledger" style={{ marginLeft: "8px", fontSize: "12px", color: "var(--text-muted)", textDecoration: "none" }}>
                  전체 보기
                </Link>
              </div>
            </div>
            {filteredTx.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px", padding: "24px 0" }}>거래 내역이 없습니다</p>
            ) : (
              filteredTx.slice(0, 8).map((tx, i) => {
                const d = new Date(tx.date + "T00:00:00");
                return (
                  <div key={tx.id}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 12px", borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)", backgroundColor: "var(--tx-row-bg)", borderRadius: i === 0 ? "10px 10px 0 0" : filteredTx.slice(0, 8).length - 1 === i ? "0 0 10px 10px" : "0", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--tx-row-hover-bg)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--tx-row-bg)")}>
                    <div style={{ textAlign: "center", width: "24px", flexShrink: 0 }}>
                      <p style={{ fontSize: "11px", color: "var(--accent)" }}>{String(d.getMonth() + 1).padStart(2, "0")}</p>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>{String(d.getDate()).padStart(2, "0")}</p>
                    </div>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0, backgroundColor: tx.is_income ? "rgba(255,190,80,0.15)" : "rgba(239,68,68,0.12)", color: tx.is_income ? "var(--accent)" : "#EF4444", border: tx.is_income ? "1.5px solid #C49A30" : "1.5px solid #C41E1E" }}>
                      {tx.is_income ? "↑" : "↓"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{tx.category ?? "미분류"}</p>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", flexShrink: 0, backgroundColor: tx.is_income ? "var(--accent-light)" : "rgba(239,68,68,0.08)", color: tx.is_income ? "var(--accent)" : "#EF4444", border: tx.is_income ? "1.5px solid #C49A30" : "1.5px solid #C41E1E" }}>AI 분류</span>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: tx.is_income ? "var(--accent)" : "#EF4444", flexShrink: 0 }}>
                      {tx.is_income ? "+" : "-"}{Math.abs(tx.amount).toLocaleString("ko-KR")}원
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* 바로 가기 */}
          <div style={{ ...card, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>바로 가기</h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>자주 쓰는 기능을 한 번에</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {shortcuts.map(s => {
                const Icon = s.icon;
                return (
                  <Link key={s.label} href={s.href}
                    style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px", padding: "16px", borderRadius: "14px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", cursor: "pointer", textDecoration: "none", transition: "filter 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(0.95)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "none"; }}
                  >
                    <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #C49A30" }}>
                      <Icon size={20} color="var(--accent)" />
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{s.label}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{s.sub}</p>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>바로 가기 →</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-subtle)", paddingBottom: "16px" }}>
            © 2026 SelfERP · 소상공인을 위한 가장 친절한 회계 ERP
          </p>
        </div>

        {/* ── 오른쪽 패널 ── */}
        <div style={{ width: "268px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* 부가세 위젯 */}
          {vat && (
            <div style={{ ...card, padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                <span style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "6px", border: "1.5px solid #C49A30" }}>D-{vat.days_until}</span>
                {isPro && (
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)" }}>{vatProgressPct}%</span>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>준비 완료</p>
                  </div>
                )}
              </div>
              <h3 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>{vat.period} 부가세</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
                {new Date(vat.deadline + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}까지 신고
              </p>
              {isPro && (
                <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-surface-2)", borderRadius: "99px", marginBottom: "14px" }}>
                  <div style={{ width: `${vatProgressPct}%`, height: "100%", backgroundColor: "var(--accent)", borderRadius: "99px" }} />
                </div>
              )}
              {isPro ? (
                vatChecklist.length > 0 ? vatChecklist.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: item.done ? "var(--accent)" : "var(--border)", flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: item.done ? "var(--text-primary)" : "var(--text-muted)" }}>{item.text}</span>
                  </div>
                )) : (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "4px 0 8px" }}>+ 버튼으로 항목을 추가해보세요</p>
                )
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px", marginBottom: "8px", border: "1px solid var(--border)" }}>
                  <Lock size={12} color="var(--text-muted)" />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>PRO 플랜에서 체크리스트 관리</span>
                </div>
              )}
              {isPro ? (
                <button onClick={() => router.push("/dashboard/vat")}
                  style={{ width: "100%", backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "10px", padding: "10px 0", fontSize: "13px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "6px", boxShadow: "0 2px 8px rgba(255,190,80,0.25)" }}>
                  부가세 신고 <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => router.push("/dashboard/pro")}
                  style={{ width: "100%", backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "10px", padding: "10px 0", fontSize: "13px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "6px", boxShadow: "0 2px 8px rgba(255,190,80,0.25)" }}>
                  ✦ PRO 플랜 가입
                </button>
              )}
            </div>
          )}

          {/* 비용 구성 */}
          {costs.length > 0 && (
            <div style={{ ...card, padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>비용 구성</h3>
                <Link href="/dashboard/ledger" style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "none" }}>상세 보기</Link>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>이번 달 카테고리별 지출</p>
              <div style={{ display: "flex", borderRadius: "99px", overflow: "hidden", height: "10px", width: "100%", marginBottom: "14px" }}>
                {costs.map(c => <div key={c.label} style={{ width: `${c.pct}%`, backgroundColor: c.color }} />)}
              </div>
              {costs.map(c => (
                <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: c.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>{c.pct}%</span>
                </div>
              ))}
            </div>
          )}

          {/* 할 일 */}
          <div style={{ ...card, padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>오늘의 할 일</h3>
              <button onClick={() => setAddingTodo(v => !v)}
                style={{ width: "26px", height: "26px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: addingTodo ? "var(--accent)" : "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={13} color={addingTodo ? "var(--accent-text)" : "var(--text-muted)"} />
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>{doneCnt}/{todos.length} 완료</p>

            {addingTodo && (
              <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                <input autoFocus value={newTodoText} onChange={e => setNewTodoText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addTodo(); if (e.key === "Escape") { setAddingTodo(false); setNewTodoText(""); } }}
                  placeholder="할 일 입력 후 Enter"
                  style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", color: "var(--text-primary)", backgroundColor: "var(--bg-surface-2)", outline: "none" }} />
                <button onClick={addTodo}
                  style={{ padding: "6px 10px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                  추가
                </button>
              </div>
            )}

            {todos.map(todo => (
              <div key={todo.id}
                style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "5px 0", borderRadius: "6px" }}
                onMouseEnter={e => { (e.currentTarget.querySelector(".todo-actions") as HTMLElement | null)?.style && ((e.currentTarget.querySelector(".todo-actions") as HTMLElement).style.opacity = "1"); }}
                onMouseLeave={e => { (e.currentTarget.querySelector(".todo-actions") as HTMLElement | null)?.style && ((e.currentTarget.querySelector(".todo-actions") as HTMLElement).style.opacity = "0"); }}>
                {/* 체크박스 */}
                <button onClick={() => toggleTodo(todo.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginTop: "1px" }}>
                  {todo.done
                    ? <CheckSquare size={16} color="var(--accent)" />
                    : <Square size={16} color="var(--text-subtle)" />}
                </button>

                {/* 텍스트 or 수정 입력 */}
                {editingTodoId === todo.id ? (
                  <div style={{ display: "flex", flex: 1, gap: "4px" }}>
                    <input autoFocus value={editTodoText}
                      onChange={e => setEditTodoText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveTodo(todo.id); if (e.key === "Escape") setEditingTodoId(null); }}
                      style={{ flex: 1, border: "1px solid var(--accent)", borderRadius: "6px", padding: "3px 8px", fontSize: "12px", color: "var(--text-primary)", backgroundColor: "var(--bg-surface-2)", outline: "none" }} />
                    <button onClick={() => saveTodo(todo.id)}
                      style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={13} color="var(--accent-text)" />
                    </button>
                    <button onClick={() => setEditingTodoId(null)}
                      style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <X size={13} color="var(--text-muted)" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: "13px", color: todo.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: todo.done ? "line-through" : "none", lineHeight: 1.5 }}>
                      {todo.text}
                    </span>
                    <div className="todo-actions" style={{ display: "flex", gap: "3px", opacity: 0, transition: "opacity 0.15s", flexShrink: 0 }}>
                      <button onClick={() => { setEditingTodoId(todo.id); setEditTodoText(todo.text); }}
                        style={{ width: 22, height: 22, borderRadius: 5, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Pencil size={11} color="var(--text-muted)" />
                      </button>
                      <button onClick={() => deleteTodo(todo.id)}
                        style={{ width: 22, height: 22, borderRadius: 5, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={11} color="#EF4444" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {todos.length === 0 && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
                + 버튼으로 할 일을 추가해보세요
              </p>
            )}
          </div>
        </div>

        {/* ── AI 회계 비서 플로팅 패널 ── */}
        {aiOpen && (
          <div style={{ position: "fixed", bottom: "24px", right: "24px", width: "300px", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", zIndex: 200, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "10px", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bot size={15} color="var(--accent-text)" />
                </div>
                <div>
                  <p style={{ color: "var(--text-primary)", fontSize: "13px", fontWeight: 700 }}>AI 회계 비서</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>무엇이든 물어보세요</p>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={16} color="var(--text-muted)" />
              </button>
            </div>
            <div style={{ padding: "14px 16px", maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {aiMessages.map((m, i) => (
                <div key={i} style={{
                  backgroundColor: m.role === "ai" ? "var(--bg-surface-2)" : "var(--accent-light)",
                  borderRadius: "12px", padding: "10px 12px",
                  border: m.role === "user" ? "1.5px solid #C49A30" : "1px solid var(--border)",
                  marginLeft: m.role === "user" ? "20px" : 0,
                  marginRight: m.role === "ai" ? "20px" : 0,
                }}>
                  <p style={{ color: m.role === "ai" ? "var(--text-secondary)" : "var(--text-primary)", fontSize: "12px", lineHeight: 1.7 }}>{m.text}</p>
                </div>
              ))}
              {aiLoading && (
                <div style={{ backgroundColor: "var(--bg-surface-2)", borderRadius: "12px", padding: "10px 12px", border: "1px solid var(--border)", marginRight: "20px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>답변 생성 중...</p>
                </div>
              )}
              {aiMessages.length <= 1 && (
                ["이번 달 매출이 전월보다 얼마나 늘었어?", "광고비 잘 쓰고 있는 거야?", "부가세 얼마쯤 나올까?"].map(q => (
                  <button key={q} onClick={() => setAiInput(q)}
                    style={{ width: "100%", textAlign: "left", fontSize: "12px", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontWeight: 500 }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700, marginRight: "4px" }}>✦</span>{q}
                  </button>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", padding: "0 16px 14px" }}>
              <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendAi()}
                placeholder="질문을 입력하세요..."
                style={{ flex: 1, backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "10px", padding: "8px 12px", fontSize: "12px", outline: "none" }} />
              <button onClick={sendAi} disabled={aiLoading}
                style={{ width: "34px", height: "34px", backgroundColor: "var(--accent)", border: "none", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, opacity: aiLoading ? 0.6 : 1 }}>
                <Send size={13} color="var(--accent-text)" />
              </button>
            </div>
          </div>
        )}

        {!aiOpen && (
          <button onClick={() => setAiOpen(true)}
            style={{ position: "fixed", bottom: "24px", right: "24px", backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "14px", padding: "10px 18px", fontSize: "13px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 16px rgba(255,190,80,0.3)", zIndex: 200 }}>
            <Bot size={16} color="var(--accent-text)" /> AI 회계 비서
          </button>
        )}
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
    </>
  );
}
