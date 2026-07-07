"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const REGION_COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316"];

export default function RouteGroupingPage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate]       = useState(new Date().toISOString().split("T")[0]);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get("/api/distribution/route-grouping", {
      params: { scheduled_date: date },
      headers: { "X-Business-Id": bizId() },
    }).catch(() => ({ data: null }));
    setData(r.data);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const groups: any[] = data?.groups ?? [];

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>경로 최적화</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>같은 날 배송 지역별로 묶어서 효율적인 배송 경로를 제안합니다</p>
      </div>

      {/* 날짜 선택 */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }} />
        <button onClick={() => setDate(new Date().toISOString().split("T")[0])}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}>
          오늘
        </button>
        {data && <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>총 {data.total}건</span>}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "48px" }}>불러오는 중...</p>
      ) : groups.length === 0 ? (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "48px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>해당 날짜에 진행 중인 배송이 없습니다</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {groups.map((group: any, idx: number) => (
            <div key={group.region} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px", backgroundColor: `${REGION_COLORS[idx % REGION_COLORS.length]}15` }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: REGION_COLORS[idx % REGION_COLORS.length], flexShrink: 0 }} />
                <p style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>{group.region}</p>
                <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", backgroundColor: REGION_COLORS[idx % REGION_COLORS.length], color: "white" }}>
                  {group.count}건
                </span>
              </div>
              <div style={{ padding: "10px" }}>
                {group.deliveries.map((d: any) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "8px", marginBottom: "4px" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{d.destination}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                        {d.delivery_no} {d.recipient ? `· ${d.recipient}` : ""} {d.vehicle_plate ? `· ${d.vehicle_plate}` : ""}
                      </p>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px",
                      backgroundColor: d.status === "배송중" ? "#DBEAFE" : "#F3F4F6",
                      color: d.status === "배송중" ? "#1D4ED8" : "#6B7280" }}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
