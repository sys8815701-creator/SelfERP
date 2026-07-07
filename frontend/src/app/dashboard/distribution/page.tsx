"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const SHORTCUTS = [
  { label: "수주 관리",   href: "/dashboard/distribution/orders",      icon: "◇", desc: "고객사 주문 접수 및 관리" },
  { label: "배송 지시",   href: "/dashboard/distribution/deliveries",  icon: "◈", desc: "배송 계획 수립 및 지시" },
  { label: "차량 관리",   href: "/dashboard/distribution/vehicles",    icon: "◉", desc: "배송 차량 및 기사 관리" },
  { label: "반품 처리",   href: "/dashboard/distribution/returns",     icon: "◊", desc: "반품 접수 및 재고 복원" },
  { label: "유통 분석",   href: "/dashboard/distribution/analytics",   icon: "◎", desc: "배송 완료율 · 반품률 분석" },
];

export default function DistributionDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bizId = localStorage.getItem("activeBizId");
    if (!bizId) return;
    const h = { "X-Business-Id": bizId };
    Promise.all([
      api.get("/api/distribution/summary",   { headers: h }).catch(() => ({ data: null })),
      api.get("/api/distribution/analytics", { headers: h }).catch(() => ({ data: null })),
    ]).then(([s, a]) => {
      setSummary(s.data);
      setAnalytics(a.data);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>유통 대시보드</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>수주 · 배송 · 반품을 통합 관리합니다</p>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "보유 차량",     value: loading ? "—" : (summary?.total_vehicles ?? 0),    href: "/dashboard/distribution/vehicles" },
          { label: "처리 중 수주",  value: loading ? "—" : (summary?.pending_orders ?? 0),    href: "/dashboard/distribution/orders",     warn: (summary?.pending_orders ?? 0) > 0 },
          { label: "진행 중 배송",  value: loading ? "—" : (summary?.active_deliveries ?? 0), href: "/dashboard/distribution/deliveries",  warn: (summary?.active_deliveries ?? 0) > 0 },
          { label: "반품 건수",     value: loading ? "—" : (summary?.total_returns ?? 0),     href: "/dashboard/distribution/returns",     warn: (summary?.total_returns ?? 0) > 0 },
        ].map(card => (
          <div key={card.label} onClick={() => router.push(card.href)}
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(255,190,80,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{card.label}</p>
            <p style={{ fontSize: "28px", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* 배송 효율 */}
        {analytics && (
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>배송 효율</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { label: "배송 완료율", value: `${analytics.delivery_rate}%`, bar: analytics.delivery_rate, color: analytics.delivery_rate >= 90 ? "#22C55E" : analytics.delivery_rate >= 70 ? "#F59E0B" : "#EF4444", sub: `${analytics.completed_deliveries}/${analytics.total_deliveries}건` },
                { label: "반품률",      value: `${analytics.return_rate}%`,   bar: Math.min(analytics.return_rate * 5, 100), color: analytics.return_rate > 10 ? "#EF4444" : analytics.return_rate > 5 ? "#F59E0B" : "#22C55E", sub: `${analytics.total_returns}건 반품` },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{row.label}</span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{row.sub}</span>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{row.value}</span>
                    </div>
                  </div>
                  <div style={{ height: "6px", backgroundColor: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(row.bar, 100)}%`, backgroundColor: row.color, borderRadius: "3px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 바로 가기 */}
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px", gridColumn: !analytics ? "1 / -1" : "auto" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>바로 가기</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {SHORTCUTS.map(s => (
              <div key={s.href} onClick={() => router.push(s.href)}
                style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", backgroundColor: "var(--accent-light)", borderRadius: "10px", cursor: "pointer", border: "1.5px solid #C49A30" }}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.95)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "none")}>
                <span style={{ fontSize: "18px" }}>{s.icon}</span>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{s.label}</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
