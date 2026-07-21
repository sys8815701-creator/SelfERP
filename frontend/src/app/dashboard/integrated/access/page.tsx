"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { useRole } from "@/hooks/useRole";

type Role = "admin" | "manager" | "viewer";

type MenuAccess = {
  module: string;
  label: string;
  admin: boolean;
  manager: boolean;
  viewer: boolean;
};

const DEFAULT_ACCESS: MenuAccess[] = [
  { module: "인사",   label: "직원 관리",      admin: true,  manager: true,  viewer: false },
  { module: "인사",   label: "급여 정산",      admin: true,  manager: false, viewer: false },
  { module: "인사",   label: "계약서",         admin: true,  manager: true,  viewer: true  },
  { module: "인사",   label: "휴가 관리",      admin: true,  manager: true,  viewer: true  },
  { module: "회계",   label: "회계 장부",       admin: true,  manager: true,  viewer: false },
  { module: "회계",   label: "영수증 OCR",     admin: true,  manager: true,  viewer: true  },
  { module: "회계",   label: "경비 정산",      admin: true,  manager: true,  viewer: true  },
  { module: "회계",   label: "거래처 관리",    admin: true,  manager: true,  viewer: false },
  { module: "회계",   label: "미수금 · 미지급금",admin: true,  manager: true,  viewer: false },
  { module: "회계",   label: "재무제표",       admin: true,  manager: false, viewer: false },
  { module: "회계",   label: "세금계산서",     admin: true,  manager: true,  viewer: false },
  { module: "회계",   label: "예산 관리",      admin: true,  manager: true,  viewer: false },
  { module: "생산",   label: "품목 · 재고",      admin: true,  manager: true,  viewer: true  },
  { module: "생산",   label: "생산 지시서",    admin: true,  manager: true,  viewer: true  },
  { module: "생산",   label: "원가 분석",      admin: true,  manager: false, viewer: false },
  { module: "생산",   label: "재고 실사",      admin: true,  manager: true,  viewer: true  },
  { module: "유통",   label: "수주 관리",      admin: true,  manager: true,  viewer: true  },
  { module: "유통",   label: "배송 지시",      admin: true,  manager: true,  viewer: true  },
  { module: "유통",   label: "반품 처리",      admin: true,  manager: true,  viewer: false },
  { module: "통합",   label: "알림 센터",      admin: true,  manager: true,  viewer: true  },
  { module: "통합",   label: "데이터 내보내기",admin: true,  manager: false, viewer: false },
  { module: "통합",   label: "거래처 · 사업장", admin: true,  manager: true,  viewer: false },
  { module: "통합",   label: "경영분석",       admin: true,  manager: true,  viewer: false },
  { module: "통합",   label: "AI 회계비서",    admin: true,  manager: true,  viewer: true  },
  { module: "통합",   label: "환경설정",       admin: true,  manager: true,  viewer: true  },
  { module: "통합",   label: "도움말",         admin: true,  manager: true,  viewer: true  },
  { module: "통합",   label: "권한 관리",      admin: true,  manager: false, viewer: false },
  { module: "통합",   label: "가입 승인 관리", admin: true,  manager: false, viewer: false },
];

const ROLE_LABEL: Record<Role, string> = {
  admin:   "관리자",
  manager: "매니저",
  viewer:  "뷰어",
};

const ROLE_DESC: Record<Role, string> = {
  admin:   "모든 기능에 접근 가능한 최고 권한",
  manager: "조회 및 일반 업무 처리 가능, 급여 · 재무 제외",
  viewer:  "대시보드 및 기본 조회 전용",
};

const MODULE_COLORS: Record<string, string> = {
  "인사": "#3B82F6", "회계": "#F59E0B",
  "생산": "#10B981", "유통": "#8B5CF6", "통합": "#EC4899",
};

