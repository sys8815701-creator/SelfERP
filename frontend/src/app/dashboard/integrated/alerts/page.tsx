"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

type Alert = {
  id: string;
  module: "생산" | "회계" | "유통" | "인사" | "통합";
  type: "danger" | "warning" | "info";
  icon: string;
  title: string;
  desc: string;
  href: string;
  ts: number;
};

export default function AlertCenterPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("전체");
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("dismissed-alerts") || "[]")); }
    catch { return new Set(); }
  });

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev); next.add(id);
      localStorage.setItem("dismissed-alerts", JSON.stringify([...next]));
      return next;
    });
  };

  const dismissAll = () => {
    const ids = alerts.map(a => a.id);
    setDismissed(prev => {
      const next = new Set(prev); ids.forEach(id => next.add(id));
      localStorage.setItem("dismissed-alerts", JSON.stringify([...next]));
      return next;
    });
  };

  const load = useCallback(async () => {
    const bizId = localStorage.getItem("activeBizId");
    if (!bizId) return;
    const h = { "X-Business-Id": bizId };
    const newAlerts: Alert[] = [];
    const ts = Date.now();

    await Promise.all([
      // 통합 — 사업장 가입 요청 대기
      api.get("/api/business/join-requests").then(r => {
        const reqs: any[] = r.data ?? [];
        if (reqs.length > 0)
          newAlerts.push({
            id: "join-requests", module: "통합", type: "info", icon: "🏢",
            title: `사업장 가입 요청 ${reqs.length}건 대기 중`,
            desc: `승인 대기 중인 직원 가입 요청이 있습니다`,
            href: "/dashboard/integrated/pending",
            ts,
          });
      }).catch(() => {}),
      // 생산 — 안전재고 부족
      api.get("/api/production/safety-stock-alerts", { headers: h }).then(r => {
        const items: any[] = r.data ?? [];
        items.forEach(it => newAlerts.push({
          id: `stock-${it.id}`, module: "생산", type: "warning", icon: "⚠",
          title: `안전재고 부족 — ${it.item_name}`,
          desc: `현재 재고 ${fmt(it.current_stock)}${it.unit} / 안전재고 ${fmt(it.safety_stock)}${it.unit}`,
          href: "/dashboard/production/efficiency", ts,
        }));
      }).catch(() => {}),
      // 회계 — 연체 미수금
      api.get("/api/accounting/ar/summary", { headers: h }).then(r => {
        if ((r.data?.overdue_count ?? 0) > 0)
          newAlerts.push({
            id: "ar-overdue", module: "회계", type: "danger", icon: "💰",
            title: `연체 미수금 ${r.data.overdue_count}건`,
            desc: `총 연체 금액 ₩${fmt(r.data.overdue_amount)}`,
            href: "/dashboard/accounting/ar-ap", ts,
          });
      }).catch(() => {}),
      // 회계 — 연체 미지급금
      api.get("/api/accounting/ap/summary", { headers: h }).then(r => {
        if ((r.data?.overdue_count ?? 0) > 0)
          newAlerts.push({
            id: "ap-overdue", module: "회계", type: "danger", icon: "💳",
            title: `연체 미지급금 ${r.data.overdue_count}건`,
            desc: `잔액 ₩${fmt(r.data.remaining)}`,
            href: "/dashboard/accounting/ar-ap", ts,
          });
      }).catch(() => {}),
      // 유통 — 대기 수주
      api.get("/api/distribution/summary", { headers: h }).then(r => {
        if ((r.data?.pending_orders ?? 0) > 0)
          newAlerts.push({
            id: "dist-pending", module: "유통", type: "info", icon: "📦",
            title: `처리 대기 수주 ${r.data.pending_orders}건`,
            desc: `진행 중 배송 ${r.data.active_deliveries ?? 0}건 · 총 반품 ${r.data.total_returns ?? 0}건`,
            href: "/dashboard/distribution/orders", ts,
          });
      }).catch(() => {}),
    ]);

    setAlerts(newAlerts.sort((a, b) => {
      const order = { danger: 0, warning: 1, info: 2 };
      return order[a.type] - order[b.type];
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const MODULES = ["전체", "생산", "회계", "유통", "인사", "통합"];
  const visible = alerts.filter(a => !dismissed.has(a.id) && (filter === "전체" || a.module === filter));
  const hiddenCount = alerts.filter(a => dismissed.has(a.id)).length;

  const MODULE_COLORS: Record<string, string> = {
    인사: "#3B82F6", 회계: "#F59E0B", 생산: "#10B981", 유통: "#8B5CF6", 통합: "#EC4899",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>전사 알림 센터</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>생산 · 회계 · 유통 · 인사 전 모듈의 긴급 알림을 한 곳에서 확인합니다</p>
      </div>

      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", padding: "22px" }}>
        {/* 필터 + 액션 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {MODULES.map(m => (
            <button key={m} onClick={() => setFilter(m)}
              style={{ padding: "6px 14px", borderRadius: "20px", border: `1px solid ${filter === m ? "var(--accent)" : "var(--border)"}`,
                backgroundColor: filter === m ? "var(--accent)" : "var(--bg-surface)",
                color: filter === m ? "var(--accent-text)" : "var(--text-muted)",
                fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              {m}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {hiddenCount > 0 && (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>숨김 {hiddenCount}건</span>
          )}
          {visible.length > 0 && (
            <button onClick={dismissAll}
              style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}>
              모두 해제
            </button>
          )}
          <button onClick={() => { setLoading(true); load(); }}
            style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}>
            새로고침
          </button>
        </div>
      </div>

      {/* 알림 목록 */}
      {loading ? (
        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "48px" }}>불러오는 중...</p>
      ) : visible.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>✅</p>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>모든 항목이 정상입니다</p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>현재 처리가 필요한 알림이 없습니다</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {visible.map(a => {
            const mc = MODULE_COLORS[a.module] ?? "#6B7280";
            return (
              <div key={a.id}
                style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: "12px",
                  backgroundColor: `${mc}15`, border: `1px solid ${mc}50` }}>
                <span style={{ fontSize: "20px", flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px",
                      backgroundColor: `${mc}20`, border: `1px solid ${mc}60`, color: mc }}>{a.module}</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{a.title}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{a.desc}</p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button onClick={() => router.push(a.href)}
                    style={{ fontSize: "12px", fontWeight: 600, padding: "6px 14px", borderRadius: "8px", cursor: "pointer",
                      border: `1px solid ${mc}`, color: mc, background: "var(--bg-surface)" }}>
                    확인
                  </button>
                  <button onClick={() => dismiss(a.id)}
                    style={{ fontSize: "12px", color: "var(--text-muted)", padding: "6px 10px", borderRadius: "8px",
                      border: "1px solid var(--border)", background: "var(--bg-surface)", cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
