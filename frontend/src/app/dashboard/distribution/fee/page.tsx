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
  const L = 44, R = 10, T = 14, B = 26;
  const CW = 560, CH = 160;
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

export default function DeliveryFeePage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear]       = useState(new Date().getFullYear());
  const [month, setMonth]     = useState(0); // 0 = 전체

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = { year };
    if (month) params.month = month;
    const r = await api.get("/api/distribution/delivery-fee-summary", {
      params, headers: { "X-Business-Id": bizId() },
    }).catch(() => ({ data: null }));
    setData(r.data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const monthly: any[] = data?.monthly ?? [];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>배송비 정산</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>완료된 배송의 차량별 · 월별 배송비를 집계합니다</p>
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value={0}>전체 월</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
      </div>

      {/* 총계 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>총 배송비</p>
          <p style={{ fontSize: "28px", fontWeight: 900, color: "var(--text-primary)" }}>₩{fmt(data?.total_fee)}</p>
        </div>
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>정산 대상 배송건</p>
          <p style={{ fontSize: "28px", fontWeight: 900, color: "var(--text-primary)" }}>{fmt(data?.total_count)}건</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* 차량별 */}
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>차량별 배송비</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface-2)" }}>
                {["차량번호", "기사", "건수", "배송비 합계"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>...</td></tr>
              : (data?.by_vehicle ?? []).length === 0 ? <tr><td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>데이터 없음</td></tr>
              : (data?.by_vehicle ?? []).map((v: any, i: number) => (
                <tr key={v.vehicle_id ?? i} style={{ borderBottom: i < (data?.by_vehicle?.length - 1) ? "1px solid var(--border-subtle)" : "none" }}>
                  <td style={{ padding: "11px 14px", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{v.vehicle_plate}</td>
                  <td style={{ padding: "11px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{v.driver_name || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{v.count}건</td>
                  <td style={{ padding: "11px 14px", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>₩{fmt(v.total_fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 월별 차트 */}
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "16px 18px" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>월별 배송비</p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>월별 배송비 총액 추이 (막대에 마우스를 올리면 정확한 금액이 표시됩니다)</p>
          <MonthlyBarChart data={monthly} valueKey="total_fee" fmtValue={v => `₩${fmt(v)}`} fmtAxis={fmtWon} unit="" />
        </div>
      </div>
    </div>
  );
}
