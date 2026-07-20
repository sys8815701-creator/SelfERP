"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

type AccountType = "personal" | "business" | null;
type EmailStep   = "input" | "sent" | "verified";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* 이메일 인증 상태 */
  const [emailStep,    setEmailStep]    = useState<EmailStep>("input");
  const [verifyEmail,  setVerifyEmail]  = useState("");
  const [codeInput,    setCodeInput]    = useState("");
  const [codeError,    setCodeError]    = useState("");
  const [codeSending,  setCodeSending]  = useState(false);
  const [codeVerifying,setCodeVerifying]= useState(false);
  const [timer,        setTimer]        = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setTimer(600);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  };
  const fmtTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const sendCode = async () => {
    if (!verifyEmail.trim() || !/\S+@\S+\.\S+/.test(verifyEmail)) {
      setCodeError("올바른 이메일을 입력해주세요."); return;
    }
    setCodeError(""); setCodeSending(true);
    try {
      await api.post("/api/auth/email/send-code", { email: verifyEmail });
      setEmailStep("sent");
      startTimer();
    } catch (e: any) {
      setCodeError(e?.response?.data?.detail ?? "코드 발송에 실패했습니다.");
    } finally { setCodeSending(false); }
  };

  const verifyCode = async () => {
    if (codeInput.length !== 6) { setCodeError("6자리 코드를 입력해주세요."); return; }
    setCodeError(""); setCodeVerifying(true);
    try {
      await api.post("/api/auth/email/verify", { email: verifyEmail, code: codeInput });
      setEmailStep("verified");
      setPersonalForm(f => ({ ...f, email: verifyEmail }));
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (e: any) {
      setCodeError(e?.response?.data?.detail ?? "코드 인증에 실패했습니다.");
    } finally { setCodeVerifying(false); }
  };

  const resetEmailVerify = () => {
    setEmailStep("input");
    setCodeInput("");
    setCodeError("");
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const [personalForm, setPersonalForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", role: "employee",
    phone: "", department: "", position: "", employee_number: "", hire_date: "",
    business_number: "",
  });

  const formatBizNumPersonal = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  };

  const [businessForm, setBusinessForm] = useState({
    business_name: "", business_number: "", owner_name: "",
    industry: "", business_type: "", open_date: "", address: "",
    email: "", password: "", confirmPassword: "",
  });
  const [bizNumVerified, setBizNumVerified] = useState(false);
  const [bizNumVerifying, setBizNumVerifying] = useState(false);
  const [bizNumError, setBizNumError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const formatBizNum = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  };

  const verifyBizNum = async () => {
    setBizNumError(""); setBizNumVerifying(true);
    try {
      const res = await api.post("/api/pending-registration/verify-number", {
        business_number: businessForm.business_number,
      });
      if (res.data.valid) {
        setBizNumVerified(true);
      } else {
        setBizNumError("유효하지 않은 사업자등록번호입니다. 다시 확인해주세요.");
      }
    } catch {
      setBizNumError("인증 중 오류가 발생했습니다.");
    } finally { setBizNumVerifying(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid var(--border)", borderRadius: "12px",
    padding: "14px 16px", fontSize: "15px", outline: "none",
    color: "var(--text-primary)", backgroundColor: "var(--bg-surface-2)",
  };

  const inputErrorStyle: React.CSSProperties = { ...inputStyle, border: "1.5px solid #EF4444" };

  const labelStyle: React.CSSProperties = {
    fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)",
    display: "block", marginBottom: "8px",
  };

  const validateStep = (fields: Record<string, string>, passwordKey?: string, confirmKey?: string): string => {
    for (const [, value] of Object.entries(fields)) {
      if (!value.trim()) return "모든 항목을 입력해주세요.";
    }
    if (passwordKey && confirmKey && fields[passwordKey] !== fields[confirmKey]) {
      return "비밀번호가 일치하지 않습니다.";
    }
    return "";
  };

  const handlePersonalRegister = async () => {
    const err = validateStep({
      이름: personalForm.name, 이메일: personalForm.email,
      비밀번호: personalForm.password, 비밀번호확인: personalForm.confirmPassword,
    }, "비밀번호", "비밀번호확인");
    if (err) { setError(err); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/api/auth/register", {
        name: personalForm.name, email: personalForm.email,
        password: personalForm.password, role: personalForm.role,
        phone:           personalForm.phone           || undefined,
        department_name: personalForm.department      || undefined,
        position_name:   personalForm.position        || undefined,
        employee_number: personalForm.employee_number || undefined,
        hire_date:       personalForm.hire_date       || undefined,
        business_number: personalForm.business_number || undefined,
      });
      router.push("/login");
    } catch (err: any) {
      setError(err.response?.data?.detail || "회원가입 중 오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const handleBusinessNext = (nextStep: number) => {
    let err = "";
    if (step === 1) {
      if (!businessForm.business_name.trim() || !businessForm.owner_name.trim()) { setError("모든 항목을 입력해주세요."); return; }
      if (!bizNumVerified) { setError("사업자등록번호 인증을 완료해주세요."); return; }
    } else if (step === 2) {
      err = validateStep({ 업종: businessForm.industry, 업태: businessForm.business_type, 개업일: businessForm.open_date, 주소: businessForm.address });
    }
    if (err) { setError(err); return; }
    setError(""); setStep(nextStep);
  };

  const handleBusinessRegister = async () => {
    const err = validateStep({ 이메일: businessForm.email, 비밀번호: businessForm.password, 비밀번호확인: businessForm.confirmPassword }, "비밀번호", "비밀번호확인");
    if (err) { setError(err); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/api/pending-registration/submit", {
        business_name: businessForm.business_name,
        business_number: businessForm.business_number,
        owner_name: businessForm.owner_name,
        industry: businessForm.industry,
        business_type: businessForm.business_type,
        open_date: businessForm.open_date || null,
        address: businessForm.address,
        email: businessForm.email,
        password: businessForm.password,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "신청 중 오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const progressWidth = step === 1 ? "33%" : step === 2 ? "66%" : "100%";
  const pwMismatch = (pw: string, c: string) => c.length > 0 && pw !== c;

const btnPrimary: React.CSSProperties = { width: "100%", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontWeight: 800, padding: "16px", borderRadius: "12px", fontSize: "16px", letterSpacing: "4px", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(255,190,80,0.3)" };
  const btnSecondary: React.CSSProperties = { border: "1.5px solid var(--border)", borderRadius: "12px", padding: "14px", fontSize: "15px", fontWeight: 600, backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative" }}>

      <div style={{ position: "fixed", top: "20px", right: "20px" }}>
        <ThemeToggle />
      </div>

      <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "24px", border: "1px solid var(--border)", padding: "48px", width: "100%", maxWidth: "520px", boxShadow: "var(--shadow-lg)" }}>

        {/* 로고 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "18px", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", boxShadow: "0 4px 16px rgba(255,190,80,0.35)" }}>
            <svg width="34" height="34" viewBox="0 0 20 20" fill="none" stroke="var(--accent-text)" strokeLinecap="round" strokeLinejoin="round">
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
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>회원가입</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "6px" }}>SelfERP 계정을 만드세요</p>
        </div>

        {/* 계정 유형 선택 */}
        {!accountType && (
          <div>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "16px", textAlign: "center" }}>
              가입 유형을 선택하세요
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { type: "personal", emoji: "👤", label: "개인", desc: "일반 개인 회원" },
                { type: "business", emoji: "🏢", label: "기업", desc: "개인사업자 / 법인" },
              ].map((item) => (
                <button key={item.type}
                  onClick={() => setAccountType(item.type as AccountType)}
                  style={{ border: "2px solid var(--border)", borderRadius: "16px", padding: "24px 16px", cursor: "pointer", backgroundColor: "var(--bg-surface-2)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>{item.emoji}</div>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>{item.label}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{item.desc}</p>
                </button>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: "14px", color: "var(--text-muted)", marginTop: "28px" }}>
              이미 계정이 있으신가요?{" "}
              <Link href="/login" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>로그인</Link>
            </p>
          </div>
        )}

        {/* 개인 회원가입 */}
        {accountType === "personal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* STEP A — 이메일 인증 */}
            <div style={{ backgroundColor: "var(--bg-surface-2)", borderRadius: "14px", padding: "18px", border: emailStep === "verified" ? "1.5px solid #22C55E" : "1.5px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: emailStep === "verified" ? "#22C55E" : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, color: emailStep === "verified" ? "#fff" : "var(--accent-text)", flexShrink: 0 }}>
                  {emailStep === "verified" ? "✓" : "1"}
                </div>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>이메일 인증</span>
                {emailStep === "verified" && <span style={{ fontSize: "12px", color: "#22C55E", fontWeight: 600 }}>인증 완료</span>}
              </div>

              {/* input 단계 */}
              {emailStep === "input" && (
                <>
                  <label style={labelStyle}>이메일 <span style={{ color: "#EF4444" }}>*</span></label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input type="email" placeholder="example@email.com"
                      value={verifyEmail}
                      onChange={e => setVerifyEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") sendCode(); }}
                      style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={sendCode} disabled={codeSending}
                      style={{ padding: "14px 18px", borderRadius: "12px", border: "none", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontWeight: 700, fontSize: "14px", cursor: codeSending ? "default" : "pointer", whiteSpace: "nowrap", opacity: codeSending ? 0.7 : 1 }}>
                      {codeSending ? "발송 중" : "코드 발송"}
                    </button>
                  </div>
                  {codeError && <p style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>{codeError}</p>}
                </>
              )}

              {/* sent 단계 */}
              {emailStep === "sent" && (
                <>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    <strong style={{ color: "var(--accent)" }}>{verifyEmail}</strong>로 6자리 인증 코드를 발송했습니다.
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input type="text" inputMode="numeric" maxLength={6} placeholder="인증 코드 6자리"
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={e => { if (e.key === "Enter") verifyCode(); }}
                        style={{ ...inputStyle, letterSpacing: "6px", fontSize: "20px", paddingRight: "70px" }} />
                      {timer > 0 && (
                        <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: timer < 60 ? "#EF4444" : "var(--text-muted)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {fmtTimer(timer)}
                        </span>
                      )}
                    </div>
                    <button onClick={verifyCode} disabled={codeVerifying || codeInput.length !== 6}
                      style={{ padding: "14px 16px", borderRadius: "12px", border: "none", backgroundColor: codeInput.length === 6 ? "var(--accent)" : "var(--bg-surface-3)", color: codeInput.length === 6 ? "var(--accent-text)" : "var(--text-muted)", fontWeight: 700, fontSize: "14px", cursor: codeInput.length === 6 && !codeVerifying ? "pointer" : "default", opacity: codeVerifying ? 0.7 : 1 }}>
                      {codeVerifying ? "확인 중" : "인증 확인"}
                    </button>
                  </div>
                  {codeError && <p style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>{codeError}</p>}
                  {timer === 0 && (
                    <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px" }}>
                      코드가 만료되었습니다.{" "}
                      <button onClick={() => { resetEmailVerify(); }}
                        style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
                        다시 발송
                      </button>
                    </p>
                  )}
                  <button onClick={resetEmailVerify}
                    style={{ marginTop: "10px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}>
                    다른 이메일로 재발송 →
                  </button>
                </>
              )}

              {/* verified 단계 */}
              {emailStep === "verified" && (
                <p style={{ fontSize: "14px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#22C55E", fontSize: "16px" }}>✓</span>
                  <strong>{verifyEmail}</strong> 인증이 완료되었습니다.
                </p>
              )}
            </div>

            {/* STEP B — 나머지 정보 (인증 완료 후 표시) */}
            {emailStep === "verified" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900, color: "var(--accent-text)", flexShrink: 0 }}>2</div>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>기본 정보 입력</span>
                </div>

                {/* 기본 정보 */}
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>기본 정보</p>
                <div>
                  <label style={labelStyle}>이름 <span style={{ color: "#EF4444" }}>*</span></label>
                  <input type="text" placeholder="홍길동"
                    value={personalForm.name}
                    onChange={e => setPersonalForm({ ...personalForm, name: e.target.value })}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>연락처</label>
                  <input type="tel" placeholder="010-0000-0000"
                    value={personalForm.phone}
                    onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })}
                    style={inputStyle} />
                </div>

                {/* 소속 사업장 */}
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginTop: "4px" }}>
                  소속 사업장 <span style={{ fontSize: "11px", fontWeight: 400 }}>(선택 · 입력 시 해당 사업장 관리자가 승인 후 연결)</span>
                </p>
                <div>
                  <label style={labelStyle}>사업자등록번호</label>
                  <input
                    type="text"
                    placeholder="000-00-00000"
                    value={personalForm.business_number}
                    onChange={e => setPersonalForm({ ...personalForm, business_number: formatBizNumPersonal(e.target.value) })}
                    style={inputStyle}
                  />
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "5px" }}>
                    입력하지 않아도 가입 가능합니다. 입력 시 사업장 관리자가 승인 후 자동 연결됩니다.
                  </p>
                </div>

                {/* 직장 정보 */}
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginTop: "4px" }}>
                  직장 정보 <span style={{ fontSize: "11px", fontWeight: 400 }}>(선택 · 관리자가 배정 시 참고)</span>
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>부서</label>
                    <input type="text" placeholder="예) 회계팀"
                      value={personalForm.department}
                      onChange={e => setPersonalForm({ ...personalForm, department: e.target.value })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>직급</label>
                    <input type="text" placeholder="예) 대리"
                      value={personalForm.position}
                      onChange={e => setPersonalForm({ ...personalForm, position: e.target.value })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>사원번호</label>
                    <input type="text" placeholder="예) EMP-2024-001"
                      value={personalForm.employee_number}
                      onChange={e => setPersonalForm({ ...personalForm, employee_number: e.target.value })}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>입사일</label>
                    <input type="date"
                      value={personalForm.hire_date}
                      onChange={e => setPersonalForm({ ...personalForm, hire_date: e.target.value })}
                      style={inputStyle} />
                  </div>
                </div>

                {/* 계정 보안 */}
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginTop: "4px" }}>계정 보안</p>
                <div>
                  <label style={labelStyle}>비밀번호 <span style={{ color: "#EF4444" }}>*</span></label>
                  <input type="password" placeholder="8자 이상 입력하세요"
                    value={personalForm.password}
                    onChange={e => setPersonalForm({ ...personalForm, password: e.target.value })}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>비밀번호 확인 <span style={{ color: "#EF4444" }}>*</span></label>
                  <input type="password" placeholder="비밀번호를 다시 입력하세요"
                    value={personalForm.confirmPassword}
                    onChange={e => setPersonalForm({ ...personalForm, confirmPassword: e.target.value })}
                    style={pwMismatch(personalForm.password, personalForm.confirmPassword) ? inputErrorStyle : inputStyle} />
                  {pwMismatch(personalForm.password, personalForm.confirmPassword) && (
                    <p style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>비밀번호가 일치하지 않습니다.</p>
                  )}
                  {personalForm.confirmPassword.length > 0 && personalForm.password === personalForm.confirmPassword && (
                    <p style={{ color: "#22C55E", fontSize: "12px", marginTop: "6px" }}>✓ 비밀번호가 일치합니다.</p>
                  )}
                </div>

                {error && <p style={{ color: "#EF4444", fontSize: "13px" }}>{error}</p>}
                <button onClick={handlePersonalRegister} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
                  {loading ? "처리 중..." : "회원가입"}
                </button>
              </>
            )}

            <p style={{ textAlign: "center", fontSize: "13px" }}>
              <button onClick={() => { setAccountType(null); resetEmailVerify(); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}>
                ← 유형 선택으로 돌아가기
              </button>
            </p>
          </div>
        )}

        {/* 기업 회원가입 */}
        {accountType === "business" && !submitted && (
          <div>
            {/* 진행률 */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                {["기본 정보", "사업장 정보", "계정 정보"].map((label, i) => (
                  <span key={i} style={{ fontSize: "12px", fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? "var(--accent)" : "var(--text-muted)" }}>
                    {label}
                  </span>
                ))}
              </div>
              <div style={{ height: "6px", backgroundColor: "var(--bg-surface-2)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: progressWidth, backgroundColor: "var(--accent)", borderRadius: "99px", transition: "width 0.3s" }} />
              </div>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={labelStyle}>상호명 <span style={{ color: "#EF4444" }}>*</span></label>
                  <input type="text" placeholder="예) 행복한 베이커리" value={businessForm.business_name}
                    onChange={e => setBusinessForm({ ...businessForm, business_name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>사업자등록번호 <span style={{ color: "#EF4444" }}>*</span></label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input type="text" placeholder="000-00-00000" value={businessForm.business_number}
                      onChange={e => { setBizNumVerified(false); setBizNumError(""); setBusinessForm({ ...businessForm, business_number: formatBizNum(e.target.value) }); }}
                      disabled={bizNumVerified}
                      style={{ ...inputStyle, flex: 1, border: bizNumVerified ? "1.5px solid #22C55E" : "1.5px solid var(--border)" }} />
                    <button onClick={bizNumVerified ? () => { setBizNumVerified(false); setBizNumError(""); } : verifyBizNum}
                      disabled={bizNumVerifying || !businessForm.business_number.trim()}
                      style={{ padding: "14px 16px", borderRadius: "12px", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 700, fontSize: "14px",
                        backgroundColor: bizNumVerified ? "rgba(34,197,94,0.12)" : "var(--accent-light)", color: bizNumVerified ? "#22C55E" : "var(--accent)", border: bizNumVerified ? "1.5px solid rgba(34,197,94,0.40)" : "1.5px solid #C49A30", opacity: bizNumVerifying ? 0.7 : 1 }}>
                      {bizNumVerified ? "✓ 인증됨" : bizNumVerifying ? "확인 중" : "인증하기"}
                    </button>
                  </div>
                  {bizNumError && <p style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>{bizNumError}</p>}
                  {bizNumVerified && <p style={{ color: "#22C55E", fontSize: "12px", marginTop: "6px" }}>✓ 유효한 사업자등록번호입니다</p>}
                </div>
                <div>
                  <label style={labelStyle}>대표자명 <span style={{ color: "#EF4444" }}>*</span></label>
                  <input type="text" placeholder="홍길동" value={businessForm.owner_name}
                    onChange={e => setBusinessForm({ ...businessForm, owner_name: e.target.value })} style={inputStyle} />
                </div>
                {error && <p style={{ color: "#EF4444", fontSize: "13px" }}>{error}</p>}
                <button onClick={() => handleBusinessNext(2)} style={btnPrimary}>다음</button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {[
                  { label: "업종", key: "industry", placeholder: "예) 소매업", type: "text" },
                  { label: "업태", key: "business_type", placeholder: "예) 도소매", type: "text" },
                  { label: "개업일", key: "open_date", placeholder: "", type: "date" },
                  { label: "사업장 주소", key: "address", placeholder: "예) 서울시 강남구 테헤란로 123", type: "text" },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label} <span style={{ color: "#EF4444" }}>*</span></label>
                    <input type={f.type} placeholder={f.placeholder} value={(businessForm as any)[f.key]}
                      onChange={e => setBusinessForm({ ...businessForm, [f.key]: e.target.value })} style={inputStyle} />
                  </div>
                ))}
                {error && <p style={{ color: "#EF4444", fontSize: "13px" }}>{error}</p>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button onClick={() => { setError(""); setStep(1); }} style={btnSecondary}>이전</button>
                  <button onClick={() => handleBusinessNext(3)} style={{ ...btnPrimary, letterSpacing: "2px" }}>다음</button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {[
                  { label: "이메일", key: "email", type: "email", placeholder: "example@email.com" },
                  { label: "비밀번호", key: "password", type: "password", placeholder: "비밀번호를 입력하세요" },
                  { label: "비밀번호 확인", key: "confirmPassword", type: "password", placeholder: "비밀번호를 다시 입력하세요" },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label} <span style={{ color: "#EF4444" }}>*</span></label>
                    <input type={f.type} placeholder={f.placeholder} value={(businessForm as any)[f.key]}
                      onChange={e => setBusinessForm({ ...businessForm, [f.key]: e.target.value })}
                      style={f.key === "confirmPassword" && pwMismatch(businessForm.password, businessForm.confirmPassword) ? inputErrorStyle : inputStyle} />
                    {f.key === "confirmPassword" && pwMismatch(businessForm.password, businessForm.confirmPassword) && (
                      <p style={{ color: "#EF4444", fontSize: "12px", marginTop: "6px" }}>비밀번호가 일치하지 않습니다.</p>
                    )}
                    {f.key === "confirmPassword" && businessForm.confirmPassword.length > 0 && businessForm.password === businessForm.confirmPassword && (
                      <p style={{ color: "#22C55E", fontSize: "12px", marginTop: "6px" }}>✓ 비밀번호가 일치합니다.</p>
                    )}
                  </div>
                ))}
                {error && <p style={{ color: "#EF4444", fontSize: "13px" }}>{error}</p>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button onClick={() => { setError(""); setStep(2); }} style={btnSecondary}>이전</button>
                  <button onClick={handleBusinessRegister} disabled={loading} style={{ ...btnPrimary, letterSpacing: "2px", opacity: loading ? 0.6 : 1 }}>
                    {loading ? "처리 중..." : "가입 완료"}
                  </button>
                </div>
              </div>
            )}

            <p style={{ textAlign: "center", fontSize: "13px", marginTop: "20px" }}>
              <button onClick={() => { setAccountType(null); setStep(1); setError(""); setBizNumVerified(false); }}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}>
                ← 유형 선택으로 돌아가기
              </button>
            </p>
          </div>
        )}

        {/* 신청 완료 — 승인 대기 */}
        {accountType === "business" && submitted && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "var(--accent-light)", border: "2px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "32px" }}>
              ⏳
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "10px" }}>신청 완료</h2>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "24px" }}>
              기업 회원가입 신청이 접수되었습니다<br />
              통합 관리자 승인 후 계정이 활성화됩니다<br />
              <strong style={{ color: "var(--accent)" }}>{businessForm.email}</strong>로 결과를 안내드립니다
            </p>
            <div style={{ backgroundColor: "var(--bg-surface-2)", borderRadius: "14px", padding: "16px", border: "1px solid var(--border)", marginBottom: "24px", textAlign: "left" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.5px", marginBottom: "10px" }}>신청 내역</p>
              {[
                { label: "상호명", value: businessForm.business_name },
                { label: "사업자번호", value: businessForm.business_number },
                { label: "대표자", value: businessForm.owner_name },
                { label: "이메일", value: businessForm.email },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{row.value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => router.push("/login")} style={btnPrimary}>로그인 페이지로</button>
          </div>
        )}
      </div>
    </div>
  );
}
