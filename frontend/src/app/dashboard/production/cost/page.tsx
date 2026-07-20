"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useRole } from "@/hooks/useRole";

function fmt(v: any, dec = 0) {
  return parseFloat(String(v ?? 0)).toLocaleString("ko-KR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function CostAnalysisPage() {
  const role = useRole();
  const [data, setData]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const headers = () => ({ "X-Business-Id": bizId() });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get("/api/production/cost-analysis", { headers: headers() }).catch(() => ({ data: [] }));
    setData(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (role !== "admin") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "10px", color: "var(--text-muted)" }}>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>접근 권한이 없습니다</p>
        <p style={{ fontSize: "13px" }}>단위 원가 분석은 사업장 관리자(admin)만 확인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>단위 원가 분석</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>BOM 기반 제품 단위당 자재 원가를 산출합니다. · {data.length}개 제품</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: "20px" }}>
        {/* 제품 목록 */}
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                {["제품명", "BOM 버전", "자재 원가", "판매 단가", "마진", "마진율"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    등록된 BOM이 없습니다. 먼저 BOM을 등록하고 품목 단가를 설정하세요.
                  </td>
                </tr>
              ) : data.map((row, i) => {
                const isNegMargin = row.margin < 0;
                return (
                  <tr key={row.bom_id}
                    onClick={() => setSelected(selected?.bom_id === row.bom_id ? null : row)}
                    style={{ borderBottom: i < data.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer",
                      backgroundColor: selected?.bom_id === row.bom_id ? "var(--bg-surface-2)" : "transparent" }}
                    onMouseEnter={e => { if (selected?.bom_id !== row.bom_id) e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                    onMouseLeave={e => { if (selected?.bom_id !== row.bom_id) e.currentTarget.style.backgroundColor = "transparent"; }}>
                    <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{row.product_name}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", backgroundColor: "var(--bg-surface-3)", color: "var(--text-muted)" }}>v{row.version}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      ₩{fmt(row.total_material_cost)}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", color: row.product_unit_price > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {row.product_unit_price > 0 ? `₩${fmt(row.product_unit_price)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 600, color: isNegMargin ? "#DC2626" : "#15803D" }}>
                      {row.product_unit_price > 0 ? `₩${fmt(row.margin)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {row.product_unit_price > 0 ? (
                        <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                          backgroundColor: isNegMargin ? "rgba(220,38,38,0.12)" : row.margin_rate < 20 ? "rgba(161,98,7,0.12)" : "rgba(21,128,61,0.12)",
                          border: isNegMargin ? "1px solid rgba(220,38,38,0.40)" : row.margin_rate < 20 ? "1px solid rgba(161,98,7,0.40)" : "1px solid rgba(21,128,61,0.40)",
                          color: isNegMargin ? "#DC2626" : row.margin_rate < 20 ? "#A16207" : "#15803D" }}>
                          {fmt(row.margin_rate, 1)}%
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 자재 상세 드로어 */}
        {selected && (
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>{selected.product_name}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>BOM v{selected.version}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* 원가 요약 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "18px" }}>
              {[
                { label: "총 자재 원가", value: `₩${fmt(selected.total_material_cost)}`, highlight: false },
                { label: "판매 단가",    value: selected.product_unit_price > 0 ? `₩${fmt(selected.product_unit_price)}` : "미설정", highlight: false },
                { label: "마진",         value: selected.product_unit_price > 0 ? `₩${fmt(selected.margin)}` : "—", highlight: selected.margin < 0 },
                { label: "마진율",       value: selected.product_unit_price > 0 ? `${fmt(selected.margin_rate, 1)}%` : "—", highlight: selected.margin_rate < 0 },
              ].map(c => (
                <div key={c.label} style={{ padding: "12px 14px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{c.label}</p>
                  <p style={{ fontSize: "16px", fontWeight: 800, color: c.highlight ? "#DC2626" : "var(--text-primary)" }}>{c.value}</p>
                </div>
              ))}
            </div>

            {selected.product_unit_price === 0 && (
              <p style={{ fontSize: "11px", color: "#D97706", padding: "8px 12px", backgroundColor: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.40)", borderRadius: "8px", marginBottom: "14px" }}>
                ※ 판매 단가가 설정되지 않았습니다. 품목 관리에서 기준단가를 입력하면 마진을 계산할 수 있습니다.
              </p>
            )}

            {/* 자재 구성 */}
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px" }}>자재 구성 ({selected.material_lines?.length ?? 0})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(selected.material_lines ?? []).map((line: any, idx: number) => {
                const pct = selected.total_material_cost > 0 ? (line.line_cost / selected.total_material_cost * 100) : 0;
                return (
                  <div key={idx} style={{ padding: "10px 12px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{line.item_name}</p>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>₩{fmt(line.line_cost)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {fmt(line.quantity, 3)} {line.unit} × ₩{fmt(line.unit_price)}
                      </p>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{pct.toFixed(1)}%</span>
                    </div>
                    {/* 비율 바 */}
                    <div style={{ height: "3px", backgroundColor: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: "var(--accent)", borderRadius: "2px" }} />
                    </div>
                  </div>
                );
              })}
              {(!selected.material_lines || selected.material_lines.length === 0) && (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "16px" }}>
                  자재 라인이 없습니다.
                </p>
              )}
            </div>

            {selected.material_lines?.some((l: any) => l.unit_price === 0) && (
              <p style={{ fontSize: "11px", color: "#6B7280", marginTop: "12px", padding: "8px 12px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px" }}>
                ※ 단가가 0인 자재가 있습니다. 품목 관리에서 기준단가를 설정하면 정확한 원가가 계산됩니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
