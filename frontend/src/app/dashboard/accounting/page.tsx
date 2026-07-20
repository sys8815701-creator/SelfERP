"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const BASIC_SHORTCUTS = [
  { label: "회계 장부",      href: "/dashboard/ledger",   icon: "▣", desc: "수입 · 지출 자동 분개 장부" },
  { label: "영수증 OCR",    href: "/dashboard/ocr",      icon: "▤", desc: "영수증 업로드 및 자동 처리" },
  { label: "카드 · 은행",   href: "/dashboard/card",     icon: "▥", desc: "거래 내역 조회 및 관리" },
  { label: "경비 정산",     href: "/dashboard/expense",  icon: "⊕", desc: "경비 신청 및 승인 처리" },
  { label: "거래처 · 사업장", href: "/dashboard/business", icon: "♟", desc: "거래처 · 사업장 등록 관리" },
  { label: "AI 회계 비서",  href: "/dashboard/ai",       icon: "✦", desc: "회계 질의 및 AI 분석" },
];

const SHORTCUTS = [
  { label: "거래처 관리",      href: "/dashboard/accounting/vendors",     icon: "◇", desc: "매출처 · 매입처 등록 및 조회" },
  { label: "미수금 · 미지급금", href: "/dashboard/accounting/ar-ap",       icon: "◈", desc: "외상매출금 · 매입금 현황" },
  { label: "재무제표",         href: "/dashboard/accounting/statements",  icon: "◉", desc: "손익계산서 · 대차대조표" },
  { label: "세금계산서",       href: "/dashboard/accounting/tax-invoice", icon: "◊", desc: "세금계산서 발행 · 수취" },
  { label: "견적서 · 청구서",  href: "/dashboard/accounting/estimates",   icon: "◎", desc: "문서 발행 및 이력 관리" },
  { label: "예산 관리",        href: "/dashboard/accounting/budget",      icon: "◐", desc: "월별 예산 설정 및 달성률" },
];

export default function AccountingDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bizId = localStorage.getItem("activeBizId");
    if (!bizId) { setLoading(false); return; }
    api.get("/api/accounting/vendors/summary", { headers: { "X-Business-Id": bizId } })
      .then(r => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const typeColors: Record<string, string> = {
    매출처: "#22C55E",
    매입처: "#3B82F6",
    양방향: "#A855F7",
    기타:   "#6B7280",
  };

  return (
    <div style={{ width: "100%" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>회계 대시보드</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>회계 관련 모듈을 통합 관리합니다</p>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "전체 거래처", value: loading ? "—" : (summary?.total ?? 0), sub: "등록된 거래처 수", href: "/dashboard/accounting/vendors" },
          { label: "거래 중",    value: loading ? "—" : (summary?.active ?? 0), sub: "활성 거래처", href: "/dashboard/accounting/vendors?is_active=1" },
          { label: "거래중지",   value: loading ? "—" : ((summary?.total ?? 0) - (summary?.active ?? 0)), sub: "비활성 거래처", href: "/dashboard/accounting/vendors?is_active=0" },
        ].map(card => (
          <div
            key={card.label}
            onClick={() => router.push(card.href)}
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(255,190,80,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{card.label}</p>
            <p style={{ fontSize: "28px", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>{card.value}</p>
            <p style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "6px" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* 거래처 유형 분포 */}
      {summary?.by_type && Object.keys(summary.by_type).length > 0 && (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px", marginBottom: "28px" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>거래처 유형 분포</p>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {Object.entries(summary.by_type).map(([type, cnt]: any) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: typeColors[type] || "#6B7280", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{type}</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{cnt}곳</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 바로 가기 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 24px" }}>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>바로 가기</p>

        <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.7px", marginBottom: "10px" }}>기본 도구</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {BASIC_SHORTCUTS.map(s => (
            <div
              key={s.href}
              onClick={() => router.push(s.href)}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", backgroundColor: "var(--accent-light)", borderRadius: "10px", cursor: "pointer", border: "1.5px solid #C49A30", transition: "filter 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.95)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "none")}
            >
              <span style={{ fontSize: "20px" }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{s.label}</p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.7px", marginBottom: "10px" }}>회계 관리</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {SHORTCUTS.map(s => (
            <div
              key={s.href}
              onClick={() => router.push(s.href)}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", backgroundColor: "var(--accent-light)", borderRadius: "10px", cursor: "pointer", border: "1.5px solid #C49A30", transition: "filter 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.95)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "none")}
            >
              <span style={{ fontSize: "20px" }}>{s.icon}</span>
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
