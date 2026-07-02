"use client";

import { useRouter } from "next/navigation";
import { Check, CalendarCheck, Download, Bot, FileText, Headphones, Star } from "lucide-react";

const FEATURES = [
  { icon: CalendarCheck, label: "부가세 신고 도우미",    desc: "신고 일정과 준비 현황 자동 관리" },
  { icon: FileText,      label: "신고 준비 체크리스트",  desc: "항목 직접 추가 · 수정 · 삭제 · 체크" },
  { icon: Download,      label: "CSV 내보내기",          desc: "전체 거래 데이터를 엑셀로 출력" },
  { icon: Bot,           label: "고급 AI 분석",          desc: "심층 매출 · 비용 인사이트 및 예측" },
  { icon: Headphones,    label: "우선 고객 지원",        desc: "전담 상담 채널 및 빠른 응답" },
  { icon: Star,          label: "신규 기능 우선 이용",   desc: "베타 기능 조기 접근 및 피드백 반영" },
];

const COMPARE: [string, boolean, boolean][] = [
  ["회계 장부 및 거래 내역",   true,  true],
  ["영수증 OCR 자동 인식",     true,  true],
  ["카드 · 은행 거래 관리",    true,  true],
  ["AI 회계 비서 (기본)",      true,  true],
  ["경비 정산 관리",           true,  true],
  ["부가세 신고 도우미",       false, true],
  ["신고 준비 체크리스트",     false, true],
  ["CSV 데이터 내보내기",      false, true],
  ["고급 AI 분석 리포트",      false, true],
  ["우선 기술 지원",           false, true],
];

export default function ProPage() {
  const router = useRouter();

  const card: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "14px", boxShadow: "var(--shadow)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* 헤더 */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>PRO 플랜 가입</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>SelfERP의 모든 기능을 잠금 해제하세요</p>
      </div>

      {/* 메인 2열 레이아웃 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px", alignItems: "start" }}>

        {/* 왼쪽: 기능 소개 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ ...card, padding: "24px" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>PRO 플랜에서 제공하는 기능</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "8px", backgroundColor: "rgba(255,190,80,0.12)", border: "1px solid rgba(255,190,80,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={16} color="#FFBE50" />
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{label}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px", lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 무료 vs PRO 비교표 */}
          <div style={{ ...card, padding: "20px 24px" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>무료 플랜 vs PRO 플랜</p>
            <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", backgroundColor: "var(--bg-surface-2)", padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)" }}>기능</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>무료</span>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--accent)", textAlign: "center" }}>PRO</span>
              </div>
              {COMPARE.map(([feature, free, pro], i) => (
                <div key={feature} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", padding: "10px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{feature}</span>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {free ? <Check size={15} color="#22C55E" /> : <span style={{ fontSize: "15px", color: "var(--text-subtle)" }}>—</span>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {pro ? <Check size={15} color="#22C55E" /> : <span style={{ fontSize: "15px", color: "var(--text-subtle)" }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 플랜 카드 + CTA */}
        <div style={{ ...card, padding: "28px 24px", border: "1.5px solid #FFBE50", background: "linear-gradient(135deg, rgba(255,190,80,0.07) 0%, transparent 60%)", position: "sticky", top: "20px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: "var(--accent)", borderRadius: "8px", padding: "4px 12px", marginBottom: "16px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#1a1000", letterSpacing: "1px" }}>✦ PRO PLAN</span>
          </div>

          <p style={{ fontSize: "32px", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.1 }}>
            29,900<span style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-muted)" }}>원</span>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginLeft: "4px" }}>/월</span>
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", marginBottom: "20px" }}>VAT 포함 · 연간 결제 시 20% 할인</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {["월 단위 자동 청구", "언제든지 해지 가능", "30일 환불 보장", "결제 즉시 모든 기능 활성화"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={14} color="#22C55E" />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{t}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/dashboard/pro/payment")}
            style={{
              width: "100%", padding: "15px",
              backgroundColor: "#FFBE50",
              color: "#1a1000",
              border: "none", borderRadius: "12px",
              fontSize: "15px", fontWeight: 800,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            PRO 플랜 가입
          </button>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "10px" }}>
            결제 정보를 안전하게 입력하고 즉시 시작하세요
          </p>
        </div>
      </div>
    </div>
  );
}
