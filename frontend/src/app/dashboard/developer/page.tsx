"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { useIsPlatformAdmin } from "@/hooks/useRole";

interface BusinessSummary {
  id: number;
  business_name: string;
  business_number: string | null;
  owner_name: string | null;
  owner_email: string | null;
  created_at: string;
  member_count: number;
  is_pro: boolean;
}

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

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
  borderRadius: "9px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "14px", outline: "none",
};

export default function DeveloperConsolePage() {
  const isPlatformAdmin = useIsPlatformAdmin();
  const [tab, setTab] = useState<"businesses" | "user" | "business">("businesses");
  const [modal, setModal] = useState<ModalConfig | null>(null);

  // 전체 사업장
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [bizLoading, setBizLoading] = useState(true);

  // 신규 사업장 승인
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

  const loadBusinesses = async () => {
    setBizLoading(true);
    try {
      const res = await api.get("/api/platform/businesses");
      setBusinesses(res.data);
    } catch { /* ignore */ }
    finally { setBizLoading(false); }
  };

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

  useEffect(() => { loadBusinesses(); load(); loadPendingUsers(); }, []);

  const togglePro = async (biz: BusinessSummary) => {
    try {
      await api.patch(`/api/platform/businesses/${biz.id}/pro`, { is_pro: !biz.is_pro });
      await loadBusinesses();
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail ?? "변경에 실패했습니다.", variant: "error" });
    }
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
      await loadBusinesses();
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

  if (!isPlatformAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "10px", color: "var(--text-muted)" }}>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>접근 권한이 없습니다</p>
        <p style={{ fontSize: "13px" }}>개발자 콘솔은 플랫폼 관리자만 확인할 수 있습니다</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>개발자 콘솔</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>사업장 소속과 무관한 플랫폼 전체 운영 화면입니다</p>
      </div>

      {/* 메인 탭 */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
        {([
          { key: "businesses", label: `전체 사업장 (${businesses.length})` },
          { key: "user",        label: `개인 계정 승인${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ""}` },
          { key: "business",    label: "신규 사업장 승인" },
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

      {/* ── 전체 사업장 탭 ── */}
      {tab === "businesses" && (
        bizLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", color: "var(--text-muted)", fontSize: "13px" }}>
            불러오는 중...
          </div>
        ) : (
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                  {["상호명", "사업자번호", "대표자", "소유자 이메일", "구성원", "가입일", "PRO", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {businesses.map((b, i) => (
                  <tr key={b.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{b.business_name}</td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace" }}>{b.business_number || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>{b.owner_name || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)" }}>{b.owner_email || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>{b.member_count}명</td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)" }}>{new Date(b.created_at).toLocaleDateString("ko-KR")}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "99px",
                        color: b.is_pro ? "#22C55E" : "#6B7280",
                        backgroundColor: b.is_pro ? "rgba(34,197,94,0.12)" : "rgba(107,114,128,0.10)",
                        border: `1px solid ${b.is_pro ? "rgba(34,197,94,0.40)" : "rgba(107,114,128,0.30)"}` }}>
                        {b.is_pro ? "PRO" : "일반"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button onClick={() => togglePro(b)}
                        style={{ padding: "6px 14px", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                        {b.is_pro ? "PRO 해지" : "PRO 부여"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

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
                    {["이름", "이메일", "연락처", "부서 · 직급", "신청일", ""].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u, i) => (
                    <tr key={u.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
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

      {/* ── 신규 사업장 승인 탭 ── */}
      {tab === "business" && (
        <>
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
                    <tr key={r.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
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
                        <span style={{ fontSize: "11px", fontWeight: 700,
                          color: r.status === "pending" ? "#F59E0B" : r.status === "approved" ? "#22C55E" : "#EF4444",
                          backgroundColor: r.status === "pending" ? "rgba(245,158,11,0.12)" : r.status === "approved" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                          border: `1px solid ${r.status === "pending" ? "rgba(245,158,11,0.40)" : r.status === "approved" ? "rgba(34,197,94,0.40)" : "rgba(239,68,68,0.40)"}`,
                          padding: "3px 10px", borderRadius: "99px" }}>
                          {r.status === "pending" ? "대기 중" : r.status === "approved" ? "승인됨" : "거절됨"}
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
    </div>
  );
}
