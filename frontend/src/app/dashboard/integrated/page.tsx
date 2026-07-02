"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }
function fmtW(v: any) { return `₩${parseFloat(String(v ?? 0)).toLocaleString("ko-KR")}`; }

export default function IntegratedDashboard() {
  const router = useRouter();
  const [data, setData]     = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bizId = localStorage.getItem("activeBizId");
    if (!bizId) return;
    const h = { "X-Business-Id": bizId };

    Promise.all([
      // HR
      api.get("/api/hr/employees/", { headers: h }).catch(() => ({ data: [] })),
      // 회계
      api.get("/api/accounting/ar/summary",  { headers: h }).catch(() => ({ data: {} })),
      api.get("/api/accounting/ap/summary",  { headers: h }).catch(() => ({ data: {} })),
      // 생산
      api.get("/api/production/summary",             { headers: h }).catch(() => ({ data: {} })),
      api.get("/api/production/safety-stock-alerts", { headers: h }).catch(() => ({ data: [] })),
      api.get("/api/production/efficiency",          { headers: h }).catch(() => ({ data: { summary: {} } })),
      // 유통
      api.get("/api/distribution/summary",   { headers: h }).catch(() => ({ data: {} })),
    ]).then(([emp, ar, ap, prod, stockAlerts, eff, dist]) => {
      setData({
        emp:       emp.data,
        ar:        ar.data,
        ap:        ap.data,
        prod:      prod.data,
        eff:       eff.data?.summary ?? {},
        dist:      dist.data,
      });
      // 통합 알림 생성
      const newAlerts: any[] = [];
      if (stockAlerts.data.length > 0)
        newAlerts.push({ type: "warning", icon: "⚠", module: "생산", msg: `안전재고 부족 ${stockAlerts.data.length}개 품목`, href: "/dashboard/production/efficiency" });
      if ((ar.data?.overdue_count ?? 0) > 0)
        newAlerts.push({ type: "danger", icon: "💰", module: "회계", msg: `연체 미수금 ${ar.data.overdue_count}건 (₩${fmt(ar.data.overdue_amount)})`, href: "/dashboard/accounting/ar-ap" });
      if ((ap.data?.overdue_count ?? 0) > 0)
        newAlerts.push({ type: "danger", icon: "💳", module: "회계", msg: `연체 미지급금 ${ap.data.overdue_count}건`, href: "/dashboard/accounting/ar-ap" });
      if ((dist.data?.pending_orders ?? 0) > 0)
        newAlerts.push({ type: "info", icon: "📦", module: "유통", msg: `처리 대기 수주 ${dist.data.pending_orders}건`, href: "/dashboard/distribution/orders" });
      setAlerts(newAlerts);
      setLoading(false);
    });
  }, []);

  const MODULES = [
    {
      title: "인사관리", href: "/dashboard/hr", color: "#3B82F6",
      kpis: [
        { label: "재직 직원", value: loading ? "—" : `${(data.emp ?? []).filter((e: any) => e.employment_status === "재직").length}명` },
        { label: "이번달 급여", value: "—" },
      ],
    },
    {
      title: "회계관리", href: "/dashboard/accounting", color: "#F59E0B",
      kpis: [
        { label: "미수금 잔액", value: loading ? "—" : fmtW(data.ar?.remaining ?? 0) },
        { label: "미지급금 잔액", value: loading ? "—" : fmtW(data.ap?.remaining ?? 0) },
      ],
    },
    {
      title: "생산관리", href: "/dashboard/production", color: "#10B981",
      kpis: [
        { label: "전체 품목", value: loading ? "—" : `${data.prod?.total_items ?? 0}개` },
        { label: "평균 달성률", value: loading ? "—" : `${data.eff?.avg_achievement ?? 0}%` },
      ],
    },
    {
      title: "유통관리", href: "/dashboard/distribution", color: "#8B5CF6",
      kpis: [
        { label: "처리 중 수주", value: loading ? "—" : `${data.dist?.pending_orders ?? 0}건` },
        { label: "진행 중 배송", value: loading ? "—" : `${data.dist?.active_deliveries ?? 0}건` },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>통합 대시보드</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>HR · 회계 · 생산 · 유통 전사 현황을 한눈에 확인합니다.</p>
      </div>

      {/* 통합 알림 */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          {alerts.map((a, i) => (
            <div key={i} onClick={() => router.push(a.href)}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", cursor: "pointer",
                backgroundColor: a.type === "danger" ? "#FEF2F2" : a.type === "warning" ? "#FFFBEB" : "#EFF6FF",
                border: `1px solid ${a.type === "danger" ? "#FCA5A5" : a.type === "warning" ? "#FDE68A" : "#BFDBFE"}` }}>
              <span style={{ fontSize: "16px" }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", marginRight: "8px",
                  backgroundColor: a.type === "danger" ? "#DC2626" : a.type === "warning" ? "#D97706" : "#2563EB", color: "white" }}>
                  {a.module}
                </span>
                <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{a.msg}</span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>→</span>
            </div>
          ))}
        </div>
      )}

      {/* 모듈 KPI 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {MODULES.map(mod => (
          <div key={mod.title} onClick={() => router.push(mod.href)}
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px 24px", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: mod.color }} />
              <p style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>{mod.title}</p>
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>바로가기 →</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {mod.kpis.map(kpi => (
                <div key={kpi.label} style={{ padding: "12px 14px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{kpi.label}</p>
                  <p style={{ fontSize: "18px", fontWeight: 900, color: "var(--text-primary)" }}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 빠른 이동 그리드 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>전체 메뉴 바로가기</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          {[
            { label: "직원 관리",     href: "/dashboard/hr/employees",         icon: "◉" },
            { label: "급여 정산",     href: "/dashboard/hr/payroll",           icon: "◒" },
            { label: "거래처 관리",   href: "/dashboard/accounting/vendors",   icon: "◇" },
            { label: "재무제표",      href: "/dashboard/accounting/statements", icon: "◉" },
            { label: "세금계산서",    href: "/dashboard/accounting/tax-invoice", icon: "◊" },
            { label: "품목·재고",     href: "/dashboard/production/items",     icon: "◇" },
            { label: "생산 지시서",   href: "/dashboard/production/orders",    icon: "◉" },
            { label: "원가 분석",     href: "/dashboard/production/cost",      icon: "◑" },
            { label: "수주 관리",     href: "/dashboard/distribution/orders",  icon: "◇" },
            { label: "배송 지시",     href: "/dashboard/distribution/deliveries", icon: "◈" },
            { label: "AI 비서",       href: "/dashboard/ai",                   icon: "✦" },
            { label: "경영 분석",     href: "/dashboard/analytics",            icon: "↗" },
          ].map(s => (
            <div key={s.href} onClick={() => router.push(s.href)}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px", cursor: "pointer", border: "1px solid var(--border)" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-3)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}>
              <span style={{ fontSize: "14px" }}>{s.icon}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
