import api from "@/lib/api";

export type AlertModule = "생산" | "회계" | "유통" | "인사" | "통합";
export type AlertSeverity = "danger" | "warning" | "info";

export type Alert = {
  id: string;
  module: AlertModule;
  type: AlertSeverity;
  icon: string;
  title: string;
  desc: string;
  href: string;
  ts: number;
};

function fmt(v: any) {
  return parseFloat(String(v ?? 0)).toLocaleString("ko-KR");
}

/**
 * 통합 대시보드와 알림 센터가 동일한 알림 목록(같은 id 체계)을 생성하도록 하는
 * 단일 소스. 두 화면이 각자 따로 알림을 조립하던 것을 여기로 합쳐서,
 * 한쪽에서 dismissAlert()로 숨긴 알림이 다른 화면에서도 항상 같은 id로
 * 걸러지도록 한다 (id가 다르면 dismissed-alerts에 저장해도 서로 못 알아본다).
 */
export async function fetchAlerts(bizId: string): Promise<Alert[]> {
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
    // 생산 — 안전재고 부족 (품목별로 개별 알림 — 알림 센터·통합 대시보드 동일 단위)
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

  return newAlerts.sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 };
    return order[a.type] - order[b.type];
  });
}

const DISMISSED_KEY = "dismissed-alerts";

export function getDismissedAlertIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")); }
  catch { return new Set(); }
}

export function dismissAlertIds(ids: string[]): Set<string> {
  const next = getDismissedAlertIds();
  ids.forEach(id => next.add(id));
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
  return next;
}
