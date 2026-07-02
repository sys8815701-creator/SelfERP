"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SOCIAL_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "보안 검증 실패. 다시 시도해주세요.",
  kakao_token: "카카오 인증 실패. 다시 시도해주세요.",
  kakao_userinfo: "카카오 사용자 정보 조회 실패.",
  naver_token: "네이버 인증 실패. 다시 시도해주세요.",
  naver_userinfo: "네이버 사용자 정보 조회 실패.",
  google_token: "구글 인증 실패. 다시 시도해주세요.",
  google_userinfo: "구글 사용자 정보 조회 실패.",
  auth_failed: "소셜 로그인 처리 중 오류가 발생했습니다.",
};

type LoginType = "personal" | "business";

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<LoginType>("personal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const socialError = params.get("social_error");
    if (socialError) {
      setError(SOCIAL_ERROR_MESSAGES[socialError] ?? "소셜 로그인 중 오류가 발생했습니다.");
    }
  }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1.5px solid var(--border)",
    borderRadius: "12px",
    padding: "12px 16px",
    fontSize: "15px",
    outline: "none",
    color: "var(--text-primary)",
    backgroundColor: "var(--bg-surface-2)",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)",
    display: "block", marginBottom: "6px",
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(loginType === "personal" ? "이메일과 비밀번호를 입력해주세요." : "사업자번호와 비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const endpoint = loginType === "personal" ? "/api/auth/login" : "/api/auth/login/business";
      const res = await api.post(endpoint, { email, password });
      /* 이전 사용자의 잔존 세션 데이터 초기화 (pro_plan·은행정보·알림상태는 DB/계정별 키로 관리라 건드리지 않음) */
      ["bk-profile-photo", "business", "activeBizId",
       "bk-vat-checklist", "selectedMonth"].forEach(k => localStorage.removeItem(k));
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      /* 사업장 유무에 따라 초기 화면 분기 */
      try {
        const bizRes = await api.get("/api/business/");
        if (bizRes.data.length === 0) {
          router.push("/dashboard/business");
        } else {
          const biz = bizRes.data[0];
          localStorage.setItem("business", JSON.stringify(biz));
          localStorage.setItem("activeBizId", String(biz.id));
          router.push("/dashboard");
        }
      } catch {
        router.push("/dashboard");
      }
    } catch {
      setError(loginType === "personal"
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : "사업자번호 또는 비밀번호가 올바르지 않습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative" }}>

      {/* 테마 토글 */}
      <div style={{ position: "fixed", top: "20px", right: "20px" }}>
        <ThemeToggle />
      </div>

      <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "24px", border: "1px solid var(--border)", padding: "36px 48px", width: "100%", maxWidth: "480px", boxShadow: "var(--shadow-lg)" }}>

        {/* 로고 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", boxShadow: "0 4px 16px rgba(255,190,80,0.35)" }}>
            <svg width="30" height="30" viewBox="0 0 20 20" fill="none" stroke="var(--accent-text)" strokeLinecap="round" strokeLinejoin="round">
              {/* 계산기 본체 */}
              <rect x="2" y="1.5" width="16" height="17" rx="2.5" strokeWidth="1.7"/>
              {/* 화면 */}
              <rect x="3.8" y="3.8" width="12.4" height="3.8" rx="1" strokeWidth="1.5"/>
              {/* 버튼 3×3 */}
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
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>SelfERP</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>소상공인 회계 ERP</p>
        </div>

        {/* 로그인 유형 */}
        <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
          {[
            { type: "personal", label: "개인", desc: "비즈니스가 등록되지 않음" },
            { type: "business", label: "사업자", desc: "개인사업자, 법인" },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => { setLoginType(item.type as LoginType); setError(""); setEmail(""); }}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: 0, cursor: "pointer", border: "none", backgroundColor: "transparent", textAlign: "left" }}
            >
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${loginType === item.type ? "var(--accent)" : "var(--border)"}`, backgroundColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {loginType === item.type && (
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--accent)" }} />
                )}
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: loginType === item.type ? "var(--accent)" : "var(--text-secondary)" }}>{item.label}</p>
                <p style={{ fontSize: "11px", marginTop: "1px", color: "var(--text-muted)" }}>{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* 입력 폼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>
              {loginType === "personal" ? "이메일" : "사업자번호"} <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={loginType === "personal" ? "example@email.com" : "000-00-00000"}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>비밀번호 <span style={{ color: "#EF4444" }}>*</span></label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={inputStyle}
            />
          </div>

          {loginType === "business" && (
            <div style={{ backgroundColor: "var(--accent-light)", borderRadius: "10px", padding: "10px 14px", display: "flex", gap: "8px", alignItems: "flex-start", border: "1px solid rgba(255,190,80,0.2)" }}>
              <span style={{ fontSize: "14px" }}>ℹ️</span>
              <p style={{ fontSize: "12px", color: "var(--accent)", lineHeight: 1.5 }}>
                가입 시 등록한 사업자번호와 비밀번호로 로그인하세요.
              </p>
            </div>
          )}

          {error && <p style={{ color: "#EF4444", fontSize: "13px" }}>{error}</p>}

          <button
            onClick={handleLogin} disabled={loading}
            style={{ width: "100%", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontWeight: 800, padding: "14px", borderRadius: "12px", fontSize: "16px", letterSpacing: "4px", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(255,190,80,0.3)", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          {loginType === "personal" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>또는</span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
                <button
                  onClick={() => { window.location.href = `${API_BASE}/api/auth/kakao/login`; }}
                  title="카카오 로그인"
                  style={{ width: "52px", height: "52px", borderRadius: "50%", backgroundColor: "#FEE500", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/KakaoTalk_logo.svg" alt="카카오" style={{ width: "26px", height: "26px", objectFit: "contain" }} />
                </button>
                <button
                  onClick={() => { window.location.href = `${API_BASE}/api/auth/naver/login`; }}
                  title="네이버 로그인"
                  style={{ width: "52px", height: "52px", borderRadius: "50%", backgroundColor: "#03C75A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <span style={{ color: "white", fontWeight: 900, fontSize: "20px" }}>N</span>
                </button>
                <button
                  onClick={() => { window.location.href = `${API_BASE}/api/auth/google/login`; }}
                  title="구글 로그인"
                  style={{ width: "52px", height: "52px", borderRadius: "50%", backgroundColor: "var(--bg-surface-2)", border: "1.5px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="구글" style={{ width: "26px", height: "26px", objectFit: "contain" }} />
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)", marginTop: "20px" }}>
          계정이 없으신가요?{" "}
          <Link href="/register" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}
