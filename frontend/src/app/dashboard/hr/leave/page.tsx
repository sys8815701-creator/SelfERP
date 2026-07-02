"use client";
import { useRouter } from "next/navigation";

export default function LeavePage() {
  const router = useRouter();
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>휴가 관리</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>연차 · 반차 · 병가 · 경조사 신청 및 승인 (v1.5 구현 예정)</p>
      </div>
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>◐</p>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>v1.5에서 구현됩니다</p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>휴가 신청·승인·거절, 잔여 연차 자동 계산, 캘린더 뷰가 추가될 예정입니다.</p>
        <button onClick={() => router.push("/dashboard/hr")}
          style={{ fontSize: "13px", color: "var(--accent)", background: "none", border: "1px solid var(--accent)", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
          HR 대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
}
