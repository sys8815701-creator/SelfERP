"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { useRole } from "@/hooks/useRole";

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

export default function PendingRegistrationPage() {
  const role = useRole();
  const [modal, setModal] = useState<ModalConfig | null>(null);

  // 사업장 가입 요청
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinProcessing, setJoinProcessing] = useState<number | null>(null);
  const [joinMsg, setJoinMsg] = useState("");

  const loadJoinRequests = async () => {
    setJoinLoading(true);
    try {
      const res = await api.get("/api/business/join-requests");
      setJoinRequests(res.data);
    } catch { /* ignore */ }
    finally { setJoinLoading(false); }
  };

  useEffect(() => { loadJoinRequests(); }, []);

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
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>가입 승인 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>내 사업장에 가입을 요청한 직원을 검토하고 승인 또는 거절합니다</p>
        </div>
        <button onClick={loadJoinRequests}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          새로 고침
        </button>
      </div>

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
    </div>
  );
}
