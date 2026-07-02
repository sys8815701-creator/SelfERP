"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { User, Building2, Shield, LogOut, Bell, Search, CheckCheck, Trash2, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Modal, { ModalConfig } from "@/components/Modal";
import api from "@/lib/api";
import { getNotifs, deleteNotifById, clearNotifs, formatNotifTime, NotifItem } from "@/lib/notif";

const mainMenuBase = [
  { label: "대시보드",    href: "/dashboard",          icon: "⊙" },
  { label: "회계 장부",   href: "/dashboard/ledger",   icon: "▣" },
  { label: "영수증 OCR",  href: "/dashboard/ocr",      icon: "▤", isOcr: true },
  { label: "카드 · 은행",  href: "/dashboard/card",     icon: "▥" },
  { label: "경비 정산",   href: "/dashboard/expense",  icon: "⊕" },
];

const hrMenu = [
  { label: "HR 대시보드",  href: "/dashboard/hr",              icon: "◈" },
  { label: "직원 관리",    href: "/dashboard/hr/employees",    icon: "◉" },
  { label: "부서 · 직급",  href: "/dashboard/hr/departments",  icon: "◎" },
  { label: "계약서",       href: "/dashboard/hr/contracts",    icon: "◑" },
  { label: "휴가 관리",    href: "/dashboard/hr/leave",        icon: "◐" },
  { label: "급여 정산",    href: "/dashboard/hr/payroll",      icon: "◒" },
];

const accountingMenu = [
  { label: "회계 대시보드",   href: "/dashboard/accounting",              icon: "◆" },
  { label: "거래처 관리",     href: "/dashboard/accounting/vendors",      icon: "◇" },
  { label: "미수금·미지급금", href: "/dashboard/accounting/ar-ap",        icon: "◈" },
  { label: "재무제표",        href: "/dashboard/accounting/statements",   icon: "◉" },
  { label: "세금계산서",      href: "/dashboard/accounting/tax-invoice",  icon: "◊" },
  { label: "견적서·청구서",   href: "/dashboard/accounting/estimates",    icon: "◎" },
  { label: "예산 관리",       href: "/dashboard/accounting/budget",       icon: "◐" },
];

const productionMenu = [
  { label: "생산 대시보드",   href: "/dashboard/production",              icon: "◆" },
  { label: "품목 · 재고",    href: "/dashboard/production/items",        icon: "◇" },
  { label: "자재명세서(BOM)", href: "/dashboard/production/bom",         icon: "◈" },
  { label: "생산 지시서",    href: "/dashboard/production/orders",       icon: "◉" },
  { label: "생산 실적",      href: "/dashboard/production/results",      icon: "◊" },
  { label: "입출고 이력",    href: "/dashboard/production/inventory",    icon: "◎" },
];

const insightMenu = [
  { label: "거래처 · 사업장", href: "/dashboard/business",  icon: "♟" },
  { label: "경영 분석",    href: "/dashboard/analytics", icon: "↗" },
  { label: "AI 회계 비서", href: "/dashboard/ai",        icon: "✦" },
];

