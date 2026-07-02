import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>

      {/* 우상단 테마 토글 */}
      <div style={{ position: "fixed", top: "20px", right: "20px" }}>
        <ThemeToggle />
      </div>

      {/* 로고 + 타이틀 */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", marginBottom: "48px" }}>
        <div style={{ width: "96px", height: "96px", borderRadius: "24px", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 32px rgba(255,190,80,0.35)" }}>
          <svg width="52" height="52" viewBox="0 0 20 20" fill="none" stroke="var(--accent-text)" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="1.5" width="16" height="17" rx="2.5" strokeWidth="1.7"/>
            <rect x="3.8" y="3.8" width="12.4" height="3.8" rx="1" strokeWidth="1.5"/>
            <rect x="3.8" y="9"    width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
            <rect x="8.2" y="9"    width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
            <rect x="12.6" y="9"   width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
            <rect x="3.8" y="11.9" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
            <rect x="8.2" y="11.9" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
            <rect x="12.6" y="11.9" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
            <rect x="3.8" y="14.8" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
            <rect x="8.2" y="14.8" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
            <rect x="12.6" y="14.8" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "38px", fontWeight: "900", color: "var(--text-primary)", letterSpacing: "-1px" }}>SelfERP</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "16px", marginTop: "8px" }}>소상공인 회계 ERP</p>
        </div>
      </div>

      {/* CTA 버튼 */}
      <Link
        href="/login"
        style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)", fontWeight: "800", fontSize: "16px", padding: "16px 72px", borderRadius: "16px", textDecoration: "none", letterSpacing: "4px", boxShadow: "0 4px 20px rgba(255,190,80,0.3)" }}
      >
        로그인
      </Link>

      <p style={{ color: "var(--text-subtle)", fontSize: "13px", marginTop: "48px" }}>
        © 2026 SelfERP · 소상공인을 위한 가장 친절한 회계 ERP
      </p>
    </div>
  );
}
