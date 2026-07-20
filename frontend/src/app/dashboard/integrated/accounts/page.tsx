"use client";

import { useState, useEffect } from "react";
import { Users, Shield } from "lucide-react";
import api from "@/lib/api";
import { useRole } from "@/hooks/useRole";

const ROLE_LABEL: Record<string, string> = {
  admin:      "최고 관리자 (관리자)",
  accountant: "매니저",
  employee:   "일반 사용자 (뷰어)",
};

const ROLE_COLOR: Record<string, string> = {
  admin:      "#DC2626",
  accountant: "#2563EB",
  employee:   "#6B7280",
};

const ROLE_BG: Record<string, string> = {
  admin:      "rgba(220,38,38,0.10)",
  accountant: "rgba(37,99,235,0.10)",
  employee:   "rgba(107,114,128,0.08)",
};

export default function AccountsPage() {
  const role = useRole();
  const [users, setUsers]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [saving, setSaving]             = useState<number | null>(null);
  const [msg, setMsg]                   = useState("");

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setCurrentUserId(u.id || null);
    } catch {}
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/auth/users");
      setUsers(res.data);
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "사용자 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (userId: number, role: string) => {
    setSaving(userId);
    setMsg("");
    try {
      await api.patch(`/api/auth/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      setMsg("권한이 변경되었습니다.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "변경에 실패했습니다.");
      setTimeout(() => setMsg(""), 3000);
    } finally {
      setSaving(null);
    }
  };

  const card: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    boxShadow: "var(--shadow)",
    padding: "24px",
  };

  if (role !== "admin") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "10px", color: "var(--text-muted)" }}>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>접근 권한이 없습니다</p>
        <p style={{ fontSize: "13px" }}>계정 관리는 사업장 관리자(admin)만 확인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>계정 관리</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>등록된 사용자 계정의 권한을 관리합니다. 자신의 권한은 변경할 수 없습니다.</p>
      </div>

      {msg && (
        <div style={{ marginBottom: "16px", padding: "10px 16px", borderRadius: "10px", backgroundColor: msg.includes("실패") || msg.includes("없") ? "rgba(220,38,38,0.10)" : "rgba(22,163,74,0.10)", border: `1px solid ${msg.includes("실패") || msg.includes("없") ? "rgba(220,38,38,0.40)" : "rgba(22,163,74,0.40)"}`, color: msg.includes("실패") || msg.includes("없") ? "#DC2626" : "#16A34A", fontSize: "13px", fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div style={{ ...card }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "var(--bg-surface)", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={17} color="var(--accent)" />
          </div>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>사용자 목록</span>
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Shield size={12} /> 권한은 즉시 적용됩니다
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontSize: "14px" }}>불러오는 중...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontSize: "14px" }}>등록된 사용자가 없습니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* 헤더 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 180px 180px", gap: "12px", padding: "8px 16px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px" }}>
              {["이름 / 직급", "이메일", "현재 권한", "권한 변경"].map(h => (
                <span key={h} style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.4px" }}>{h}</span>
              ))}
            </div>

            {users.map(u => {
              const isSelf = u.id === currentUserId;
              const color  = ROLE_COLOR[u.role]  || "#6B7280";
              const bg     = ROLE_BG[u.role]     || "rgba(107,114,128,0.08)";
              return (
                <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 180px 180px", gap: "12px", padding: "14px 16px", border: `1px solid ${isSelf ? "var(--accent)" : "var(--border)"}`, borderRadius: "10px", alignItems: "center", backgroundColor: isSelf ? "var(--accent-light)" : "transparent" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{u.name || "—"}</p>
                    {(u.department_name || u.position_name) && (
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {[u.department_name, u.position_name].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {u.employee_number && (
                      <p style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "1px" }}>{u.employee_number}</p>
                    )}
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color, backgroundColor: bg, padding: "4px 12px", borderRadius: "20px", border: `1px solid ${color}30`, whiteSpace: "nowrap" }}>
                      {ROLE_LABEL[u.role] || u.role}
                    </span>
                  </div>
                  <div>
                    {isSelf ? (
                      <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 700 }}>내 계정</span>
                    ) : (
                      <select
                        value={u.role}
                        disabled={saving === u.id}
                        onChange={e => changeRole(u.id, e.target.value)}
                        style={{ padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", cursor: "pointer", width: "100%", opacity: saving === u.id ? 0.6 : 1 }}
                      >
                        <option value="employee">일반 사용자 (뷰어)</option>
                        <option value="accountant">매니저</option>
                        <option value="admin">최고 관리자 (관리자)</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
