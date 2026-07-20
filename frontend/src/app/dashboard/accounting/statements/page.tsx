"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useRole } from "@/hooks/useRole";

type StmtTab = "income" | "balance" | "cashflow";

function fmt(v: any, unit = "원") {
  const n = parseFloat(String(v ?? 0));
  return n.toLocaleString("ko-KR") + unit;
}

function sign(v: number) {
  if (v > 0) return { color: "#15803D" };
  if (v < 0) return { color: "#DC2626" };
  return { color: "var(--text-primary)" };
}

export default function StatementsPage() {
  const role = useRole();
  const [tab, setTab]       = useState<StmtTab>("income");
  const [year, setYear]     = useState(new Date().getFullYear());
  const [month, setMonth]   = useState<number | null>(null);
  const [income, setIncome] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const h = { "X-Business-Id": bizId() };
    const params: any = { year };
    if (month) params.month = month;
    try {
      const [inc, bal, cf] = await Promise.all([
        api.get("/api/accounting/statements/income",      { params, headers: h }),
        api.get("/api/accounting/statements/balance-sheet", { params: { as_of_date: `${year}-${String(month || 12).padStart(2,"0")}-28` }, headers: h }),
        api.get("/api/accounting/statements/cash-flow",   { params, headers: h }),
      ]);
      setIncome(inc.data);
      setBalance(bal.data);
      setCashflow(cf.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const tabStyle = (t: StmtTab) => ({
    padding: "7px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
    backgroundColor: tab === t ? "var(--bg-surface)" : "transparent",
    color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
    boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
  });

  const Row = ({ label, value, sub, indent = false, bold = false }: any) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span style={{ fontSize: "13px", color: "var(--text-secondary)", paddingLeft: indent ? "16px" : 0, fontWeight: bold ? 700 : 400 }}>
        {sub && <span style={{ fontSize: "11px", color: "var(--text-muted)", marginRight: "6px" }}>{sub}</span>}
        {label}
      </span>
      <span style={{ fontSize: "14px", fontWeight: bold ? 800 : 500, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );

  const Divider = ({ label }: { label: string }) => (
    <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", padding: "14px 0 6px", borderBottom: "2px solid var(--border)", letterSpacing: "0.6px" }}>{label}</p>
  );

  if (role !== "admin") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "10px", color: "var(--text-muted)" }}>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>접근 권한이 없습니다</p>
        <p style={{ fontSize: "13px" }}>재무제표는 사업장 관리자(admin)만 확인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 헤더 */}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>재무제표</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>입출금 데이터를 기반으로 자동 생성됩니다</p>
      </div>

      {/* 탭 + 연/월 선택 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-surface-2)", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
          <button style={tabStyle("income")}  onClick={() => setTab("income")}>손익계산서</button>
          <button style={tabStyle("balance")} onClick={() => setTab("balance")}>대차대조표</button>
          <button style={tabStyle("cashflow")}onClick={() => setTab("cashflow")}>현금흐름표</button>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: "7px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month ?? ""} onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)}
            style={{ padding: "7px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
            <option value="">전체 (연간)</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
          <button onClick={load} style={{ padding: "7px 14px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            조회
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontSize: "13px" }}>계산 중...</div>
      ) : (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", padding: "28px 32px" }}>
          {/* ── 손익계산서 ── */}
          {tab === "income" && income && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>손익계산서</h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{year}년 {month ? `${month}월` : "전체"}</p>
              </div>
              <Divider label="매출 (Revenue)" />
              <Row label="은행 입금 합계"  value={fmt(income.revenue_bank)} indent />
              <Row label="카드 매출 합계"  value={fmt(income.revenue_card)} indent />
              <Row label="매출 합계"        value={fmt(income.revenue)}     bold />
              <Divider label="비용 (Expenses)" />
              <Row label="은행 출금 합계"   value={fmt(income.total_expense)} indent />
              <Row label="총 비용"          value={fmt(income.total_expense)} bold />
              <Divider label="이익 (Profit)" />
              <Row label="영업이익"         value={<span style={sign(income.operating_profit)}>{fmt(income.operating_profit)}</span>} bold />
              <Row label="순이익 (당기순이익)" value={<span style={sign(income.net_income)}>{fmt(income.net_income)}</span>} bold />

              {/* 월별 차트 (연간 시) */}
              {!month && income.monthly && income.monthly.length > 0 && (
                <div style={{ marginTop: "28px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "14px" }}>월별 손익 추이</p>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "120px" }}>
                    {income.monthly.map((m: any) => {
                      const maxVal = Math.max(...income.monthly.map((x: any) => Math.max(x.revenue, x.expense)), 1);
                      const rH = Math.round((m.revenue / maxVal) * 100);
                      const eH = Math.round((m.expense / maxVal) * 100);
                      return (
                        <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                          <div style={{ width: "100%", display: "flex", gap: "2px", alignItems: "flex-end", height: "100px" }}>
                            <div style={{ flex: 1, backgroundColor: "#22C55E", height: `${rH}%`, borderRadius: "3px 3px 0 0", minHeight: "2px" }} title={`매출: ${fmt(m.revenue)}`} />
                            <div style={{ flex: 1, backgroundColor: "#EF4444", height: `${eH}%`, borderRadius: "3px 3px 0 0", minHeight: "2px" }} title={`비용: ${fmt(m.expense)}`} />
                          </div>
                          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{m.month}월</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "10px", height: "10px", backgroundColor: "#22C55E", borderRadius: "2px", display: "inline-block" }} />매출
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "10px", height: "10px", backgroundColor: "#EF4444", borderRadius: "2px", display: "inline-block" }} />비용
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── 대차대조표 ── */}
          {tab === "balance" && balance && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>대차대조표</h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{balance.as_of_date} 기준</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                {/* 자산 */}
                <div>
                  <Divider label="자산 (Assets)" />
                  <Row label="유동자산" value="" bold />
                  <Row label="은행 잔고"   value={fmt(balance.assets?.current?.bank_balance)} indent />
                  <Row label="미수금 잔액" value={fmt(balance.assets?.current?.ar_balance)}   indent />
                  <Row label="유동자산 합계" value={fmt(balance.assets?.current?.total)} bold />
                  <div style={{ borderTop: "2px solid var(--border)", marginTop: "8px", paddingTop: "10px" }}>
                    <Row label="자산 총계" value={fmt(balance.assets?.total)} bold />
                  </div>
                </div>
                {/* 부채 + 자본 */}
                <div>
                  <Divider label="부채 (Liabilities)" />
                  <Row label="유동부채" value="" bold />
                  <Row label="미지급금 잔액" value={fmt(balance.liabilities?.current?.ap_balance)} indent />
                  <Row label="유동부채 합계" value={fmt(balance.liabilities?.current?.total)} bold />
                  <div style={{ borderTop: "2px solid var(--border)", marginTop: "8px", paddingTop: "10px" }}>
                    <Row label="부채 총계" value={fmt(balance.liabilities?.total)} bold />
                  </div>
                  <div style={{ marginTop: "20px" }}>
                    <Divider label="자본 (Equity)" />
                    <Row label="자본 총계" value={<span style={sign(balance.equity?.total)}>{fmt(balance.equity?.total)}</span>} bold />
                  </div>
                </div>
              </div>
              {balance.check === false && (
                <p style={{ marginTop: "12px", fontSize: "11px", color: "#F59E0B" }}>⚠ 자산 ≠ 부채 + 자본 (데이터 불일치)</p>
              )}
            </>
          )}

          {/* ── 현금흐름표 ── */}
          {tab === "cashflow" && cashflow && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>현금흐름표</h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{year}년 {month ? `${month}월` : "전체"}</p>
              </div>
              <Row label="총 유입 (입금)"   value={fmt(cashflow.total_inflow)}  bold />
              <Row label="총 유출 (출금)"   value={fmt(cashflow.total_outflow)} bold />
              <Row label="순 현금흐름"      value={<span style={sign(cashflow.net_cash_flow)}>{fmt(cashflow.net_cash_flow)}</span>} bold />

              {cashflow.monthly && cashflow.monthly.length > 0 && (
                <div style={{ marginTop: "24px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "12px" }}>월별 현금흐름</p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--bg-surface-2)" }}>
                          {["월", "유입 (입금)", "유출 (출금)", "순 현금흐름"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-muted)", fontWeight: 700, fontSize: "11px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cashflow.monthly.map((m: any) => (
                          <tr key={m.month} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{m.month}월</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-primary)" }}>{fmt(m.inflow)}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-primary)" }}>{fmt(m.outflow)}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, ...sign(m.net) }}>{fmt(m.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
