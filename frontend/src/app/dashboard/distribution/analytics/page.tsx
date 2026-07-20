"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

/* 억/만 단위로 축약 — 대시보드 전반에서 이미 쓰는 표기 규칙과 통일 */
function fmtWon(v: number) {
  const n = Math.round(v);
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString("ko-KR")}만`;
  return n.toLocaleString("ko-KR");
}

/* 축 눈금을 0/1,2,5×10ⁿ 같은 "깔끔한" 값으로 반올림 */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = v / 10 ** exp;
  const step = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return step * 10 ** exp;
}

/* 월별 막대그래프 — Y축 눈금선 + 막대별 hover 툴팁 포함
   (막대 위마다 값을 직접 찍는 대신, 눈금선으로 크기를 가늠하고 정확한 값은 hover로 확인) */
function MonthlyBarChart({
  data, valueKey, labelKey = "month", color = "var(--accent)", fmtValue, fmtAxis, unit,
}: {
  data: any[];
  valueKey: string;
  labelKey?: string;
  color?: string;
  fmtValue: (v: number) => string;
  fmtAxis: (v: number) => string;
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const L = 40, R = 10, T = 14, B = 26;
  const CW = 260, CH = 150;
  const svgW = L + CW + R, svgH = T + CH + B;
  const n = Math.max(data.length, 1);
  const slotW = CW / n;
  const barW = Math.min(Math.max(Math.floor(slotW * 0.5), 8), 24);
  const max = niceMax(Math.max(...data.map(d => d[valueKey] || 0), 1));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({ val: max * r, y: T + CH - r * CH }));
  const bx = (i: number) => L + i * slotW + (slotW - barW) / 2;
  const by = (v: number) => T + CH - (v / max) * CH;
  const bh = (v: number) => Math.max((v / max) * CH, 1);

  if (data.length === 0) {
    return <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "32px 0", textAlign: "center" }}>데이터 없음</p>;
  }

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
        {yTicks.map(({ val, y }) => (
          <g key={val}>
            <line x1={L} x2={L + CW} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={L - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="var(--text-muted)">{fmtAxis(val)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const v = d[valueKey] || 0;
          const isHover = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
              {/* 히트 영역: 막대보다 넓게 잡아 hover가 쉽게 걸리도록 */}
              <rect x={L + i * slotW} y={T} width={slotW} height={CH} fill="transparent" />
              <rect x={bx(i)} y={by(v)} width={barW} height={bh(v)} rx={4}
                fill={color} fillOpacity={isHover ? 1 : 0.75} style={{ transition: "fill-opacity 0.12s" }} />
              <text x={L + i * slotW + slotW / 2} y={T + CH + 18} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
                {d[labelKey]}월
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (() => {
        const d = data[hover];
        const v = d[valueKey] || 0;
        const left = ((bx(hover) + barW / 2) / svgW) * 100;
        const top = (by(v) / svgH) * 100;
        return (
          <div style={{
            position: "absolute", left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -100%)",
            marginTop: "-8px", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "8px", padding: "6px 10px", boxShadow: "var(--shadow-lg)", pointerEvents: "none",
            whiteSpace: "nowrap", zIndex: 10,
          }}>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>{d[labelKey]}월</p>
            <p style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)" }}>{fmtValue(v)}{unit}</p>
          </div>
        );
      })()}
    </div>
  );
}

export default function DistributionAnalyticsPage() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get("/api/distribution/analytics", {
      headers: { "X-Business-Id": bizId() },
    }).catch(() => ({ data: null }));
    setData(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>불러오는 중...</div>;

  const monthly: any[] = data?.monthly_orders ?? [];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>유통 분석</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>배송 완료율, 반품률, 월별 수주 현황을 분석합니다</p>
      </div>

      {/* KPI 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "총 배송건",    value: fmt(data?.total_deliveries) },
          { label: "배송 완료율",  value: `${data?.delivery_rate ?? 0}%` },
          { label: "총 반품건",    value: fmt(data?.total_returns) },
          { label: "반품률",       value: `${data?.return_rate ?? 0}%` },
        ].map(c => (
          <div key={c.label} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "18px 22px" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{c.label}</p>
            <p style={{ fontSize: "26px", fontWeight: 900, color: "var(--text-primary)" }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* 배송 효율 게이지 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>배송 완료율</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { label: "배송 완료율", value: data?.delivery_rate ?? 0, sub: `${data?.completed_deliveries}/${data?.total_deliveries}건`, color: (data?.delivery_rate ?? 0) >= 90 ? "#22C55E" : (data?.delivery_rate ?? 0) >= 70 ? "#F59E0B" : "#EF4444" },
              { label: "반품률",      value: Math.min((data?.return_rate ?? 0) * 5, 100), sub: `반품 ${data?.total_returns}건`, color: (data?.return_rate ?? 0) > 10 ? "#EF4444" : "#22C55E", display: `${data?.return_rate ?? 0}%` },
            ].map(row => (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{row.label}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{row.sub}</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{row.display ?? `${row.value}%`}</span>
                  </div>
                </div>
                <div style={{ height: "8px", backgroundColor: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(row.value, 100)}%`, backgroundColor: row.color, borderRadius: "4px", transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 빠른 현황 */}
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>배송 현황 요약</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "완료",   count: data?.completed_deliveries ?? 0,                                                              color: "#15803D", bg: "rgba(21,128,61,0.12)",  border: "1.5px solid rgba(21,128,61,0.40)" },
              { label: "미완료", count: (data?.total_deliveries ?? 0) - (data?.completed_deliveries ?? 0), color: "#D97706", bg: "rgba(217,119,6,0.12)", border: "1.5px solid rgba(217,119,6,0.40)" },
              { label: "반품",   count: data?.total_returns ?? 0,                                                                   color: "#DC2626", bg: "rgba(220,38,38,0.12)",  border: "1.5px solid rgba(220,38,38,0.40)" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: row.bg, border: row.border, borderRadius: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: row.color }}>{row.label}</span>
                <span style={{ fontSize: "18px", fontWeight: 900, color: row.color }}>{fmt(row.count)}건</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 월별 수주 차트 — 금액(₩)과 건수(건)는 단위가 전혀 달라 막대 하나에 같이 표현하면
          "막대 높이가 금액인지 건수인지" 헷갈리므로, 각자 축을 가진 별개 카드로 분리했다 */}
      {monthly.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>월별 수주 금액</p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "16px" }}>막대에 마우스를 올리면 정확한 금액이 표시됩니다</p>
            <MonthlyBarChart data={monthly} valueKey="amount" fmtValue={v => `₩${fmt(v)}`} fmtAxis={fmtWon} unit="" color="var(--accent)" />
          </div>
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>월별 수주 건수</p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "16px" }}>막대에 마우스를 올리면 정확한 건수가 표시됩니다</p>
            <MonthlyBarChart data={monthly} valueKey="count" fmtValue={v => `${Math.round(v).toLocaleString("ko-KR")}`} fmtAxis={v => `${Math.round(v)}`} unit="건" color="#8B5CF6" />
          </div>
        </div>
      )}

      {monthly.length === 0 && !loading && (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "48px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>수주 데이터가 없습니다. 수주를 등록하면 분석이 표시됩니다</p>
        </div>
      )}
    </div>
  );
}
