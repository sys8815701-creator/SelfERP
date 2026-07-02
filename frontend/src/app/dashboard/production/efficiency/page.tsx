"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

function fmt(v: any, dec = 0) {
  return parseFloat(String(v ?? 0)).toLocaleString("ko-KR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function EfficiencyPage() {
  const [data, setData]           = useState<any>({ orders: [], summary: {} });
  const [alerts, setAlerts]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<"efficiency" | "alerts">("efficiency");

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const headers = () => ({ "X-Business-Id": bizId() });

  const load = useCallback(async () => {
    setLoading(true);
    const [e, a] = await Promise.all([
      api.get("/api/production/efficiency",          { headers: headers() }).catch(() => ({ data: { orders: [], summary: {} } })),
      api.get("/api/production/safety-stock-alerts", { headers: headers() }).catch(() => ({ data: [] })),
    ]);
    setData(e.data);
    setAlerts(a.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = data.summary;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>생산 효율 분석</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>생산 달성률, 불량률, 안전재고 현황을 통합 조회합니다.</p>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", backgroundColor: "var(--bg-surface-2)", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        {[["efficiency", "생산 효율"], ["alerts", `안전재고 알림 (${alerts.length})`]] .map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{ padding: "7px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600,
              backgroundColor: tab === key ? "var(--bg-surface)" : "transparent",
              color: tab === key ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: tab === key ? "var(--shadow-sm)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── 생산 효율 탭 ── */}
      {tab === "efficiency" && (
        <>
          {/* 요약 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "22px" }}>
            {[
              { label: "분석 대상 지시서", value: s.total_orders ?? 0 },
              { label: "평균 달성률", value: `${s.avg_achievement ?? 0}%`, warn: (s.avg_achievement ?? 100) < 80 },
              { label: "평균 불량률", value: `${s.avg_defect_rate ?? 0}%`, warn: (s.avg_defect_rate ?? 0) > 5 },
              { label: "총 불량 수량", value: fmt(s.total_defect), warn: (s.total_defect ?? 0) > 0 },
            ].map(c => (
              <div key={c.label} style={{ backgroundColor: "var(--bg-surface)", border: `1px solid ${c.warn ? "#FCA5A5" : "var(--border)"}`, borderRadius: "14px", padding: "18px 20px" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{c.label}</p>
                <p style={{ fontSize: "24px", fontWeight: 900, color: c.warn ? "#DC2626" : "var(--text-primary)" }}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* 테이블 */}
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                  {["지시서", "제품명", "계획", "완료", "달성률", "불량", "불량률", "상태"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
                ) : data.orders.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>분석할 생산 실적이 없습니다.</td></tr>
                ) : data.orders.map((o: any, i: number) => (
                  <tr key={o.order_id}
                    style={{ borderBottom: i < data.orders.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{o.order_no || `#${o.order_id}`}</td>
                    <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{o.product_name}</td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{fmt(o.planned_qty)}</td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{fmt(o.completed_qty)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, height: "6px", backgroundColor: "var(--border)", borderRadius: "3px", overflow: "hidden", minWidth: "60px" }}>
                          <div style={{ height: "100%", width: `${Math.min(o.achievement, 100)}%`,
                            backgroundColor: o.achievement >= 100 ? "#22C55E" : o.achievement >= 80 ? "#F59E0B" : "#EF4444", borderRadius: "3px" }} />
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: o.achievement >= 100 ? "#15803D" : o.achievement >= 80 ? "#A16207" : "#DC2626", whiteSpace: "nowrap" }}>
                          {o.achievement}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", color: o.defect_qty > 0 ? "#DC2626" : "var(--text-muted)" }}>{fmt(o.defect_qty)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                        backgroundColor: o.defect_rate > 5 ? "#FEF2F2" : o.defect_rate > 0 ? "#FEF9C3" : "#DCFCE7",
                        color: o.defect_rate > 5 ? "#DC2626" : o.defect_rate > 0 ? "#A16207" : "#15803D" }}>
                        {o.defect_rate}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                        backgroundColor: o.status === "완료" ? "#DCFCE7" : "#DBEAFE",
                        color: o.status === "완료" ? "#15803D" : "#1D4ED8" }}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── 안전재고 알림 탭 ── */}
      {tab === "alerts" && (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                {["품목명", "유형", "단위", "현재고", "안전재고", "부족 수량", "부족률"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
              ) : alerts.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center" }}>
                  <p style={{ fontSize: "22px", marginBottom: "8px" }}>✓</p>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#15803D" }}>모든 품목이 안전재고 이상입니다.</p>
                </td></tr>
              ) : alerts.map((item, i) => (
                <tr key={item.id}
                  style={{ borderBottom: i < alerts.length - 1 ? "1px solid var(--border-subtle)" : "none", backgroundColor: item.current_stock <= 0 ? "rgba(254,242,242,0.5)" : "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = item.current_stock <= 0 ? "rgba(254,242,242,0.5)" : "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.current_stock <= 0 && <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: 700, marginRight: "6px" }}>재고없음</span>}
                    {item.item_name}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{item.item_type}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{item.unit}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>{fmt(item.current_stock, 3)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{fmt(item.safety_stock, 3)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: "#DC2626" }}>+{fmt(item.shortage, 3)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                      backgroundColor: item.shortage_pct >= 100 ? "#FEF2F2" : "#FEF9C3",
                      color: item.shortage_pct >= 100 ? "#DC2626" : "#A16207" }}>
                      {item.shortage_pct}% 부족
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
