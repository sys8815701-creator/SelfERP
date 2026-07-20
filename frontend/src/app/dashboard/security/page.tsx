"use client";

import { useState } from "react";
import { Shield, Lock, Eye, EyeOff, Monitor, Smartphone, CheckCircle } from "lucide-react";
import api from "@/lib/api";

const SESSIONS = [
  { id: 1, device: "Chrome / Windows 11",  ip: "121.140.xxx.xxx", location: "서울특별시", time: "현재 접속 중",  current: true },
  { id: 2, device: "Safari / iPhone 15",    ip: "211.36.xxx.xxx",  location: "서울특별시", time: "2시간 전",     current: false },
  { id: 3, device: "Chrome / MacBook Pro",  ip: "175.126.xxx.xxx", location: "경기도 성남", time: "어제 14:22", current: false },
];

export default function SecurityPage() {
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState("");
  const [msgType,    setMsgType]    = useState<"ok" | "err">("ok");

  const pwStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8)         score++;
    if (pw.length >= 12)        score++;
    if (/[A-Z]/.test(pw))      score++;
    if (/[0-9]/.test(pw))      score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = pwStrength(newPw);
  const strengthLabel = ["", "매우 약함", "약함", "보통", "강함", "매우 강함"][strength] || "";
  const strengthColor = ["", "#EF4444", "#f97316", "var(--accent)", "#22C55E", "#16A34A"][strength] || "transparent";

  const save = async () => {
    if (!currentPw || !newPw || !confirmPw) { setMsg("모든 항목을 입력해 주세요"); setMsgType("err"); return; }
    if (newPw !== confirmPw) { setMsg("새 비밀번호가 일치하지 않습니다"); setMsgType("err"); return; }
    if (newPw.length < 8) { setMsg("비밀번호는 8자 이상이어야 합니다"); setMsgType("err"); return; }
    setSaving(true); setMsg("");
    try {
      await api.patch("/api/auth/password", { current_password: currentPw, new_password: newPw });
      setMsg("비밀번호가 변경되었습니다"); setMsgType("ok");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: any) {
      setMsg(e?.response?.data?.detail ?? "비밀번호 변경에 실패했습니다"); setMsgType("err");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const card: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    boxShadow: "var(--shadow)",
    padding: "24px",
  };

  const inputWrap = (
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    setShow: (b: boolean) => void,
    placeholder: string,
  ) => (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "10px 40px 10px 12px", border: "1px solid var(--border)", borderRadius: "9px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        {show ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
      </button>
    </div>
  );

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#ffffff", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
    </div>
  );

  const label = (text: string) => (
    <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>{text}</p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>보안</h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "2px" }}>계정 보안 설정을 관리합니다</p>
      </div>

      {/* 비밀번호 변경 */}
      <div style={card}>
        {sectionTitle(<Lock size={17} color="var(--accent)" />, "비밀번호 변경")}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            {label("현재 비밀번호")}
            {inputWrap(currentPw, setCurrentPw, showCur, setShowCur, "현재 비밀번호 입력")}
          </div>
          <div>
            {label("새 비밀번호")}
            {inputWrap(newPw, setNewPw, showNew, setShowNew, "새 비밀번호 (8자 이상)")}
            {newPw && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= strength ? strengthColor : "var(--border)" }} />
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: strengthColor, fontWeight: 600 }}>{strengthLabel}</p>
              </div>
            )}
          </div>
          <div>
            {label("새 비밀번호 확인")}
            {inputWrap(confirmPw, setConfirmPw, showConf, setShowConf, "새 비밀번호 재입력")}
            {confirmPw && newPw !== confirmPw && (
              <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px" }}>비밀번호가 일치하지 않습니다</p>
            )}
            {confirmPw && newPw === confirmPw && newPw && (
              <p style={{ fontSize: "12px", color: "#22C55E", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle size={12} /> 비밀번호가 일치합니다
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
            <button
              onClick={save}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "9px", border: "none", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontSize: "13px", fontWeight: 800, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              <Shield size={14} /> {saving ? "처리 중..." : "비밀번호 변경"}
            </button>
            {msg && (
              <span style={{ fontSize: "13px", color: msgType === "ok" ? "#22C55E" : "#EF4444", fontWeight: 600 }}>{msg}</span>
            )}
          </div>
        </div>
      </div>

      {/* 비밀번호 정책 안내 */}
      <div style={{ ...card, backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent)", marginBottom: "10px" }}>✦ 안전한 비밀번호 설정 안내</p>
        {[
          "8자 이상의 비밀번호를 사용하세요",
          "영문 대 · 소문자, 숫자, 특수문자를 조합하세요",
          "다른 서비스와 동일한 비밀번호는 피하세요",
          "정기적으로 (3개월마다) 비밀번호를 변경하세요",
        ].map(t => (
          <p key={t} style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.8 }}>· {t}</p>
        ))}
      </div>

      {/* 접속 기록 */}
      <div style={card}>
        {sectionTitle(<Monitor size={17} color="var(--accent)" />, "최근 접속 기록")}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {SESSIONS.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "13px 16px", borderRadius: "10px", border: `1px solid ${s.current ? "var(--accent)" : "var(--border)"}`, backgroundColor: s.current ? "var(--accent-light)" : "var(--bg-surface-2)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: s.current ? "var(--accent)" : "var(--bg-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: s.current ? "1.5px solid #C49A30" : "1px solid var(--border)" }}>
                {s.device.includes("iPhone") ? <Smartphone size={17} color={s.current ? "var(--accent-text)" : "var(--text-muted)"} /> : <Monitor size={17} color={s.current ? "var(--accent-text)" : "var(--text-muted)"} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{s.device}</p>
                  {s.current && <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent)", backgroundColor: "rgba(255,190,80,0.2)", padding: "2px 7px", borderRadius: 5 }}>현재 세션</span>}
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{s.ip} · {s.location} · {s.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
