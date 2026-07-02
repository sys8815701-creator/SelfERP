"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";

interface Employee { id: number; name: string; }
interface Leave {
  id: number;
  employee_id: number;
  employee_name: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  note: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  대기:  { text: "#F59E0B", bg: "#F59E0B18" },
  승인:  { text: "#22C55E", bg: "#22C55E18" },
  거절:  { text: "#EF4444", bg: "#EF444418" },
};

const LEAVE_TYPES = ["연차", "반차(오전)", "반차(오후)", "병가", "경조사", "무급", "기타"];
const EMPTY_FORM = {
  employee_id: "" as string | number,
  leave_type: "연차", start_date: "", end_date: "", days: 1, reason: "", note: "",
};

export default function LeavePage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEmp, setFilterEmp] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bizHeaders = () => {
    const id = localStorage.getItem("activeBizId");
    return id ? { "X-Business-Id": id } : {};
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterEmp) params.employee_id = filterEmp;
      const [lRes, eRes] = await Promise.all([
        api.get("/api/hr/leaves", { headers: bizHeaders(), params }),
        api.get("/api/hr/employees", { headers: bizHeaders(), params: { status: "" } }),
      ]);
      setLeaves(lRes.data);
      setEmployees(eRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [filterStatus, filterEmp]);

  const openCreate = () => { setEditingLeave(null); setForm({ ...EMPTY_FORM, start_date: new Date().toISOString().split("T")[0], end_date: new Date().toISOString().split("T")[0] }); setError(""); setShowModal(true); };
  const openEdit = (lv: Leave) => {
    setEditingLeave(lv);
    setForm({ employee_id: lv.employee_id, leave_type: lv.leave_type, start_date: lv.start_date, end_date: lv.end_date, days: lv.days, reason: lv.reason || "", note: lv.note || "" });
    setError(""); setShowModal(true);
  };

  const saveLeave = async () => {
    if (!form.employee_id) { setError("직원을 선택하세요."); return; }
    if (!form.start_date || !form.end_date) { setError("날짜를 입력하세요."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, employee_id: Number(form.employee_id) };
      if (editingLeave) await api.put(`/api/hr/leaves/${editingLeave.id}`, payload, { headers: bizHeaders() });
      else await api.post("/api/hr/leaves", payload, { headers: bizHeaders() });
      setShowModal(false); fetchAll();
    } catch (e: any) { setError(e?.response?.data?.detail || "저장 실패"); }
    setSaving(false);
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.put(`/api/hr/leaves/${id}`, { status }, { headers: bizHeaders() }); fetchAll(); }
    catch { alert("상태 변경 실패"); }
  };

  const deleteLeave = async (id: number) => {
    if (!confirm("휴가 신청을 삭제하시겠습니까?")) return;
    try { await api.delete(`/api/hr/leaves/${id}`, { headers: bizHeaders() }); fetchAll(); }
    catch { alert("삭제 실패"); }
  };

  const pending = leaves.filter(l => l.status === "대기").length;

  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", display: "block" };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>휴가 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>연차 · 반차 · 병가 · 경조사 신청 및 승인</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {pending > 0 && (
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#F59E0B", backgroundColor: "#F59E0B18", padding: "5px 12px", borderRadius: "99px" }}>
              대기 {pending}건
            </span>
          )}
          <button onClick={openCreate}
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            + 휴가 신청
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} style={{ ...inputStyle, width: "160px" }}>
          <option value="">전체 직원</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: "130px" }}>
          <option value="">전체 상태</option>
          {["대기", "승인", "거절"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center" }}>총 {leaves.length}건</span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</div>
      ) : leaves.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", backgroundColor: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>◐</p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>휴가 신청 내역이 없습니다.</p>
          <button onClick={openCreate} style={{ marginTop: "16px", fontSize: "13px", color: "var(--accent)", background: "none", border: "1px solid var(--accent)", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
            첫 번째 휴가 신청
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["직원", "휴가 유형", "기간", "일수", "사유", "상태", ""].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.map((lv, i) => {
                const sc = STATUS_COLORS[lv.status] || STATUS_COLORS["대기"];
                return (
                  <tr key={lv.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--accent-light)", border: "1px solid rgba(255,190,80,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "var(--accent)" }}>
                          {(lv.employee_name || "?")[0]}
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{lv.employee_name || "—"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>{lv.leave_type}</td>
                    <td style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>{lv.start_date} ~ {lv.end_date}</td>
                    <td style={{ padding: "13px 14px", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{lv.days}일</td>
                    <td style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-muted)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lv.reason || "—"}</td>
                    <td style={{ padding: "13px 14px" }}>
                      <select value={lv.status} onChange={e => updateStatus(lv.id, e.target.value)}
                        style={{ fontSize: "11px", fontWeight: 700, color: sc.text, backgroundColor: sc.bg, border: "none", borderRadius: "99px", padding: "4px 10px", cursor: "pointer", outline: "none" }}>
                        {["대기", "승인", "거절"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button onClick={() => openEdit(lv)} style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>수정</button>
                        <button onClick={() => deleteLeave(lv.id)} style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "#EF4444", fontWeight: 600 }}>삭제</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "16px", padding: "28px", width: "440px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>{editingLeave ? "휴가 수정" : "휴가 신청"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={labelStyle}>직원 *</label>
                <select style={inputStyle} value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                  <option value="">직원 선택</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>휴가 유형</label>
                <select style={inputStyle} value={form.leave_type} onChange={e => {
                  const t = e.target.value;
                  const d = t.includes("반차") ? 0.5 : form.days;
                  setForm(f => ({ ...f, leave_type: t, days: d }));
                }}>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><label style={labelStyle}>시작일 *</label><input type="date" style={inputStyle} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>종료일 *</label><input type="date" style={inputStyle} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div><label style={labelStyle}>사용 일수</label>
                <input type="number" step="0.5" min="0.5" style={inputStyle} value={form.days} onChange={e => setForm(f => ({ ...f, days: Number(e.target.value) }))} />
              </div>
              <div><label style={labelStyle}>사유</label><input style={inputStyle} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="휴가 사유" /></div>
              {error && <p style={{ fontSize: "12px", color: "#EF4444" }}>{error}</p>}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>취소</button>
              <button onClick={saveLeave} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent)", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", color: "var(--accent-text)", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>{saving ? "저장 중..." : "저장"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
