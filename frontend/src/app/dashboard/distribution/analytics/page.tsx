"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

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
  const maxAmt = Math.max(...monthly.map((m: any) => m.amount), 1);

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

      {/* 월별 수주 차트 */}
      {monthly.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>월별 수주 현황</p>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", minWidth: `${monthly.length * 64}px`, height: "180px" }}>
              {monthly.map((m: any, idx: number) => {
                const barH = Math.max((m.amount / maxAmt) * 150, 4);
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>₩{fmt(m.amount)}</span>
                    <div style={{ width: "100%", height: `${barH}px`, backgroundColor: "var(--accent)", borderRadius: "6px 6px 0 0", opacity: 0.85, minWidth: "36px" }} />
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{m.month}월</span>
                    <span style={{ fontSize: "9px", color: "var(--text-subtle)" }}>{m.count}건</span>
                  </div>
                );
              })}
            </div>
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
