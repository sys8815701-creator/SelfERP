"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const SHORTCUTS = [
  { label: "품목 · 재고",    href: "/dashboard/production/items",      icon: "◇", desc: "원자재 · 완제품 재고 현황" },
  { label: "자재명세서(BOM)", href: "/dashboard/production/bom",       icon: "◈", desc: "제품 구성 자재 정의" },
  { label: "생산 지시서",    href: "/dashboard/production/orders",     icon: "◉", desc: "생산 계획 및 지시" },
  { label: "생산 실적",      href: "/dashboard/production/results",    icon: "◊", desc: "생산 완료 실적 등록" },
  { label: "입출고 이력",    href: "/dashboard/production/inventory",  icon: "◎", desc: "자재 입출고 이력 관리" },
  { label: "단위 원가 분석", href: "/dashboard/production/cost",       icon: "◑", desc: "BOM 기반 제품 원가 산출" },
  { label: "재고 실사",      href: "/dashboard/production/audit",      icon: "◐", desc: "장부 vs 실사 비교 조정" },
  { label: "효율 · 알림",   href: "/dashboard/production/efficiency",  icon: "◒", desc: "달성률 · 불량률 · 안전재고" },
];

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

export default function ProductionDashboard() {
  const router = useRouter();
  const [summary, setSummary]   = useState<any>(null);
  const [alerts, setAlerts]     = useState<any[]>([]);
  const [efficiency, setEff]    = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const bizId = localStorage.getItem("activeBizId");
    if (!bizId) return;
    const h = { "X-Business-Id": bizId };
    Promise.all([
      api.get("/api/production/summary",             { headers: h }).catch(() => ({ data: null })),
      api.get("/api/production/safety-stock-alerts", { headers: h }).catch(() => ({ data: [] })),
      api.get("/api/production/efficiency",          { headers: h }).catch(() => ({ data: { summary: {} } })),
    ]).then(([s, a, e]) => {
      setSummary(s.data);
      setAlerts(a.data);
      setEff(e.data.summary);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>생산 대시보드</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>생산 관련 모듈을 통합 관리합니다</p>
      </div>

      {/* 안전재고 경고 배너 */}
      {alerts.length > 0 && (
        <div onClick={() => router.push("/dashboard/production/efficiency")}
          style={{ backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.40)", borderRadius: "12px", padding: "12px 18px", marginBottom: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px" }}>⚠️</span>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>안전재고 부족 {alerts.length}개 품목</p>
              <p style={{ fontSize: "11px", color: "#DC2626", marginTop: "2px" }}>
                {alerts.slice(0, 3).map(a => a.item_name).join(", ")}{alerts.length > 3 ? ` 외 ${alerts.length - 3}개` : ""}
              </p>
            </div>
          </div>
          <span style={{ fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>자세히 보기 →</span>
        </div>
      )}

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "전체 품목",    value: loading ? "—" : (summary?.total_items ?? 0),   href: "/dashboard/production/items" },
          { label: "안전재고 부족", value: loading ? "—" : (summary?.low_stock ?? 0),     href: "/dashboard/production/efficiency", warn: (summary?.low_stock ?? 0) > 0 },
          { label: "진행 중 생산", value: loading ? "—" : (summary?.active_orders ?? 0), href: "/dashboard/production/orders" },
          { label: "평균 달성률",  value: loading ? "—" : `${efficiency?.avg_achievement ?? 0}%`, warn: (efficiency?.avg_achievement ?? 100) < 80 && !!efficiency?.total_orders, href: "/dashboard/production/efficiency" },
        ].map(card => (
          <div key={card.label} onClick={() => router.push(card.href)}
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(255,190,80,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{card.label}</p>
            <p style={{ fontSize: "28px", fontWeight: 900, color: card.warn ? "#DC2626" : "var(--text-primary)", lineHeight: 1 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* 효율 요약 + 바로 가기 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* 효율 지표 */}
        {efficiency?.total_orders > 0 && (
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>생산 효율 요약</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "평균 달성률", value: `${efficiency.avg_achievement}%`, bar: efficiency.avg_achievement, color: efficiency.avg_achievement >= 100 ? "#22C55E" : efficiency.avg_achievement >= 80 ? "#F59E0B" : "#EF4444" },
                { label: "평균 불량률", value: `${efficiency.avg_defect_rate}%`, bar: Math.min(efficiency.avg_defect_rate * 10, 100), color: efficiency.avg_defect_rate > 5 ? "#EF4444" : "#22C55E" },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{row.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{row.value}</span>
                  </div>
                  <div style={{ height: "6px", backgroundColor: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(row.bar, 100)}%`, backgroundColor: row.color, borderRadius: "3px" }} />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>총 지시서 {efficiency.total_orders}건 · 불량 {fmt(efficiency.total_defect)}개</p>
            </div>
          </div>
        )}

        {/* 바로 가기 */}
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px", gridColumn: efficiency?.total_orders > 0 ? "auto" : "1 / -1" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>바로 가기</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
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
