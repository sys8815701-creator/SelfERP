"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Summary {
  dept_count: number;
  position_count: number;
  employee_count: number;
  new_hires_this_month: number;
  dept_stats: { name: string; count: number }[];
}

export default function HRPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bizId = localStorage.getItem("activeBizId");
    api.get("/api/hr/summary", { headers: bizId ? { "X-Business-Id": bizId } : {} })
      .then(r => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = summary ? [
    { label: "재직 중 직원", value: summary.employee_count, unit: "명", icon: "◉", href: "/dashboard/hr/employees" },
    { label: "부서 수",     value: summary.dept_count,     unit: "개", icon: "◎", href: "/dashboard/hr/departments" },
    { label: "직급 수",     value: summary.position_count, unit: "개", icon: "◑", href: "/dashboard/hr/departments" },
    { label: "이번 달 입사", value: summary.new_hires_this_month, unit: "명", icon: "◐", href: "/dashboard/hr/employees" },
  ] : [];

  const shortcuts = [
    { label: "직원 관리",  desc: "직원 정보 조회 및 등록",    icon: "◉", href: "/dashboard/hr/employees" },
    { label: "부서 · 직급", desc: "조직 구조 설정",           icon: "◎", href: "/dashboard/hr/departments" },
    { label: "계약서 관리", desc: "근로·거래처 계약서",       icon: "◑", href: "/dashboard/hr/contracts" },
    { label: "휴가 관리",  desc: "연차·반차 신청 및 승인",    icon: "◐", href: "/dashboard/hr/leave" },
    { label: "급여 정산",  desc: "급여·가불·퇴직금 관리",     icon: "◒", href: "/dashboard/hr/payroll" },
  ];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>인사 관리</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>직원·부서·계약·급여 통합 관리</p>
      </div>

      {/* 요약 카드 */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px", height: "90px" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
          {cards.map(c => (
            <div key={c.label} onClick={() => router.push(c.href)}
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(255,190,80,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <div style={{ fontSize: "20px", marginBottom: "10px" }}>{c.icon}</div>
              <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                {c.value}<span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginLeft: "4px" }}>{c.unit}</span>
              </p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* 빠른 메뉴 */}
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>빠른 메뉴</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {shortcuts.map(s => (
              <div key={s.label} onClick={() => router.push(s.href)}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", cursor: "pointer", border: "1px solid transparent", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "var(--accent-light)", border: "1px solid rgba(255,190,80,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "var(--accent)", flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{s.label}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>{s.desc}</p>
                </div>
                <span style={{ marginLeft: "auto", color: "var(--text-subtle)", fontSize: "16px" }}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* 부서별 인원 현황 */}
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>부서별 인원 현황</h3>
          {!summary || summary.dept_stats.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "160px", gap: "10px" }}>
              <span style={{ fontSize: "32px", opacity: 0.3 }}>◎</span>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>등록된 부서가 없습니다.</p>
              <button onClick={() => router.push("/dashboard/hr/departments")}
                style={{ fontSize: "12px", color: "var(--accent)", background: "none", border: "1px solid var(--accent)", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>
                부서 등록하기
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {summary.dept_stats.map(d => {
                const max = Math.max(...summary.dept_stats.map(x => x.count), 1);
                const pct = Math.round((d.count / max) * 100);
                return (
                  <div key={d.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{d.name}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{d.count}명</span>
                    </div>
                    <div style={{ height: "6px", backgroundColor: "var(--bg-surface-2)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "var(--accent)", borderRadius: "3px", transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
