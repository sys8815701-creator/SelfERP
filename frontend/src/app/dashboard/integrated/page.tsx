"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send, X } from "lucide-react";
import api from "@/lib/api";

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }
function fmtW(v: any) { return `₩${parseFloat(String(v ?? 0)).toLocaleString("ko-KR")}`; }

export default function IntegratedDashboard() {
  const router = useRouter();
  const [data, setData]     = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "ai" | "user"; text: string }[]>([
    { role: "ai", text: "안녕하세요! 오늘 사업 현황을 분석해드릴게요. 무엇이든 물어보세요" },
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

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
        newAlerts.push({ type: "info", icon: "📦", module: "유통", msg: `처리 대기 수주 ${dist.data.pending_orders}건`, href: "/dashboard/distribution/orders?status=처리대기" });
      setAlerts(newAlerts);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const sendAiMessage = async (text: string) => {
    if (!text || aiLoading) return;
    setAiMessages(prev => [...prev, { role: "user", text }]);
    setAiLoading(true);
    try {
      const res = await api.post("/api/ai/chat", { message: text });
      setAiMessages(prev => [...prev, { role: "ai", text: res.data.reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "ai", text: "잠시 후 다시 시도해 주세요" }]);
    } finally { setAiLoading(false); }
  };

  const sendAi = () => {
    const q = aiInput.trim();
    if (!q) return;
    setAiInput("");
    sendAiMessage(q);
  };

  const MODULES = [
    {
      title: "인사관리", href: "/dashboard/hr", color: "#3B82F6",
      kpis: [
        { label: "재직 직원", value: loading ? "—" : `${(data.emp ?? []).filter((e: any) => e.employment_status === "재직").length}명` },
        { label: "이번 달 급여", value: "—" },
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
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>통합 대시보드</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>HR · 회계 · 생산 · 유통 전사 현황을 한눈에 확인합니다</p>
      </div>

      {/* 통합 알림 */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          {alerts.map((a, i) => {
            const mc = ({ 인사: "#3B82F6", 회계: "#F59E0B", 생산: "#10B981", 유통: "#8B5CF6", 통합: "#EC4899" } as Record<string, string>)[a.module] ?? "#6B7280";
            return (
              <div key={i} onClick={() => router.push(a.href)}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", cursor: "pointer",
                  backgroundColor: `${mc}18`,
                  border: `1.5px solid ${mc}60` }}>
                <span style={{ fontSize: "16px" }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px", marginRight: "8px",
                    backgroundColor: `${mc}18`, color: mc, border: `1px solid ${mc}60` }}>
                    {a.module}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{a.msg}</span>
                </div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>→</span>
              </div>
            );
          })}
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
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>바로 가기 →</span>
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
        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>전체 메뉴 바로 가기</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          {[
            { label: "직원 관리",     href: "/dashboard/hr/employees",         icon: "◉" },
            { label: "급여 정산",     href: "/dashboard/hr/payroll",           icon: "◒" },
            { label: "거래처 관리",   href: "/dashboard/accounting/vendors",   icon: "◇" },
            { label: "재무제표",      href: "/dashboard/accounting/statements", icon: "◉" },
            { label: "세금계산서",    href: "/dashboard/accounting/tax-invoice", icon: "◊" },
            { label: "품목 · 재고",     href: "/dashboard/production/items",     icon: "◇" },
            { label: "생산 지시서",   href: "/dashboard/production/orders",    icon: "◉" },
            { label: "원가 분석",     href: "/dashboard/production/cost",      icon: "◑" },
            { label: "수주 관리",     href: "/dashboard/distribution/orders",  icon: "◇" },
            { label: "배송 지시",     href: "/dashboard/distribution/deliveries", icon: "◈" },
            { label: "AI 비서",       href: "/dashboard/ai",                   icon: "✦" },
            { label: "경영 분석",     href: "/dashboard/analytics",            icon: "↗" },
          ].map(s => (
            <div key={s.href} onClick={() => router.push(s.href)}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", backgroundColor: "var(--accent-light)", borderRadius: "8px", cursor: "pointer", border: "1.5px solid #C49A30" }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.95)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "none")}>
              <span style={{ fontSize: "14px" }}>{s.icon}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI 회계 비서 토글 버튼 */}
      {!aiOpen && (
        <button onClick={() => setAiOpen(true)}
          style={{ position: "fixed", bottom: "24px", right: "24px", display: "flex", alignItems: "center", gap: "8px",
            backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30",
            borderRadius: "24px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(196,154,48,0.25)", zIndex: 200 }}>
          <Bot size={16} />
          AI 회계 비서
        </button>
      )}

      {/* AI 회계 비서 패널 */}
      {aiOpen && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", width: "300px",
          backgroundColor: "var(--bg-surface)", border: "1.5px solid #C49A30",
          borderRadius: "16px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", zIndex: 200,
          display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px",
            backgroundColor: "var(--accent-light)", borderBottom: "1px solid #C49A3040" }}>
            <Bot size={16} color="var(--accent)" />
            <span style={{ flex: 1, fontSize: "13px", fontWeight: 800, color: "var(--accent)" }}>AI 회계 비서</span>
            <button onClick={() => setAiOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px", display: "flex" }}>
              <X size={14} />
            </button>
          </div>

          {/* 메시지 목록 */}
          <div style={{ flex: 1, maxHeight: "280px", overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {aiMessages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  backgroundColor: m.role === "user" ? "var(--accent-light)" : "var(--bg-surface-2)",
                  border: m.role === "user" ? "1.5px solid #C49A30" : "none",
                  color: "var(--text-primary)",
                  fontSize: "12px", lineHeight: 1.5 }}>
                  {m.text}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 2px", backgroundColor: "var(--bg-surface-2)", fontSize: "12px", color: "var(--text-muted)" }}>
                  입력 중...
                </div>
              </div>
            )}
            <div ref={aiBottomRef} />
          </div>

          {/* 빠른 질문 */}
          {aiMessages.length <= 1 && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {["이번 달 매출이 전월보다 얼마나 늘었어?", "광고비 잘 쓰고 있는 거야?", "부가세 얼마쯤 나올까?"].map(q => (
                <button key={q} onClick={() => sendAiMessage(q)}
                  style={{ textAlign: "left", padding: "7px 10px", fontSize: "11px", color: "var(--text-primary)",
                    backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30",
                    borderRadius: "8px", cursor: "pointer", lineHeight: 1.4 }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* 입력 */}
          <div style={{ display: "flex", gap: "6px", padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
            <input value={aiInput} onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAi(); } }}
              placeholder="질문을 입력하세요..." disabled={aiLoading}
              style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px",
                backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px",
                outline: "none" }} />
            <button onClick={sendAi} disabled={!aiInput.trim() || aiLoading}
              style={{ padding: "8px 10px", backgroundColor: "var(--accent-light)", color: "var(--accent)",
                border: "1.5px solid #C49A30", borderRadius: "8px", cursor: "pointer",
                opacity: !aiInput.trim() || aiLoading ? 0.5 : 1, display: "flex", alignItems: "center" }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
