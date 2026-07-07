"use client";

import { useState, useEffect } from "react";
import { Download, LogOut, Bell, Palette, Database, User, Shield, ChevronRight, Eye, EyeOff, AlertTriangle } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Modal, { ModalConfig } from "@/components/Modal";

interface Notif { sales: boolean; expense: boolean; vat: boolean; ai: boolean; }

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: on ? "var(--accent)" : "var(--bg-surface-3)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: 8, backgroundColor: on ? "var(--accent-text)" : "var(--text-muted)", transition: "left 0.2s" }} />
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
      <div style={{ width: 32, height: 32, borderRadius: "9px", backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>{label}</span>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [notif, setNotif] = useState<Notif>({ sales: true, expense: true, vat: true, ai: false });
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const getProKey = () => { try { const id = JSON.parse(localStorage.getItem("user") || "{}").id; return id ? `pro_plan_${id}` : "pro_plan"; } catch { return "pro_plan"; } };
  const [isPro] = useState<boolean>(() => { if (typeof window !== "undefined") return localStorage.getItem(getProKey()) === "true"; return false; });

  /* 회원 탈퇴 모달 */
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawPw,    setWithdrawPw]    = useState("");
  const [showWithdrawPw,setShowWithdrawPw]= useState(false);
  const [withdrawing,   setWithdrawing]   = useState(false);
  const [withdrawErr,   setWithdrawErr]   = useState("");

  const card: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", padding: "22px" };

  useEffect(() => {
    const n = localStorage.getItem("notif_settings");
    if (n) setNotif(JSON.parse(n));
  }, []);

  const saveNotif = (key: keyof Notif) => {
    const next = { ...notif, [key]: !notif[key] };
    setNotif(next);
    localStorage.setItem("notif_settings", JSON.stringify(next));
  };

  const exportCSV = async () => {
    if (!isPro) {
      setModal({ title: "PRO 플랜 전용", message: "CSV 내보내기 기능은 PRO 플랜에서 제공됩니다.\n지금 업그레이드하고 데이터를 활용하세요", variant: "info", showCancel: true, confirmLabel: "PRO 가입하기", onConfirm: () => router.push("/dashboard/pro") });
      return;
    }
    try {
      const res = await api.get("/api/dashboard/recent-transactions?limit=1000");
      const rows: string[] = ["날짜,내용,입금,출금,카테고리"];
      for (const t of res.data) rows.push(`${t.date},${t.description},${t.deposit},${t.withdrawal},${t.category ?? ""}`);
      const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `bookkeep_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch { setModal({ message: "내보내기에 실패했습니다", variant: "error" }); }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("business");
    router.push("/login");
  };

  const handleWithdraw = async () => {
    if (!withdrawPw) { setWithdrawErr("비밀번호를 입력해 주세요"); return; }
    setWithdrawing(true); setWithdrawErr("");
    try {
      await api.delete("/api/auth/me", { data: { password: withdrawPw } });
      ["access_token", "user", "business", "activeBizId", "pro_plan",
       "bk-profile-photo", "bk-profile-phone", "bk-read-notifs",
       "bk-vat-checklist", "notif_settings", "selectedMonth"].forEach(k => localStorage.removeItem(k));
      router.push("/login");
    } catch (e: any) {
      setWithdrawErr(e?.response?.data?.detail ?? "탈퇴 처리 중 오류가 발생했습니다");
      setWithdrawing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>환경설정</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>알림, 화면, 데이터 등 서비스 환경을 설정하세요</p>
      </div>

      {/* 계정 및 보안 — 링크 */}
      <div style={card}>
        <SectionTitle icon={<User size={16} color="var(--accent)" />} label="계정 및 보안" />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { href: "/dashboard/profile", icon: <User size={16} color="var(--accent)" />, label: "내 프로필", desc: "개인 정보 · 사업장 정보 · 프로필 사진 관리" },
            { href: "/dashboard/security", icon: <Shield size={16} color="var(--accent)" />, label: "보안", desc: "비밀번호 변경 · 최근 접속 기록" },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} href={href}
              style={{ display: "flex", alignItems: "center", gap: "14px", padding: "13px 16px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px", textDecoration: "none", border: "1px solid var(--border)", transition: "filter 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(0.95)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{label}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{desc}</p>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </Link>
          ))}
        </div>
      </div>

      {/* 알림 설정 */}
      <div style={card}>
        <SectionTitle icon={<Bell size={16} color="var(--accent)" />} label="알림 설정" />
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {(
            [
              { key: "sales",   label: "매출 변동 알림",       desc: "전월 대비 매출이 크게 변동되면 알림을 받습니다" },
              { key: "expense", label: "경비 승인 대기 알림",  desc: "미처리 경비 정산 건이 있을 때 알림을 받습니다" },
              { key: "vat",     label: "부가세 신고 마감 알림", desc: "부가세 신고 마감 30일 · 7일 전 알림을 받습니다" },
              { key: "ai",      label: "AI 분석 리포트",       desc: "매주 AI가 경영 현황 분석 리포트를 전송합니다" },
            ] as Array<{ key: keyof Notif; label: string; desc: string }>
          ).map(({ key, label, desc }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{label}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{desc}</p>
              </div>
              <Toggle on={notif[key]} onChange={() => saveNotif(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* 화면 설정 */}
      <div style={card}>
        <SectionTitle icon={<Palette size={16} color="var(--accent)" />} label="화면 설정" />
        <div style={{ padding: "12px 14px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>테마</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>헤더 우측의 ☀/🌙 버튼으로 다크 · 라이트 모드를 전환할 수 있습니다</p>
          </div>
          <span style={{ fontSize: "22px" }}>☀️/🌙</span>
        </div>
      </div>

      {/* 데이터 관리 */}
      <div style={card}>
        <SectionTitle icon={<Database size={16} color="var(--accent)" />} label="데이터 관리" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>거래 데이터 내보내기</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>전체 거래 내역을 CSV 파일로 다운로드합니다</p>
          </div>
          <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
            <Download size={13} />CSV 내보내기
          </button>
        </div>
      </div>

      {/* 계정 — 로그아웃 + 회원 탈퇴 */}
      <div style={{ ...card, borderColor: "rgba(239,68,68,0.25)" }}>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#EF4444", marginBottom: "12px" }}>계정</p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 18px", backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1.5px solid #EF4444", borderRadius: "9px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            <LogOut size={14} />로그아웃
          </button>
          <button onClick={() => { setWithdrawModal(true); setWithdrawPw(""); setWithdrawErr(""); setShowWithdrawPw(false); }}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 18px", backgroundColor: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "9px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            회원 탈퇴
          </button>
        </div>
      </div>

      {/* 회원 탈퇴 확인 모달 */}
      {withdrawModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}
          onClick={e => { if (e.target === e.currentTarget) setWithdrawModal(false); }}>
          <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "18px", border: "1.5px solid #FFBE50", padding: "28px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>

            {/* 경고 아이콘 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: "rgba(255,190,80,0.12)", border: "2px solid #FFBE50", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                <AlertTriangle size={24} color="#FFBE50" />
              </div>
              <p style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>정말 탈퇴하시겠습니까?</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px", textAlign: "center", lineHeight: 1.6 }}>
                계정 및 모든 데이터(거래 내역, 장부, 영수증 등)가<br />
                <strong style={{ color: "#FFBE50" }}>즉시 삭제되며 복구할 수 없습니다</strong>
              </p>
            </div>

            {/* 비밀번호 확인 */}
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>비밀번호 확인</p>
            <div style={{ position: "relative", marginBottom: "8px" }}>
              <input
                type={showWithdrawPw ? "text" : "password"}
                placeholder="현재 비밀번호 입력"
                value={withdrawPw}
                onChange={e => setWithdrawPw(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleWithdraw(); }}
                style={{ width: "100%", padding: "10px 40px 10px 12px", border: `1px solid ${withdrawErr ? "#EF4444" : "var(--border)"}`, borderRadius: "9px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
              <button type="button" onClick={() => setShowWithdrawPw(!showWithdrawPw)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {showWithdrawPw ? <EyeOff size={15} color="var(--text-muted)" /> : <Eye size={15} color="var(--text-muted)" />}
              </button>
            </div>
            {withdrawErr && <p style={{ fontSize: "12px", color: "#EF4444", marginBottom: "14px" }}>{withdrawErr}</p>}

            {/* 버튼 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: withdrawErr ? 0 : "14px" }}>
              <button onClick={() => setWithdrawModal(false)}
                style={{ padding: "11px", borderRadius: "9px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                취소
              </button>
              <button onClick={handleWithdraw} disabled={withdrawing}
                style={{ padding: "11px", borderRadius: "9px", border: "none", backgroundColor: "#FFBE50", color: "#1a1000", fontSize: "13px", fontWeight: 800, cursor: withdrawing ? "default" : "pointer", opacity: withdrawing ? 0.7 : 1 }}>
                {withdrawing ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
