"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import api from "@/lib/api";
import QuickJournalModal from "../QuickJournalModal";
import { useRole, canWrite } from "@/hooks/useRole";

interface Transaction {
  id: number; date: string; description: string;
  deposit: number; withdrawal: number; category: string | null;
  is_income: boolean; amount: number;
}

const CATS = ["전체", "상품매출", "용역수익", "상품매입", "임차료", "급여", "복리후생비", "광고선전비", "사무용품비", "공과금", "기타"];
const PAGE_SIZE = 10;
type PeriodType = "all" | "daily" | "monthly" | "quarterly" | "halfyear" | "yearly";

const PERIOD_TYPES: { key: PeriodType; label: string }[] = [
  { key: "all",      label: "전체" },
  { key: "daily",    label: "일별" },
  { key: "monthly",  label: "월별" },
  { key: "quarterly",label: "분기별" },
  { key: "halfyear", label: "상 · 하반기" },
  { key: "yearly",   label: "연도별" },
];

function LedgerContent() {
  const role = useRole();
  const searchParams = useSearchParams();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [txType, setTxType] = useState<"all" | "income" | "expense">("all");
  const [cat, setCat] = useState("전체");
  const [showModal, setShowModal] = useState(searchParams.get("new") === "1");

  const [page, setPage] = useState(1);
  const [periodType, setPeriodType] = useState<PeriodType>("all");
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [month, setMonth] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedMonth");
      if (stored) return stored;
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedQ, setSelectedQ] = useState(() => Math.ceil((new Date().getMonth() + 1) / 3));
  const [selectedHalf, setSelectedHalf] = useState<"H1" | "H2">(() => new Date().getMonth() < 6 ? "H1" : "H2");

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/dashboard/recent-transactions?limit=500");
      setTxs(res.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  useEffect(() => {
    const handler = (e: Event) => setMonth((e as CustomEvent<string>).detail);
    window.addEventListener("month-changed", handler);
    return () => window.removeEventListener("month-changed", handler);
  }, []);

  const matchPeriod = (date: string) => {
    switch (periodType) {
      case "all":      return true;
      case "daily":    return date === selectedDay;
      case "monthly":  return date.startsWith(month);
      case "quarterly": {
        const [y, m] = date.split("-").map(Number);
        return y === selectedYear && Math.ceil(m / 3) === selectedQ;
      }
      case "halfyear": {
        const [y, m] = date.split("-").map(Number);
        return y === selectedYear && (selectedHalf === "H1" ? m <= 6 : m > 6);
      }
      case "yearly":   return date.startsWith(String(selectedYear));
    }
  };

  const filtered = txs.filter(t => {
    const matchQ = !q || t.description.includes(q) || (t.category ?? "").includes(q);
    const matchType = txType === "all" || (txType === "income" ? t.is_income : !t.is_income);
    const matchCat = cat === "전체" || t.category === cat;
    return matchPeriod(t.date) && matchQ && matchType && matchCat;
  });

  useEffect(() => { setPage(1); }, [q, txType, cat, periodType, selectedDay, month, selectedYear, selectedQ, selectedHalf]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalIncome  = filtered.filter(t =>  t.is_income).reduce((s, t) => s + t.deposit, 0);
  const totalExpense = filtered.filter(t => !t.is_income).reduce((s, t) => s + t.withdrawal, 0);

  const card: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)" };
  const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "5px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, backgroundColor: a ? "var(--accent)" : "var(--bg-surface-2)", color: a ? "var(--accent-text)" : "var(--text-muted)" });
  const periodBtn = (a: boolean): React.CSSProperties => ({ flex: 1, padding: "5px 0", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, backgroundColor: a ? "var(--accent)" : "transparent", color: a ? "var(--accent-text)" : "var(--text-muted)", transition: "all 0.15s" });
  const navBtn: React.CSSProperties = { background: "none", border: "1px solid var(--border)", borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0 };

  return (
    <>
      {showModal && <QuickJournalModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchTxs(); }} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>회계 장부</h1>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>전체 거래 내역을 조회하고 관리하세요</p>
          </div>
          {canWrite(role) && (
            <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "10px", padding: "10px 18px", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
              <Plus size={15} /> 거래 추가
            </button>
          )}
        </div>

        {/* 요약 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "총 수입", value: totalIncome,  color: "var(--accent)", icon: <TrendingUp size={18} color="var(--accent)" /> },
            { label: "총 지출", value: totalExpense, color: "#EF4444",       icon: <TrendingDown size={18} color="#EF4444" /> },
            { label: "순이익",  value: totalIncome - totalExpense, color: totalIncome >= totalExpense ? "#22C55E" : "#EF4444", icon: null },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                {s.icon}
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{s.label}</span>
              </div>
              <p style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>{Math.abs(Math.round(s.value)).toLocaleString("ko-KR")}원</p>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div style={{ ...card, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* 기간 유형 탭 */}
          <div style={{ display: "flex", gap: "2px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px", padding: "3px" }}>
            {PERIOD_TYPES.map(({ key, label }) => (
              <button key={key} onClick={() => setPeriodType(key)} style={periodBtn(periodType === key)}>{label}</button>
            ))}
          </div>

          {/* 기간 값 선택 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {periodType === "daily" && (
              <input type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)}
                style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 10px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px", cursor: "pointer", outline: "none" }} />
            )}
            {periodType === "monthly" && (
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 10px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px", cursor: "pointer", outline: "none" }} />
            )}
            {(periodType === "quarterly" || periodType === "halfyear" || periodType === "yearly") && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button onClick={() => setSelectedYear(y => y - 1)} style={navBtn}><ChevronLeft size={14} /></button>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", minWidth: "44px", textAlign: "center" }}>{selectedYear}년</span>
                <button onClick={() => setSelectedYear(y => Math.min(y + 1, new Date().getFullYear()))} style={navBtn}><ChevronRight size={14} /></button>
              </div>
            )}
            {periodType === "quarterly" && (
              <div style={{ display: "flex", gap: "4px" }}>
                {[1, 2, 3, 4].map(q => (
                  <button key={q} onClick={() => setSelectedQ(q)} style={tabBtn(selectedQ === q)}>Q{q}</button>
                ))}
              </div>
            )}
            {periodType === "halfyear" && (
              <div style={{ display: "flex", gap: "4px" }}>
                {(["H1", "H2"] as const).map(h => (
                  <button key={h} onClick={() => setSelectedHalf(h)} style={tabBtn(selectedHalf === h)}>
                    {h === "H1" ? "상반기" : "하반기"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

          {/* 기존 필터 */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "200px", backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px" }}>
              <Search size={14} color="var(--text-muted)" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="거래처, 카테고리 검색..." style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "13px", color: "var(--text-primary)" }} />
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {(["all", "income", "expense"] as const).map(t => (
                <button key={t} onClick={() => setTxType(t)} style={tabBtn(txType === t)}>
                  {t === "all" ? "전체" : t === "income" ? "수입" : "지출"}
                </button>
              ))}
            </div>
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 10px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px", cursor: "pointer", outline: "none" }}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{filtered.length}건</span>
          </div>
        </div>

        {/* 거래 목록 */}
        <div style={{ ...card, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                {["날짜", "거래처 / 내용", "카테고리", "수입", "지출"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: h === "수입" || h === "지출" ? "right" : "left", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>거래 내역이 없습니다</td></tr>
              ) : paged.map((tx, i) => {
                const d = new Date(tx.date + "T00:00:00");
                return (
                  <tr key={tx.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {d.getFullYear()}.{String(d.getMonth() + 1).padStart(2, "0")}.{String(d.getDate()).padStart(2, "0")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: tx.is_income ? "var(--accent-light)" : "rgba(239,68,68,0.08)", color: tx.is_income ? "var(--accent)" : "#EF4444", fontSize: "13px", fontWeight: 700, flexShrink: 0, border: tx.is_income ? "1.5px solid #C49A30" : "1.5px solid #C41E1E" }}>
                          {tx.is_income ? "↑" : "↓"}
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{tx.description}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: "11px", backgroundColor: "var(--bg-surface-3)", color: "var(--text-muted)", padding: "3px 8px", borderRadius: "6px" }}>{tx.category ?? "미분류"}</span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "var(--accent)" }}>
                      {tx.is_income ? `+${tx.deposit.toLocaleString("ko-KR")}원` : ""}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "#EF4444" }}>
                      {!tx.is_income ? `-${tx.withdrawal.toLocaleString("ko-KR")}원` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (() => {
            const WINDOW = 5;
            let start = Math.max(1, page - Math.floor(WINDOW / 2));
            const end = Math.min(totalPages, start + WINDOW - 1);
            if (end - start + 1 < WINDOW) start = Math.max(1, end - WINDOW + 1);
            const pageNums = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
              width: "32px", height: "32px", borderRadius: "8px", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              cursor: disabled ? "default" : "pointer", fontSize: "12px", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-text)" : disabled ? "var(--border)" : "var(--text-muted)",
              transition: "all 0.15s", flexShrink: 0,
            });
            return (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setPage(1)} disabled={page === 1} style={btnStyle(false, page === 1)}><ChevronsLeft size={13} /></button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btnStyle(false, page === 1)}><ChevronLeft size={13} /></button>
                {pageNums.map(n => (
                  <button key={n} onClick={() => setPage(n)} style={btnStyle(page === n)}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btnStyle(false, page === totalPages)}><ChevronRight size={13} /></button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={btnStyle(false, page === totalPages)}><ChevronsRight size={13} /></button>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "8px" }}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}건
                </span>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}

export default function LedgerPage() {
  return <Suspense><LedgerContent /></Suspense>;
}
