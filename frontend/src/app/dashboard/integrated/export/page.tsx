"use client";

import { useState } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";

type ExportTarget = {
  id: string;
  module: string;
  label: string;
  desc: string;
  icon: string;
  endpoint: string;
  filename: string;
};

const TARGETS: ExportTarget[] = [
  { id: "ledger",       module: "회계",  label: "회계 장부",      icon: "▣", desc: "전체 거래 내역 (날짜, 계정과목, 금액, 적요)",     endpoint: "/api/export/ledger",       filename: "회계장부" },
  { id: "vendors",      module: "회계",  label: "거래처 목록",    icon: "◇", desc: "등록된 거래처 정보 전체",                           endpoint: "/api/export/vendors",      filename: "거래처목록" },
  { id: "ar",           module: "회계",  label: "미수금 현황",    icon: "◈", desc: "미수금 및 연체 내역",                                endpoint: "/api/export/ar",           filename: "미수금현황" },
  { id: "ap",           module: "회계",  label: "미지급금 현황",  icon: "◉", desc: "미지급금 및 연체 내역",                              endpoint: "/api/export/ap",           filename: "미지급금현황" },
  { id: "employees",    module: "인사",  label: "직원 명부",      icon: "◉", desc: "재직 · 퇴직 직원 전체 목록",                          endpoint: "/api/export/employees",    filename: "직원명부" },
  { id: "payroll",      module: "인사",  label: "급여 대장",      icon: "◒", desc: "전체 급여 지급 이력",                                endpoint: "/api/export/payroll",      filename: "급여대장" },
  { id: "items",        module: "생산",  label: "품목 · 재고",      icon: "◇", desc: "품목 마스터 및 현재 재고량",                        endpoint: "/api/export/items",        filename: "품목재고" },
  { id: "prod_orders",  module: "생산",  label: "생산 지시서",    icon: "◉", desc: "전체 생산 지시서 이력",                              endpoint: "/api/export/production-orders", filename: "생산지시서" },
  { id: "inventory_log",module: "생산",  label: "입출고 이력",    icon: "◎", desc: "재고 입출고 전체 로그",                              endpoint: "/api/export/inventory-logs",   filename: "입출고이력" },
  { id: "sales_orders", module: "유통",  label: "수주 목록",      icon: "◇", desc: "전체 수주 내역",                                     endpoint: "/api/export/sales-orders", filename: "수주목록" },
  { id: "deliveries",   module: "유통",  label: "배송 이력",      icon: "◈", desc: "전체 배송 지시 및 완료 내역",                       endpoint: "/api/export/deliveries",   filename: "배송이력" },
  { id: "returns",      module: "유통",  label: "반품 이력",      icon: "◊", desc: "전체 반품 처리 내역",                                endpoint: "/api/export/returns",      filename: "반품이력" },
];

const MODULE_COLORS: Record<string, string> = {
  "회계": "#F59E0B", "인사": "#3B82F6", "생산": "#10B981", "유통": "#8B5CF6",
};

export default function ExportPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [filterMod, setFilterMod] = useState("전체");
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(TARGETS.map(t => t.id)));
  const clearAll  = () => setSelected(new Set());

  const downloadOne = async (t: ExportTarget) => {
    const bizId = localStorage.getItem("activeBizId");
    if (!bizId) return;
    setLoading(t.id);
    try {
      const res = await api.get(t.endpoint, {
        headers: { "X-Business-Id": bizId },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${t.filename}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setModal({ message: "내보내기 실패: 서버 오류가 발생했습니다", variant: "error" });
    } finally {
      setLoading(null);
    }
  };

  const downloadSelected = async () => {
    const targets = TARGETS.filter(t => selected.has(t.id));
    for (const t of targets) {
      await downloadOne(t);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const modules = ["전체", ...Array.from(new Set(TARGETS.map(t => t.module)))];
  const filtered = TARGETS.filter(t => filterMod === "전체" || t.module === filterMod);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>데이터 내보내기</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>모든 모듈의 데이터를 CSV 파일로 다운로드합니다</p>
      </div>

      {/* 필터 + 일괄 선택 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {modules.map(m => (
            <button key={m} onClick={() => setFilterMod(m)}
              style={{ padding: "6px 14px", borderRadius: "20px", border: `1px solid ${filterMod === m ? "var(--accent)" : "var(--border)"}`,
                backgroundColor: filterMod === m ? "var(--accent)" : "var(--bg-surface)",
                color: filterMod === m ? "var(--accent-text)" : "var(--text-muted)",
                fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              {m}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={selectAll} style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}>전체 선택</button>
          <button onClick={clearAll}  style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" }}>선택 해제</button>
          {selected.size > 0 && (
            <button onClick={downloadSelected}
              style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", background: "var(--accent-light)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "6px 16px", cursor: "pointer" }}>
              선택 {selected.size}개 다운로드
            </button>
          )}
        </div>
      </div>

      {/* 카드 그리드 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", padding: "22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {filtered.map(t => {
          const isSelected = selected.has(t.id);
          const isLoading = loading === t.id;
          const color = MODULE_COLORS[t.module] ?? "#6B7280";
          return (
            <div key={t.id}
              onClick={() => toggle(t.id)}
              style={{ backgroundColor: isSelected ? "var(--bg-surface)" : "var(--bg-surface-2)", border: `2px solid ${isSelected ? color : "var(--border)"}`, borderRadius: "12px",
                padding: "16px", cursor: "pointer", transition: "all 0.15s", position: "relative",
                boxShadow: isSelected ? `0 0 0 3px ${color}22` : "none" }}>
              {isSelected && (
                <div style={{ position: "absolute", top: "10px", right: "10px", width: "18px", height: "18px", borderRadius: "50%",
                  backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "white", fontSize: "11px", fontWeight: 800 }}>✓</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: `${color}15`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "16px", color }}>{t.icon}</span>
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)" }}>{t.label}</p>
                  <span style={{ fontSize: "10px", fontWeight: 700, color, backgroundColor: `${color}20`, border: `1px solid ${color}60`, padding: "1px 6px", borderRadius: "4px" }}>{t.module}</span>
                </div>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.5 }}>{t.desc}</p>
              <button
                onClick={e => { e.stopPropagation(); downloadOne(t); }}
                disabled={!!loading}
                style={{ width: "100%", padding: "7px", borderRadius: "8px", border: `1.5px solid ${color}`,
                  color, backgroundColor: `${color}18`, fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  opacity: loading ? 0.5 : 1 }}>
                {isLoading ? "다운로드 중..." : "CSV 다운로드"}
              </button>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
