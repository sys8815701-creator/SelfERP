"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { useRole, canWrite, canDelete } from "@/hooks/useRole";

interface Employee { id: number; name: string; }
interface Contract {
  id: number;
  title: string;
  contract_type: string;
  counterparty: string | null;
  employee_id: number | null;
  employee_name: string | null;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  sign_status: string;
  note: string | null;
  created_at: string;
}

const SIGN_STATUS_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  작성중:   { text: "#6B7280", bg: "rgba(107,114,128,0.10)", border: "1px solid rgba(107,114,128,0.30)" },
  서명요청: { text: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "1px solid rgba(245,158,11,0.40)" },
  서명완료: { text: "#22C55E", bg: "rgba(34,197,94,0.12)",   border: "1px solid rgba(34,197,94,0.40)" },
  거절:     { text: "#EF4444", bg: "rgba(239,68,68,0.12)",   border: "1px solid rgba(239,68,68,0.40)" },
};

const CONTRACT_TYPES = ["근로계약서", "거래처계약서", "인사계약서", "기타"];
const EMPTY_FORM = {
  title: "", contract_type: "근로계약서", counterparty: "",
  employee_id: "" as string | number, start_date: "", end_date: "",
  amount: 0, note: "",
};

export default function ContractsPage() {
  const role = useRole();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterSign, setFilterSign] = useState("");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const bizHeaders = () => {
    const id = localStorage.getItem("activeBizId");
    return id ? { "X-Business-Id": id } : {};
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.contract_type = filterType;
      const [cRes, eRes] = await Promise.all([
        api.get("/api/hr/contracts", { headers: bizHeaders(), params }),
        api.get("/api/hr/employees", { headers: bizHeaders(), params: { status: "" } }),
      ]);
      setContracts(cRes.data);
      setEmployees(eRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [filterType]);

  const filtered = useMemo(() =>
    contracts.filter(c => {
      if (filterSign && c.sign_status !== filterSign) return false;
      if (search && !c.title.includes(search) && !(c.counterparty || "").includes(search) && !(c.employee_name || "").includes(search)) return false;
      return true;
    }), [contracts, filterSign, search]);

  const openCreate = () => { setEditingContract(null); setForm({ ...EMPTY_FORM }); setError(""); setShowModal(true); };
  const openEdit = (c: Contract) => {
    setEditingContract(c);
    setForm({ title: c.title, contract_type: c.contract_type, counterparty: c.counterparty || "", employee_id: c.employee_id ?? "", start_date: c.start_date || "", end_date: c.end_date || "", amount: c.amount, note: c.note || "" });
    setError(""); setShowModal(true);
  };

  const saveContract = async () => {
    if (!form.title.trim()) { setError("계약서 제목을 입력하세요"); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, employee_id: form.employee_id ? Number(form.employee_id) : null, start_date: form.start_date || null, end_date: form.end_date || null };
      if (editingContract) await api.put(`/api/hr/contracts/${editingContract.id}`, payload, { headers: bizHeaders() });
      else await api.post("/api/hr/contracts", payload, { headers: bizHeaders() });
      setShowModal(false); fetchAll();
    } catch (e: any) { setError(e?.response?.data?.detail || "저장 실패"); }
    setSaving(false);
  };

  const updateSignStatus = async (id: number, sign_status: string) => {
    try { await api.put(`/api/hr/contracts/${id}`, { sign_status }, { headers: bizHeaders() }); fetchAll(); }
    catch { setModal({ message: "상태 변경 실패", variant: "error" }); }
  };

  const deleteContract = (id: number) => {
    setModal({ title: "삭제 확인", message: "계약서를 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        try { await api.delete(`/api/hr/contracts/${id}`, { headers: bizHeaders() }); fetchAll(); }
        catch { setModal({ message: "삭제 실패", variant: "error" }); }
      } });
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", display: "block" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>계약서 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>근로계약서 · 거래처계약서 · 인사계약서</p>
        </div>
        {canWrite(role) && (
          <button onClick={openCreate}
            style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            + 계약서 추가
          </button>
        )}
      </div>

      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", padding: "14px 18px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제목 · 상대방 · 직원 검색"
          style={{ ...inputStyle, width: "220px" }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, width: "150px" }}>
          <option value="">전체 유형</option>
          {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterSign} onChange={e => setFilterSign(e.target.value)} style={{ ...inputStyle, width: "140px" }}>
          <option value="">전체 상태</option>
          {["작성중", "서명요청", "서명완료", "거절"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center" }}>총 {filtered.length}건</span>
      </div>

      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", padding: "22px" }}>
        {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "200px", textAlign: "center", padding: "40px 20px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>◑</p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>등록된 계약서가 없습니다</p>
          {canWrite(role) && (
            <button onClick={openCreate} style={{ marginTop: "16px", fontSize: "13px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
              첫 번째 계약서 추가
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(c => {
            const sc = SIGN_STATUS_COLORS[c.sign_status] || SIGN_STATUS_COLORS["작성중"];
            const isExpiring = c.end_date && new Date(c.end_date) < new Date(Date.now() + 30 * 86400000);
            return (
              <div key={c.id} style={{ backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: "var(--accent-light)", border: "1px solid rgba(255,190,80,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>◑</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                    {isExpiring && <span style={{ fontSize: "10px", fontWeight: 700, color: "#EF4444", backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.40)", padding: "2px 8px", borderRadius: "99px", flexShrink: 0 }}>만료 임박</span>}
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{c.contract_type}</span>
                    {c.counterparty && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>· {c.counterparty}</span>}
                    {c.employee_name && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>· {c.employee_name}</span>}
                    {c.start_date && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>· {c.start_date} ~ {c.end_date || "무기한"}</span>}
                    {c.amount > 0 && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>· {c.amount.toLocaleString()}원</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {canWrite(role) ? (
                    <select value={c.sign_status} onChange={e => updateSignStatus(c.id, e.target.value)}
                      style={{ fontSize: "11px", fontWeight: 700, color: sc.text, backgroundColor: sc.bg, border: sc.border, borderRadius: "99px", padding: "4px 10px", cursor: "pointer", outline: "none" }}>
                      {["작성중", "서명요청", "서명완료", "거절"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span style={{ fontSize: "11px", fontWeight: 700, color: sc.text, backgroundColor: sc.bg, border: sc.border, borderRadius: "99px", padding: "4px 10px" }}>
                      {c.sign_status}
                    </span>
                  )}
                  {canWrite(role) && (
                    <button onClick={() => openEdit(c)} style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>수정</button>
                  )}
                  {canDelete(role) && (
                    <button onClick={() => deleteContract(c.id)} style={{ padding: "5px 10px", borderRadius: "7px", backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.40)", cursor: "pointer", fontSize: "12px", color: "#EF4444", fontWeight: 600 }}>삭제</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "16px", padding: "28px", width: "480px", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>{editingContract ? "계약서 수정" : "계약서 추가"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={labelStyle}>제목 *</label><input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="계약서 제목" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><label style={labelStyle}>유형</label>
                  <select style={inputStyle} value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}>
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>연결 직원</label>
                  <select style={inputStyle} value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                    <option value="">선택 안함</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>계약 상대방</label><input style={inputStyle} value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} placeholder="회사명 또는 성명" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><label style={labelStyle}>시작일</label><input type="date" style={inputStyle} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>종료일</label><input type="date" style={inputStyle} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div><label style={labelStyle}>계약 금액 (원)</label><input type="number" style={inputStyle} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
              <div><label style={labelStyle}>메모</label><textarea style={{ ...inputStyle, height: "70px", resize: "none" }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
              {error && <p style={{ fontSize: "12px", color: "#EF4444" }}>{error}</p>}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>취소</button>
              <button onClick={saveContract} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", color: "var(--accent)", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>{saving ? "저장 중..." : "저장"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