const settingMenu = [
  { label: "환경설정", href: "/dashboard/settings", icon: "⚙" },
  { label: "도움말",   href: "/dashboard/help",     icon: "❓" },
];


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [ocrPendingCount, setOcrPendingCount] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);
  const pickerRef   = useRef<HTMLDivElement>(null);
  const bizRef      = useRef<HTMLDivElement>(null);

  // 계정별 읽음 키
  const getReadKey = () => {
    try { return `bk-read-notifs-${JSON.parse(localStorage.getItem("user") || "{}").id || "guest"}`; }
    catch { return "bk-read-notifs-guest"; }
  };

  // 알림 목록 (동적, 계정별)
  const [notifs, setNotifs] = useState<NotifItem[]>(() => getNotifs());
  const [hoveredNotifId, setHoveredNotifId] = useState<number | null>(null);

  // 읽은 알림 ID — 계정별 영속
  const [readIds, setReadIds] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      try { return new Set(JSON.parse(localStorage.getItem(getReadKey()) || "[]")); }
      catch { return new Set(); }
    }
    return new Set();
  });

  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length;

  const markRead = (id: number) => {
    setReadIds(prev => {
      const next = new Set(prev); next.add(id);
      localStorage.setItem(getReadKey(), JSON.stringify([...next]));
      return next;
    });
  };

  const markAllRead = () => {
    const next = new Set(notifs.map(n => n.id));
    setReadIds(next);
    localStorage.setItem(getReadKey(), JSON.stringify([...next]));
  };

  const handleDeleteNotif = (id: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    deleteNotifById(id);
  };

  const handleDeleteAll = () => clearNotifs();

  const [bizDropOpen, setBizDropOpen] = useState(false);
  const [bizList, setBizList] = useState<any[]>([]);
  const [bizReady, setBizReady] = useState(false);

  const fetchBizList = async () => {
    try { const res = await api.get("/api/business/"); setBizList(res.data); }
    catch { /* ignore */ }
  };

  const switchBusiness = (biz: any) => {
    setBusiness(biz);
    localStorage.setItem("business", JSON.stringify(biz));
    localStorage.setItem("activeBizId", String(biz.id));
    setBizDropOpen(false);
    window.location.reload();
  };

  const getProKey = () => { try { const id = JSON.parse(localStorage.getItem("user") || "{}").id; return id ? `pro_plan_${id}` : "pro_plan"; } catch { return "pro_plan"; } };
  const [isPro, setIsPro] = useState<boolean>(false);
  const [proModal, setProModal] = useState<ModalConfig | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const m = p.get("month");
      if (m && /^\d{4}-\d{2}$/.test(m)) { localStorage.setItem("selectedMonth", m); return m; }
      const stored = localStorage.getItem("selectedMonth");
      if (stored && /^\d{4}-\d{2}$/.test(stored)) return stored;
    }
    const d = new Date();
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (typeof window !== "undefined") localStorage.setItem("selectedMonth", m);
    return m;
  });

  const selectMonth = (year: number, mon: number) => {
    const m = `${year}-${String(mon).padStart(2, "0")}`;
    setSelectedMonth(m);
    setPickerYear(year);
    setPickerOpen(false);
    localStorage.setItem("selectedMonth", m);
    window.dispatchEvent(new CustomEvent("month-changed", { detail: m }));
    const cur = new URLSearchParams(window.location.search);
    cur.set("month", m);
    router.push(`${pathname}?${cur.toString()}`);
  };

  useEffect(() => {
    setIsPro(localStorage.getItem(getProKey()) === "true");
    const handler = () => setIsPro(localStorage.getItem(getProKey()) === "true");
    window.addEventListener("pro-plan-updated", handler);
    return () => window.removeEventListener("pro-plan-updated", handler);
  }, []);

  const fetchOcrCount = useCallback(async () => {
    try { const res = await api.get("/api/ocr/pending-count"); setOcrPendingCount(res.data.count); }
    catch { /* ignore */ }
  }, []);

  const mainMenu = mainMenuBase.map(item =>
    item.isOcr && ocrPendingCount > 0
      ? { ...item, badge: String(ocrPendingCount) }
      : item
  );

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    /* 낙관적 렌더: localStorage 값으로 즉시 표시 */
    const b = localStorage.getItem("business");
    if (b) {
      try {
        const parsed = JSON.parse(b);
        setBusiness(parsed);
        if (!localStorage.getItem("activeBizId") && parsed?.id) {
          localStorage.setItem("activeBizId", String(parsed.id));
        }
      } catch { /* ignore corrupt data */ }
    }
    const photo = localStorage.getItem("bk-profile-photo");
    if (photo) setProfilePhoto(photo);
    fetchOcrCount();
    const interval = setInterval(fetchOcrCount, 30000);

    /* DB와 동기화: 사업장 없으면 등록 페이지를 메인으로, 있으면 대시보드 */
    api.get("/api/business/").then(res => {
      const list: any[] = res.data;
      if (list.length === 0) {
        setBizReady(true);
        if (!pathname.startsWith("/dashboard/business")) router.push("/dashboard/business");
        return;
      }
      const storedId = Number(localStorage.getItem("activeBizId"));
      const activeBiz = list.find(biz => biz.id === storedId) || list[0];
      setBusiness(activeBiz);
      setBizList(list);
      localStorage.setItem("business", JSON.stringify(activeBiz));
      localStorage.setItem("activeBizId", String(activeBiz.id));
      setBizReady(true);
    }).catch(() => { setBizReady(true); /* 네트워크 오류 시 그대로 렌더 */ });

    return () => clearInterval(interval);
  }, [fetchOcrCount, pathname, router]);

  useEffect(() => {
    const onProfileUpdated = () => {
      const photo = localStorage.getItem("bk-profile-photo");
      setProfilePhoto(photo || null);
    };
    window.addEventListener("profile-photo-updated", onProfileUpdated);
    return () => window.removeEventListener("profile-photo-updated", onProfileUpdated);
  }, []);

  useEffect(() => {
    const onNotifAdded = () => setNotifs(getNotifs());
    window.addEventListener("notif-added", onNotifAdded);
    return () => window.removeEventListener("notif-added", onNotifAdded);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
      if (bizRef.current && !bizRef.current.contains(e.target as Node)) setBizDropOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string; email: string }>).detail;
      setUser((prev: any) => prev ? { ...prev, name: detail.name } : detail);
    };
    window.addEventListener("user-updated", handler);
    return () => window.removeEventListener("user-updated", handler);
  }, []);

  const handleLogout = () => {
    /* pro_plan_{userId}는 사용자가 해지할 때만 삭제 — 로그아웃에서는 건드리지 않음 */
    /* 알림 읽음/삭제 상태는 계정별(userId) 키로 저장되므로 로그아웃 시 건드리지 않음 */
    ["access_token", "user", "business", "activeBizId",
     "bk-profile-photo", "bk-vat-checklist", "selectedMonth"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const MenuItem = ({ item }: { item: any }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: "10px", margin: "1px 8px", textDecoration: "none", backgroundColor: isActive ? "var(--accent)" : "transparent", color: isActive ? "var(--accent-text)" : "var(--text-muted)" }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "15px" }}>{item.icon}</span>
          <span style={{ fontSize: "13px", fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
        </div>
        {item.badge && (
          <span style={{ backgroundColor: "#EF4444", color: "white", fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg)" }}>

      {/* ── 사이드바 ── */}
      <div style={{ width: "200px", minHeight: "100vh", backgroundColor: "var(--bg-surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100 }}>

        {/* 로고 */}
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--accent-text)" strokeLinecap="round" strokeLinejoin="round">
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
            <div>
              <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "14px", lineHeight: 1 }}>SelfERP</p>
              <p style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "3px" }}>소상공인 회계 ERP</p>
            </div>
          </div>
        </div>

        {/* 사업장 선택 */}
        <div ref={bizRef} style={{ padding: "12px 8px", borderBottom: "1px solid var(--border-subtle)", position: "relative" }}>
          <div
            onClick={() => { if (!bizDropOpen) fetchBizList(); setBizDropOpen(v => !v); }}
            style={{ backgroundColor: "var(--bg-surface-2)", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", border: `1px solid ${bizDropOpen ? "var(--accent)" : "var(--border)"}`, transition: "border-color 0.15s" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1.5px solid #C49A30" }}>
              <span style={{ color: "var(--accent-text)", fontWeight: 900, fontSize: "14px" }}>{business?.business_name?.[0] || user?.name?.[0] || "사"}</span>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{business?.business_name || user?.name || "사업장"}</p>
              <p style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "1px" }}>{business?.industry || "개인사업자"}</p>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: "11px", display: "inline-block", transform: bizDropOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>∨</span>
          </div>

          {bizDropOpen && (
            <div style={{ position: "absolute", top: "calc(100% - 4px)", left: "8px", right: "8px", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "var(--shadow-lg)", zIndex: 200, overflow: "hidden" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-subtle)", padding: "10px 12px 4px", letterSpacing: "0.6px" }}>사업장 전환</p>
              {bizList.length === 0 && <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 12px 12px", textAlign: "center" }}>불러오는 중...</p>}
              {bizList.map((biz: any) => {
                const isActive = biz.id === business?.id;
                return (
                  <div key={biz.id} onClick={() => switchBusiness(biz)}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", cursor: "pointer", backgroundColor: isActive ? "var(--accent-light)" : "transparent" }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = isActive ? "var(--accent-light)" : "transparent"; }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: isActive ? "var(--accent)" : "var(--bg-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: isActive ? "1.5px solid #C49A30" : "1px solid var(--border)" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: isActive ? "var(--accent-text)" : "var(--text-muted)" }}>{biz.business_name?.[0] || "사"}</span>
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <p style={{ fontSize: "12px", fontWeight: isActive ? 700 : 500, color: isActive ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{biz.business_name}</p>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>{biz.industry || "개인사업자"}</p>
                    </div>
                    {isActive && <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 800 }}>✓</span>}
                  </div>
                );
              })}
              <div style={{ height: 1, backgroundColor: "var(--border)", margin: "4px 8px" }} />
              <div onClick={() => { setBizDropOpen(false); router.push("/dashboard/business"); }}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", cursor: "pointer", color: "var(--text-muted)" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: "var(--bg-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>+</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>사업장 추가</span>
              </div>
            </div>
          )}
        </div>

        {/* 메뉴 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-subtle)", padding: "8px 16px 4px", letterSpacing: "0.8px" }}>메인</p>
          {mainMenu.map(item => <MenuItem key={item.href} item={item} />)}
          <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-subtle)", padding: "12px 16px 4px", letterSpacing: "0.8px" }}>인사관리</p>
          {hrMenu.map(item => <MenuItem key={item.href} item={item} />)}
          <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-subtle)", padding: "12px 16px 4px", letterSpacing: "0.8px" }}>회계관리</p>
          {accountingMenu.map(item => <MenuItem key={item.href} item={item} />)}
          <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-subtle)", padding: "12px 16px 4px", letterSpacing: "0.8px" }}>생산관리</p>
          {productionMenu.map(item => <MenuItem key={item.href} item={item} />)}
          <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-subtle)", padding: "12px 16px 4px", letterSpacing: "0.8px" }}>인사이트</p>
          {insightMenu.map(item => <MenuItem key={item.href} item={item} />)}
          <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-subtle)", padding: "12px 16px 4px", letterSpacing: "0.8px" }}>설정</p>
          {settingMenu.map(item => <MenuItem key={item.href} item={item} />)}
        </div>

        {/* PRO 플랜 배너 */}
        <div style={{ margin: "8px", marginBottom: "12px", padding: "14px 14px 16px", backgroundColor: "var(--accent-light)", borderRadius: "14px", border: "1px solid rgba(255,190,80,0.2)" }}>
          <p style={{ color: "var(--accent)", fontSize: "10px", fontWeight: 700, marginBottom: "4px" }}>✦ PRO 플랜</p>
          <p style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "12px", lineHeight: 1.5 }}>부가세 신고도<br />자동으로!</p>
          <button
            onClick={() => router.push(isPro ? "/dashboard/vat" : "/dashboard/pro")}
            style={{ marginTop: "10px", fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}>
            {isPro ? "부가세 신고 →" : "PRO 플랜 가입 →"}
          </button>
        </div>
      </div>

      {/* ── 메인 영역 ── */}
      <div style={{ marginLeft: "200px", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* 헤더 */}
        <div style={{ height: "56px", backgroundColor: "var(--bg-surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 99 }}>

          {/* 검색 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", width: "320px" }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && searchVal.trim()) { router.push(`/dashboard/ledger?q=${encodeURIComponent(searchVal.trim())}`); setSearchVal(""); } }}
              placeholder="거래처, 금액, 영수증, 계정과목으로 검색..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: "13px", color: "var(--text-primary)", width: "100%" }}
            />
            <span style={{ color: "var(--text-subtle)", fontSize: "11px", backgroundColor: "var(--bg-surface-3)", padding: "2px 6px", borderRadius: "4px" }}>Enter</span>
          </div>

          {/* 우측 */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* 월 선택 달력 */}
            {(() => {
              const [dispY, dispM] = selectedMonth.split("-").map(Number);
              const nowD = new Date();
              return (
                <div ref={pickerRef} style={{ position: "relative" }}>
                  <div
                    onClick={() => { setPickerOpen(v => !v); setPickerYear(dispY); }}
                    style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer", backgroundColor: pickerOpen ? "var(--bg-surface-3)" : "var(--bg-surface-2)", userSelect: "none" }}>
                    <span>📅</span>
                    <span>{dispY}.{String(dispM).padStart(2, "0")} · {dispM}월</span>
                    <span style={{ color: "var(--text-subtle)", fontSize: "11px" }}>{pickerOpen ? "∧" : "∨"}</span>
                  </div>
                  {pickerOpen && (
                    <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "224px", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow-lg)", zIndex: 300, padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <button onClick={() => setPickerYear(y => y - 1)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-surface-2)", cursor: "pointer", fontSize: "15px", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{pickerYear}년</span>
                        <button onClick={() => setPickerYear(y => y + 1)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-surface-2)", cursor: "pointer", fontSize: "15px", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(mon => {
                          const isSelected = pickerYear === dispY && mon === dispM;
                          const isFuture = pickerYear > nowD.getFullYear() || (pickerYear === nowD.getFullYear() && mon > nowD.getMonth() + 1);
                          return (
                            <button key={mon} onClick={() => selectMonth(pickerYear, mon)}
                              style={{ padding: "8px 4px", borderRadius: "8px", border: isSelected ? "1.5px solid #C49A30" : "1px solid transparent", cursor: "pointer", fontSize: "12px", fontWeight: isSelected ? 800 : 500, backgroundColor: isSelected ? "var(--accent)" : "transparent", color: isSelected ? "var(--accent-text)" : isFuture ? "var(--text-subtle)" : "var(--text-primary)", transition: "background 0.1s" }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}>
                              {mon}월
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={() => selectMonth(nowD.getFullYear(), nowD.getMonth() + 1)} style={{ marginTop: "10px", width: "100%", padding: "7px", border: "1px solid var(--border)", borderRadius: "8px", background: "none", cursor: "pointer", fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>
                        이번 달로 돌아가기
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 거래 추가 */}
            <button
              onClick={() => router.push("/dashboard?modal=journal")}
              style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(255,190,80,0.25)" }}>
              <span>+</span> 거래 추가
            </button>

            <ThemeToggle />

            {/* 알림 */}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                onClick={() => setNotifOpen(v => !v)}
                style={{ width: "36px", height: "36px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: notifOpen ? "var(--bg-surface-3)" : "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <Bell size={16} color="var(--text-secondary)" />
                {unreadCount > 0 && <span style={{ position: "absolute", top: "6px", right: "6px", width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#EF4444", border: "2px solid var(--bg-surface)" }} />}
              </button>

              {notifOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "320px", backgroundColor: "var(--bg-surface)", borderRadius: "14px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", zIndex: 200, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>알림</span>
                      {unreadCount > 0 && (
                        <span style={{ fontSize: "11px", backgroundColor: "#EF4444", color: "white", padding: "2px 7px", borderRadius: "99px", fontWeight: 700 }}>{unreadCount}개 새 알림</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead}
                          style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                          <CheckCheck size={13} /> 모두 읽음
                        </button>
                      )}
                      {notifs.length > 0 && (
                        <button onClick={handleDeleteAll}
                          style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                          <Trash2 size={13} /> 모두 삭제
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                    {notifs.length === 0 ? (
                      <p style={{ padding: "32px 16px", textAlign: "center", fontSize: "13px", color: "var(--text-muted)" }}>알림이 없습니다.</p>
                    ) : notifs.map((n, i) => {
                      const isUnread = !readIds.has(n.id);
                      const isHovered = hoveredNotifId === n.id;
                      return (
                        <div key={n.id} style={{ position: "relative" }}
                          onMouseEnter={() => setHoveredNotifId(n.id)}
                          onMouseLeave={() => setHoveredNotifId(null)}>
                          <Link href={n.link}
                            onClick={() => { markRead(n.id); setNotifOpen(false); }}
                            style={{ display: "flex", gap: "10px", padding: "11px 40px 11px 16px", textDecoration: "none", borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)", backgroundColor: isHovered ? "var(--bg-surface-2)" : isUnread ? "var(--accent-light)" : "transparent", transition: "background 0.15s" }}>
                            <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: isUnread ? n.dot : "transparent", flexShrink: 0, marginTop: "5px", border: isUnread ? "none" : "1px solid var(--border-subtle)" }} />
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5, fontWeight: isUnread ? 600 : 400 }}>{n.text}</p>
                              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{formatNotifTime(n.createdAt)}</p>
                            </div>
                          </Link>
                          {isHovered && (
                            <button onClick={e => handleDeleteNotif(n.id, e)}
                              style={{ position: "absolute", top: "50%", right: "12px", transform: "translateY(-50%)", width: "22px", height: "22px", borderRadius: "5px", border: "none", backgroundColor: "var(--bg-surface-3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 유저 드롭다운 */}
            <div ref={userMenuRef} style={{ position: "relative" }}>
              <div
                onClick={() => setUserMenuOpen(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", backgroundColor: userMenuOpen ? "var(--bg-surface-2)" : "var(--bg-surface)" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #C49A30", overflow: "hidden", flexShrink: 0 }}>
                  {profilePhoto
                    ? <img src={profilePhoto} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "12px" }}>{user?.name?.[0] || "U"}</span>}
                </div>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{user?.name || "사용자"}</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{business?.business_name || "사업장"}</p>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: "12px", display: "inline-block", transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>∨</span>
              </div>

              {userMenuOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "220px", backgroundColor: "var(--bg-surface)", borderRadius: "14px", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", zIndex: 200, overflow: "hidden" }}>
                  <div style={{ padding: "16px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{user?.name || "사용자"}님</p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{user?.email || ""}</p>
                  </div>
                  <div style={{ height: "1px", backgroundColor: "var(--border)", margin: "0 12px" }} />
                  {[
                    { icon: User, label: "내 프로필", href: "/dashboard/profile" },
                    { icon: Building2, label: "사업장 관리", href: "/dashboard/business" },
                    { icon: Shield, label: "보안", href: "/dashboard/security" },
                  ].map(({ icon: Icon, label, href }) => (
                    <Link key={label} href={href} onClick={() => setUserMenuOpen(false)}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", textDecoration: "none", color: "var(--text-secondary)" }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                      <Icon size={15} color="var(--text-muted)" />
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>{label}</span>
                    </Link>
                  ))}
                  <div style={{ height: "1px", backgroundColor: "var(--border)", margin: "0 12px" }} />
                  <button onClick={handleLogout}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                    <LogOut size={15} color="#EF4444" />
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>로그아웃</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 페이지 콘텐츠 */}
        <div style={{ flex: 1, padding: "24px" }}>
          {bizReady ? children : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
              <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ width: "32px", height: "32px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                <p style={{ fontSize: "13px" }}>불러오는 중...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {proModal && <Modal {...proModal} onClose={() => setProModal(null)} />}
    </div>
  );
}
