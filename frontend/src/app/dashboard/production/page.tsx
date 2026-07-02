"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const SHORTCUTS = [
  { label: "품목 · 재고",    href: "/dashboard/production/items",     icon: "◇", desc: "원자재·완제품 재고 현황" },
  { label: "자재명세서(BOM)", href: "/dashboard/production/bom",      icon: "◈", desc: "제품 구성 자재 정의" },
  { label: "생산 지시서",    href: "/dashboard/production/orders",    icon: "◉", desc: "생산 계획 및 지시" },
  { label: "생산 실적",      href: "/dashboard/production/results",   icon: "◊", desc: "생산 완료 실적 등록" },
  { label: "입출고 이력",    href: "/dashboard/production/inventory", icon: "◎", desc: "자재 입출고 이력 관리" },
];

export default function ProductionDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const bizId = localStorage.getItem("activeBizId");
    if (!bizId) return;
    api.get("/api/production/summary", { headers: { "X-Business-Id": bizId } })
      .then(r => setSummary(r.data))
      .catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>생산 대시보드</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>생산 관련 모듈을 통합 관리합니다.</p>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "전체 품목",    value: summary?.total_items ?? "—",   href: "/dashboard/production/items" },
          { label: "안전재고 부족", value: summary?.low_stock ?? "—",     href: "/dashboard/production/items?low_stock=1", warn: (summary?.low_stock ?? 0) > 0 },
          { label: "진행 중 생산", value: summary?.active_orders ?? "—", href: "/dashboard/production/orders" },
          { label: "등록된 BOM",   value: summary?.total_boms ?? "—",    href: "/dashboard/production/bom" },
        ].map(card => (
          <div
            key={card.label}
            onClick={() => router.push(card.href)}
            style={{ backgroundColor: "var(--bg-surface)", border: `1px solid ${(card as any).warn ? "#FCA5A5" : "var(--border)"}`, borderRadius: "14px", padding: "20px 24px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
          >
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{card.label}</p>
            <p style={{ fontSize: "28px", fontWeight: 900, color: (card as any).warn ? "#DC2626" : "var(--text-primary)", lineHeight: 1 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* 바로가기 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>바로가기</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {SHORTCUTS.map(s => (
            <div
              key={s.href}
              onClick={() => router.push(s.href)}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px", cursor: "pointer", border: "1px solid var(--border)" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-3)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
            >
              <span style={{ fontSize: "22px" }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{s.label}</p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
