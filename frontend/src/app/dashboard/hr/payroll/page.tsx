"use client";
import { useRouter } from "next/navigation";

export default function PayrollPage() {
  const router = useRouter();
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>급여 정산</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>기본급 · 수당 · 가불 · 퇴직금 · 4대보험 (v1.8 구현 예정)</p>
      </div>
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>◒</p>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>v1.8에서 구현됩니다</p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>급여 계산, 가불 관리, 퇴직금 정산, 4대보험 공제, 급여명세서 PDF 출력이 추가될 예정입니다.</p>
        <button onClick={() => router.push("/dashboard/hr")}
          style={{ fontSize: "13px", color: "var(--accent)", background: "none", border: "1px solid var(--accent)", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
          HR 대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
}
