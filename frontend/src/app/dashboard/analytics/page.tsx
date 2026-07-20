"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, BarChart2, Table2 } from "lucide-react";
import api from "@/lib/api";

interface MonthlyData  { month: string; revenue: number; expense: number; }
interface CostItem     { label: string; amount: number; pct: number; color: string; }
interface Summary {
  revenue: number; expense: number; net_income: number;
  revenue_change_pct: number | null;
  expense_change_pct: number | null;
  net_change_pct: number | null;
}

const fmtMoney = (v: number) => Math.round(Math.abs(v)).toLocaleString("ko-KR") + "원";
const fmtYAxis = (v: number) =>
  v >= 1e8 ? `${(v / 1e8).toFixed(1)}억` :
  v >= 1e4 ? `${Math.round(v / 1e4)}만` : v > 0 ? "<1만" : "0";

function PctBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>이전 데이터 없음</span>;
  const up = pct >= 0;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", color: up ? "#22C55E" : "#EF4444", fontWeight: 600 }}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      전월 대비 {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function AnalyticsPage() {
  const [trend, setTrend]   = useState<MonthlyData[]>([]);
  const [costs, setCosts]   = useState<CostItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]     = useState<"chart" | "table">("chart");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tRes, cRes, sRes] = await Promise.all([
          api.get("/api/dashboard/monthly-trend?months=12"),
          api.get("/api/dashboard/cost-breakdown"),
          api.get("/api/dashboard/summary"),
        ]);
        setTrend(tRes.data);
        setCosts(cRes.data);
        setSummary(sRes.data);
      } finally { setLoading(false); }
    })();
  }, []);

  const card: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    boxShadow: "var(--shadow)",
  };

  /* ── SVG 차트 계산 ── */
  const maxVal = trend.length
    ? Math.max(...trend.map(m => Math.max(m.revenue, m.expense)), 1)
    : 1;
  const L = 54, R = 10, T = 16, B = 36;
  const CW = 720, CH = 200;
  const svgW = L + CW + R, svgH = T + CH + B;
  const n = trend.length || 12;
  const slotW = CW / n;
  const barW  = Math.max(Math.floor(slotW * 0.28), 5);

  const bX = (i: number, rev: boolean) => {
    const gap = 3;
    const total = barW * 2 + gap;
    const pad   = (slotW - total) / 2;
    return L + i * slotW + pad + (rev ? 0 : barW + gap);
  };
  const bY = (v: number) => T + CH - (v / maxVal) * CH;
  const bH = (v: number) => Math.max((v / maxVal) * CH, 0);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({
    val: maxVal * r,
    y: T + CH - r * CH,
  }));

  const profitMargin =
    summary && summary.revenue > 0
      ? (summary.net_income / summary.revenue) * 100
      : 0;

  if (loading)
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>불러오는 중...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 헤더 */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>경영 분석</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
          월별 수익 · 비용 현황과 비용 구조를 한눈에 파악하세요
        </p>
      </div>

      {/* KPI 카드 */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {(
            [
              { label: "이번 달 매출",   value: summary.revenue,    pct: summary.revenue_change_pct,  positive: true  },
              { label: "이번 달 비용",   value: summary.expense,    pct: summary.expense_change_pct,  positive: false },
              { label: "순이익",         value: summary.net_income, pct: summary.net_change_pct,      positive: summary.net_income >= 0 },
              { label: "순이익률",       value: profitMargin,       pct: null,                        isPercent: true },
            ] as Array<{ label: string; value: number; pct: number | null; positive: boolean; isPercent?: boolean }>
          ).map(({ label, value, pct, positive, isPercent }) => (
            <div key={label} style={{ ...card, padding: "18px" }}>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>{label}</p>
              <p style={{
                fontSize: "21px", fontWeight: 800, marginBottom: "6px",
                color: isPercent
                  ? (profitMargin >= 0 ? "var(--accent)" : "#EF4444")
                  : positive ? "var(--accent)" : "var(--text-primary)",
              }}>
                {isPercent ? `${profitMargin.toFixed(1)}%` : (value < 0 ? "-" : "") + fmtMoney(value)}
              </p>
              <PctBadge pct={pct} />
            </div>
          ))}
        </div>
      )}

      {/* 월별 추이 */}
      <div style={{ ...card, padding: "20px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
            월별 매출 · 비용 추이 (12개월)
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* 범례 */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {[{ color: "var(--accent)", label: "매출" }, { color: "#EF4444", label: "비용" }].map(({ color, label }) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text-muted)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, display: "inline-block" }} />
                  {label}
                </span>
              ))}
            </div>
            {/* 보기 전환 */}
            <div style={{ display: "flex", gap: "2px", backgroundColor: "var(--bg-surface-2)", borderRadius: "9px", padding: "3px" }}>
              {(["chart", "table"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "4px 10px", borderRadius: "7px", border: "none", cursor: "pointer",
                  fontSize: "11px", fontWeight: 600,
                  backgroundColor: view === v ? "var(--bg-surface)" : "transparent",
                  color: view === v ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: view === v ? "var(--shadow)" : "none",
                  display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s",
                }}>
                  {v === "chart" ? <BarChart2 size={11} /> : <Table2 size={11} />}
                  {v === "chart" ? "차트" : "표"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "chart" ? (
          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block" }}>
            {/* Y축 그리드 */}
            {yTicks.map(({ val, y }) => (
              <g key={val}>
                <line x1={L} x2={L + CW} y1={y} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                <text x={L - 5} y={y + 3.5} textAnchor="end" fontSize={9} fill="var(--text-muted)">
                  {fmtYAxis(val)}
                </text>
              </g>
            ))}
            {/* 바 + 레이블 */}
            {trend.map((m, i) => (
              <g key={m.month}>
                <rect x={bX(i, true)} y={bY(m.revenue)} width={barW} height={bH(m.revenue)} rx={2} fill="var(--accent)" fillOpacity={0.85} />
                <rect x={bX(i, false)} y={bY(m.expense)} width={barW} height={bH(m.expense)} rx={2} fill="#EF4444" fillOpacity={0.7} />
                <text
                  x={L + i * slotW + slotW / 2} y={T + CH + 22}
                  textAnchor="middle" fontSize={9} fill="var(--text-muted)">
                  {m.month.slice(5)}월
                </text>
              </g>
            ))}
            {trend.length === 0 && (
              <text x={svgW / 2} y={svgH / 2} textAnchor="middle" fill="var(--text-muted)" fontSize={13}>
                거래 데이터가 없습니다
              </text>
            )}
          </svg>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-surface-2)" }}>
                  {["월", "매출", "비용", "순이익", "마진율"].map((h, idx) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: idx === 0 ? "left" : "right", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...trend].reverse().map(m => {
                  const net    = m.revenue - m.expense;
                  const margin = m.revenue > 0 ? (net / m.revenue) * 100 : 0;
                  return (
                    <tr key={m.month} style={{ borderTop: "1px solid var(--border-subtle)" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                      <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{m.month}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "13px", color: "var(--accent)", fontWeight: 600 }}>
                        {Math.round(m.revenue).toLocaleString("ko-KR")}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "13px", color: "#EF4444" }}>
                        {Math.round(m.expense).toLocaleString("ko-KR")}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: net >= 0 ? "#22C55E" : "#EF4444" }}>
                        {net < 0 ? "-" : ""}{Math.round(Math.abs(net)).toLocaleString("ko-KR")}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontSize: "13px", color: margin >= 0 ? "#22C55E" : "#EF4444" }}>
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 비용 구성 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={{ ...card, padding: "20px" }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
            이번 달 비용 구성
          </p>
          {costs.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "160px" }}>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>비용 데이터가 없습니다</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {costs.map(c => (
                <div key={c.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{c.label}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {Math.round(c.amount).toLocaleString("ko-KR")}원
                      <span style={{ color: c.color, fontWeight: 700, marginLeft: "6px" }}>({c.pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height: "8px", backgroundColor: "var(--bg-surface-3)", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${c.pct}%`, backgroundColor: c.color, borderRadius: "99px", transition: "width 0.6s" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 수익성 요약 */}
        {summary && (
          <div style={{ ...card, padding: "20px" }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>
              수익성 요약
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "총 매출",    value: summary.revenue,    color: "var(--accent)" },
                { label: "총 비용",    value: summary.expense,    color: "#EF4444" },
                { label: "순이익",     value: summary.net_income, color: summary.net_income >= 0 ? "#22C55E" : "#EF4444" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontSize: "14px", fontWeight: 800, color }}>{fmtMoney(value)}</span>
                </div>
              ))}
              <div style={{ padding: "12px 14px", backgroundColor: "var(--accent-light)", borderRadius: "10px", border: "1.5px solid #C49A30" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>순이익률</span>
                  <span style={{ fontSize: "18px", fontWeight: 900, color: "var(--accent)" }}>{profitMargin.toFixed(1)}%</span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {profitMargin >= 20 ? "우수한 수익성입니다 ✓" : profitMargin >= 10 ? "양호한 수익성입니다" : "비용 절감이 필요합니다"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