export default function AccessPage() {
  const role = useRole();
  const [access, setAccess] = useState<MenuAccess[]>(DEFAULT_ACCESS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterMod, setFilterMod] = useState("전체");
  const [modal, setModal] = useState<ModalConfig | null>(null);

  useEffect(() => {
    api.get("/api/settings/role-access").then(res => {
      if (res.data && Array.isArray(res.data)) {
        // DEFAULT_ACCESS 기준으로 정렬·정제 (삭제된 항목 제거, 신규 항목 추가)
        const defaultLabels = new Set(DEFAULT_ACCESS.map(a => a.label));
        const savedMap = new Map((res.data as MenuAccess[]).map(a => [a.label, a]));
        const merged = DEFAULT_ACCESS.map(a => savedMap.get(a.label) ?? a).filter(a => defaultLabels.has(a.label));
        setAccess(merged);
      }
    }).catch(() => { /* 저장된 설정 없으면 기본값 유지 */ });
  }, []);

  const toggle = (idx: number, role: Role) => {
    if (role === "admin") return; // 관리자 권한은 항상 활성
    setAccess(prev => prev.map((a, i) => i === idx ? { ...a, [role]: !a[role] } : a));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/settings/role-access", access);
      try { localStorage.setItem("role-access", JSON.stringify(access)); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent("role-access-updated"));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setModal({ message: "저장에 실패했습니다. 관리자 권한이 필요합니다.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const modules = ["전체", ...Array.from(new Set(DEFAULT_ACCESS.map(a => a.module)))];
  const filtered = access.filter(a => filterMod === "전체" || a.module === filterMod);

  if (role !== "admin") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "10px", color: "var(--text-muted)" }}>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>접근 권한이 없습니다</p>
        <p style={{ fontSize: "13px" }}>권한 관리는 사업장 관리자(admin)만 확인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>권한 관리</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>역할(Role)별 메뉴 접근 권한을 설정합니다. 관리자는 항상 전체 접근 권한을 가집니다</p>
      </div>

      {/* 역할 설명 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {(["admin", "manager", "viewer"] as Role[]).map(role => (
          <div key={role} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "var(--shadow)", padding: "16px" }}>
            <p style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>{ROLE_LABEL[role]}</p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>{ROLE_DESC[role]}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {modules.map(m => (
            <button key={m} onClick={() => setFilterMod(m)}
              style={{ padding: "6px 14px", borderRadius: "20px", border: `1px solid ${filterMod === m ? "var(--accent)" : "var(--border)"}`,
                backgroundColor: filterMod === m ? "var(--accent)" : "var(--bg-surface)",
                color: filterMod === m ? "var(--accent-text)" : "var(--text-muted)",
                fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              {m}
            </button>
          ))}
        </div>
        <button onClick={save} disabled={saving}
          style={{ padding: "8px 20px", borderRadius: "8px", backgroundColor: saved ? "rgba(34,197,94,0.12)" : "var(--accent-light)", color: saved ? "#22C55E" : "var(--accent)",
            border: saved ? "1.5px solid rgba(34,197,94,0.40)" : "1.5px solid #C49A30", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "저장 중..." : saved ? "저장됨 ✓" : "변경사항 저장"}
        </button>
      </div>

      {/* 권한 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", width: "80px" }}>모듈</th>
              <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "var(--text-muted)" }}>메뉴</th>
              {(["admin", "manager", "viewer"] as Role[]).map(r => (
                <th key={r} style={{ textAlign: "center", padding: "12px 16px", fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", width: "100px" }}>
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => {
              const color = MODULE_COLORS[item.module] ?? "#6B7280";
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px",
                      backgroundColor: `${color}18`, border: `1px solid ${color}60`, color }}>
                      {item.module}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{item.label}</td>
                  {(["admin", "manager", "viewer"] as Role[]).map(role => {
                    const checked = item[role];
                    const disabled = role === "admin";
                    return (
                      <td key={role} style={{ textAlign: "center", padding: "12px 16px" }}>
                        <div
                          onClick={() => { const idx = access.indexOf(item); toggle(idx, role); }}
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: "22px", height: "22px", borderRadius: "5px", cursor: disabled ? "default" : "pointer",
                            backgroundColor: checked ? (role === "admin" ? "#6B7280" : "var(--accent)") : "var(--bg-surface-2)",
                            border: `1px solid ${checked ? "transparent" : "var(--border)"}`,
                            opacity: disabled ? 0.7 : 1 }}>
                          {checked && <span style={{ color: role === "admin" ? "white" : "var(--accent-text)", fontSize: "13px", fontWeight: 900 }}>✓</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", textAlign: "center" }}>
        * 권한 변경은 저장 후 즉시 적용됩니다. 사이드바 메뉴 노출 여부를 역할별로 제어합니다.
      </p>
    </div>
  );
}
