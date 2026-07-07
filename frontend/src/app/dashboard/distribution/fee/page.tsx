"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

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
  const maxFee = Math.max(...monthly.map((m: any) => m.total_fee), 1);

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
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>월별 배송비</p>
          {monthly.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "32px 0", textAlign: "center" }}>데이터 없음</p>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "160px" }}>
              {monthly.map((m: any, idx: number) => {
                const barH = Math.max((m.total_fee / maxFee) * 130, 4);
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "9px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>₩{Math.round(m.total_fee / 1000)}K</span>
                    <div style={{ width: "100%", height: `${barH}px`, backgroundColor: "var(--accent)", borderRadius: "4px 4px 0 0", opacity: 0.8, minWidth: "20px" }} />
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{m.month}월</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
