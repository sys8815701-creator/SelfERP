"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { useRole } from "@/hooks/useRole";

interface PendingReg {
  id: number;
  status: "pending" | "approved" | "rejected";
  business_name: string;
  business_number: string;
  owner_name: string;
  email: string;
  reject_reason: string | null;
  created_at: string;
}

interface PendingUser {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  department_name: string | null;
  position_name: string | null;
  created_at: string;
}

interface JoinRequest {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string;
  business_id: number;
  business_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "대기 중", approved: "승인됨", rejected: "거절됨",
};
const STATUS_COLOR: Record<string, { color: string; bg: string; border: string }> = {
  pending:  { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "1px solid rgba(245,158,11,0.40)" },
  approved: { color: "#22C55E", bg: "rgba(34,197,94,0.12)",   border: "1px solid rgba(34,197,94,0.40)" },
  rejected: { color: "#EF4444", bg: "rgba(239,68,68,0.12)",   border: "1px solid rgba(239,68,68,0.40)" },
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
  borderRadius: "9px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "14px", outline: "none",
};

export default function PendingRegistrationPage() {
  const role = useRole();
  const [tab, setTab] = useState<"business" | "user" | "join">("user");
  const [modal, setModal] = useState<ModalConfig | null>(null);

  // 사업자 등록 승인
  const [list, setList] = useState<PendingReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingReg | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // 개인 계정 승인
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userProcessing, setUserProcessing] = useState<number | null>(null);
  const [userMsg, setUserMsg] = useState("");

  // 사업장 가입 요청
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinProcessing, setJoinProcessing] = useState<number | null>(null);
  const [joinMsg, setJoinMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/pending-registration/list");
      setList(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const loadPendingUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get("/api/auth/users/pending");
      setPendingUsers(res.data);
    } catch { /* ignore */ }
    finally { setUsersLoading(false); }
  };

  const loadJoinRequests = async () => {
    setJoinLoading(true);
    try {
      const res = await api.get("/api/business/join-requests");
      setJoinRequests(res.data);
    } catch { /* ignore */ }
    finally { setJoinLoading(false); }
  };

  useEffect(() => { load(); loadPendingUsers(); loadJoinRequests(); }, []);

  const approveJoin = async (reqId: number) => {
    setJoinProcessing(reqId); setJoinMsg("");
    try {
      await api.patch(`/api/business/join-requests/${reqId}/approve`);
      setJoinMsg("가입 요청이 승인되었습니다.");
      await loadJoinRequests();
      setTimeout(() => setJoinMsg(""), 3000);
    } catch (e: any) {
      setJoinMsg(e?.response?.data?.detail || "승인 실패");
      setTimeout(() => setJoinMsg(""), 3000);
    } finally { setJoinProcessing(null); }
  };

  const rejectJoin = (reqId: number) => {
    setModal({
      title: "가입 요청 거절",
      message: "이 가입 요청을 거절하시겠습니까?",
      variant: "danger",
      showCancel: true,
      confirmLabel: "거절",
      onConfirm: async () => {
        setJoinProcessing(reqId); setJoinMsg("");
        try {
          await api.patch(`/api/business/join-requests/${reqId}/reject`, { reject_reason: "관리자가 거절하였습니다." });
          setJoinMsg("가입 요청이 거절되었습니다.");
          await loadJoinRequests();
          setTimeout(() => setJoinMsg(""), 3000);
        } catch (e: any) {
          setJoinMsg(e?.response?.data?.detail || "거절 실패");
          setTimeout(() => setJoinMsg(""), 3000);
        } finally { setJoinProcessing(null); }
      },
    });
  };

  const review = async (id: number, action: "approve" | "reject") => {
    setProcessing(true);
    try {
      await api.post(`/api/pending-registration/${id}/review`, {
        action,
        reject_reason: action === "reject" ? rejectReason || "승인이 거절되었습니다" : null,
      });
      setSelected(null);
      setRejectReason("");
      await load();
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail || "처리 중 오류가 발생했습니다", variant: "error" });
    } finally { setProcessing(false); }
  };

  const approveUser = async (userId: number) => {
    setUserProcessing(userId);
    setUserMsg("");
    try {
      await api.patch(`/api/auth/users/${userId}/approve`);
      setUserMsg("계정이 승인되었습니다.");
      await loadPendingUsers();
      setTimeout(() => setUserMsg(""), 3000);
    } catch (e: any) {
      setUserMsg(e?.response?.data?.detail || "승인 실패");
      setTimeout(() => setUserMsg(""), 3000);
    } finally { setUserProcessing(null); }
  };

  const rejectUser = (userId: number) => {
    setModal({ title: "거절 확인", message: "이 계정을 거절(삭제)하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "거절",
      onConfirm: async () => {
        setUserProcessing(userId);
        setUserMsg("");
        try {
          await api.delete(`/api/auth/users/${userId}`);
          setUserMsg("계정이 거절되었습니다.");
          await loadPendingUsers();
          setTimeout(() => setUserMsg(""), 3000);
        } catch (e: any) {
          setUserMsg(e?.response?.data?.detail || "거절 실패");
          setTimeout(() => setUserMsg(""), 3000);
        } finally { setUserProcessing(null); }
      } });
  };

  const filtered = list.filter(r => filter === "all" || r.status === filter);

  if (role !== "admin") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "10px", color: "var(--text-muted)" }}>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>접근 권한이 없습니다</p>
        <p style={{ fontSize: "13px" }}>가입 승인 관리는 사업장 관리자(admin)만 확인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>회원가입 승인 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>신규 가입 신청을 검토하고 승인 또는 거절합니다</p>
        </div>
        <button onClick={() => { load(); loadPendingUsers(); loadJoinRequests(); }}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          새로 고침
        </button>
      </div>

      {/* 메인 탭 */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
        {([
          { key: "user",     label: `개인 계정 승인${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ""}` },
          { key: "business", label: "사업자 등록 승인" },
          { key: "join",     label: `사업장 가입 요청${joinRequests.length > 0 ? ` (${joinRequests.length})` : ""}` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "10px 20px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 700,
              backgroundColor: "transparent",
              color: tab === t.key ? "var(--accent)" : "var(--text-muted)",
              borderBottom: tab === t.key ? "2.5px solid var(--accent)" : "2.5px solid transparent",
              marginBottom: "-1px" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 개인 계정 승인 탭 ── */}
      {tab === "user" && (
        <>
          {userMsg && (
            <div style={{ marginBottom: "16px", padding: "10px 16px", borderRadius: "10px",
              backgroundColor: userMsg.includes("실패") || userMsg.includes("거절") ? "rgba(220,38,38,0.10)" : "rgba(22,163,74,0.10)",
              border: `1px solid ${userMsg.includes("실패") || userMsg.includes("거절") ? "rgba(220,38,38,0.40)" : "rgba(22,163,74,0.40)"}`,
              color: userMsg.includes("실패") || userMsg.includes("거절") ? "#DC2626" : "#16A34A",
              fontSize: "13px", fontWeight: 600 }}>
              {userMsg}
            </div>
          )}

          {usersLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", color: "var(--text-muted)", fontSize: "13px" }}>
              불러오는 중...
            </div>
          ) : pendingUsers.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", backgroundColor: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>◑</p>
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>승인 대기 중인 개인 계정이 없습니다</p>
            </div>
          ) : (
            <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                    {["이름", "이메일", "연락처", "부서 / 직급", "신청일", ""].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u, i) => (
                    <tr key={u.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{u.name || "—"}</p>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-muted)" }}>{u.email}</td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-muted)" }}>{u.phone || "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                        {[u.department_name, u.position_name].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)" }}>
                        {new Date(u.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button onClick={() => approveUser(u.id)} disabled={userProcessing === u.id}
                            style={{ padding: "6px 14px", borderRadius: "8px", backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", color: "var(--accent)", fontSize: "12px", fontWeight: 700, cursor: "pointer", opacity: userProcessing === u.id ? 0.7 : 1 }}>
                            승인
                          </button>
                          <button onClick={() => rejectUser(u.id)} disabled={userProcessing === u.id}
                            style={{ padding: "6px 14px", borderRadius: "8px", backgroundColor: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.40)", color: "#EF4444", fontSize: "12px", fontWeight: 700, cursor: "pointer", opacity: userProcessing === u.id ? 0.7 : 1 }}>
                            거절
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── 사업자 등록 승인 탭 ── */}
      {tab === "business" && (
        <>
          {/* 필터 탭 */}
          <div style={{ display: "flex", gap: "2px", marginBottom: "20px", backgroundColor: "var(--bg-surface-2)", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
            {(["pending", "all", "approved", "rejected"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "7px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
                  backgroundColor: filter === f ? "var(--bg-surface)" : "transparent",
                  color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: filter === f ? "var(--shadow)" : "none" }}>
                {f === "all" ? "전체" : f === "pending" ? `대기 중 (${list.filter(r => r.status === "pending").length})` : f === "approved" ? "승인됨" : "거절됨"}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", color: "var(--text-muted)", fontSize: "13px" }}>
              불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", backgroundColor: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>◉</p>
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                {filter === "pending" ? "대기 중인 신청이 없습니다" : "해당 상태의 신청이 없습니다"}
              </p>
            </div>
          ) : (
            <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                    {["상호명", "사업자번호", "대표자", "이메일", "신청일", "상태", ""].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{r.business_name}</p>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {r.business_number.replace(/(\d{3})(\d{2})(\d{5})/, "$1-$2-$3")}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>{r.owner_name}</td>
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)" }}>{r.email}</td>
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)" }}>
                        {new Date(r.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: STATUS_COLOR[r.status]?.color, backgroundColor: STATUS_COLOR[r.status]?.bg, border: STATUS_COLOR[r.status]?.border, padding: "3px 10px", borderRadius: "99px" }}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {r.status === "pending" && (
                          <button onClick={() => { setSelected(r); setRejectReason(""); }}
                            style={{ padding: "6px 14px", borderRadius: "8px", backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", color: "var(--accent)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                            검토
                          </button>
                        )}
                        {r.status === "rejected" && r.reject_reason && (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{r.reject_reason.slice(0, 20)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}


          {/* 검토 모달 */}
          {selected && (
            <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
              <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "20px", padding: "32px", width: "480px", border: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "20px" }}>가입 신청 검토</h3>

                <div style={{ backgroundColor: "var(--bg-surface-2)", borderRadius: "14px", padding: "16px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { label: "상호명",    value: selected.business_name },
                    { label: "사업자번호", value: selected.business_number.replace(/(\d{3})(\d{2})(\d{5})/, "$1-$2-$3") },
                    { label: "대표자",    value: selected.owner_name },
                    { label: "이메일",    value: selected.email },
                    { label: "신청일",    value: new Date(selected.created_at).toLocaleString("ko-KR") },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{row.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                    거절 사유 (거절 시 입력)
                  </label>
                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="거절 사유를 입력하세요 (선택)" style={inputStyle} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <button onClick={() => setSelected(null)}
                    style={{ padding: "11px", borderRadius: "9px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    취소
                  </button>
                  <button onClick={() => review(selected.id, "reject")} disabled={processing}
                    style={{ padding: "11px", borderRadius: "9px", border: "1.5px solid rgba(239,68,68,0.40)", backgroundColor: "rgba(239,68,68,0.12)", color: "#EF4444", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: processing ? 0.7 : 1 }}>
                    거절
                  </button>
                  <button onClick={() => review(selected.id, "approve")} disabled={processing}
                    style={{ padding: "11px", borderRadius: "9px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: processing ? 0.7 : 1 }}>
                    {processing ? "처리 중" : "승인"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 사업장 가입 요청 탭 ── */}
      {tab === "join" && (
        <>
          {joinMsg && (
            <div style={{ marginBottom: "16px", padding: "10px 16px", borderRadius: "10px",
              backgroundColor: joinMsg.includes("실패") || joinMsg.includes("거절") ? "rgba(220,38,38,0.10)" : "rgba(22,163,74,0.10)",
              border: `1px solid ${joinMsg.includes("실패") || joinMsg.includes("거절") ? "rgba(220,38,38,0.40)" : "rgba(22,163,74,0.40)"}`,
              color: joinMsg.includes("실패") || joinMsg.includes("거절") ? "#DC2626" : "#16A34A",
              fontSize: "13px", fontWeight: 600 }}>
              {joinMsg}
            </div>
          )}

          {joinLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", color: "var(--text-muted)", fontSize: "13px" }}>
              불러오는 중...
            </div>
          ) : joinRequests.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", backgroundColor: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>🏢</p>
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>대기 중인 사업장 가입 요청이 없습니다</p>
            </div>
          ) : (
            <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                    {["신청자", "이메일", "사업장명", "신청일", ""].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {joinRequests.map((r, i) => (
                    <tr key={r.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{r.user_name || "—"}</p>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-muted)" }}>{r.user_email}</td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>{r.business_name}</td>
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)" }}>
                        {new Date(r.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button onClick={() => approveJoin(r.id)} disabled={joinProcessing === r.id}
                            style={{ padding: "6px 14px", borderRadius: "8px", backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", color: "var(--accent)", fontSize: "12px", fontWeight: 700, cursor: "pointer", opacity: joinProcessing === r.id ? 0.7 : 1 }}>
                            승인
                          </button>
                          <button onClick={() => rejectJoin(r.id)} disabled={joinProcessing === r.id}
                            style={{ padding: "6px 14px", borderRadius: "8px", backgroundColor: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.40)", color: "#EF4444", fontSize: "12px", fontWeight: 700, cursor: "pointer", opacity: joinProcessing === r.id ? 0.7 : 1 }}>
                            거절
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
