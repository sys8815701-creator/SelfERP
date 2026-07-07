"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";

interface Department {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  parent_id: number | null;
  employee_count: number;
  created_at: string;
}

interface Position {
  id: number;
  name: string;
  level: number;
  description: string | null;
  employee_count: number;
}

type Tab = "dept" | "pos";

const emptyDept = { name: "", code: "", description: "", parent_id: null as number | null };
const emptyPos  = { name: "", level: 1, description: "" };

export default function DepartmentsPage() {
  const [tab, setTab] = useState<Tab>("dept");

  const [depts, setDepts] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showPosModal, setShowPosModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [deptForm, setDeptForm] = useState({ ...emptyDept });
  const [posForm, setPosForm]   = useState({ ...emptyPos });
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
      const [dRes, pRes] = await Promise.all([
        api.get("/api/hr/departments", { headers: bizHeaders() }),
        api.get("/api/hr/positions",   { headers: bizHeaders() }),
      ]);
      setDepts(dRes.data);
      setPositions(pRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── 부서 CRUD ────────────────────────────────────
  const openDeptCreate = () => { setEditingDept(null); setDeptForm({ ...emptyDept }); setError(""); setShowDeptModal(true); };
  const openDeptEdit = (d: Department) => {
    setEditingDept(d);
    setDeptForm({ name: d.name, code: d.code || "", description: d.description || "", parent_id: d.parent_id });
    setError(""); setShowDeptModal(true);
  };
  const saveDept = async () => {
    if (!deptForm.name.trim()) { setError("부서명을 입력하세요"); return; }
    setSaving(true); setError("");
    try {
      const payload = { name: deptForm.name.trim(), code: deptForm.code || null, description: deptForm.description || null, parent_id: deptForm.parent_id };
      if (editingDept) await api.put(`/api/hr/departments/${editingDept.id}`, payload, { headers: bizHeaders() });
      else await api.post("/api/hr/departments", payload, { headers: bizHeaders() });
      setShowDeptModal(false);
      fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "저장에 실패했습니다");
    }
    setSaving(false);
  };
  const deleteDept = (id: number) => {
    setModal({ title: "삭제 확인", message: "부서를 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        try { await api.delete(`/api/hr/departments/${id}`, { headers: bizHeaders() }); fetchAll(); }
        catch (e: any) { setModal({ message: e?.response?.data?.detail || "삭제에 실패했습니다", variant: "error" }); }
      } });
  };

  // ── 직급 CRUD ────────────────────────────────────
  const openPosCreate = () => { setEditingPos(null); setPosForm({ ...emptyPos }); setError(""); setShowPosModal(true); };
  const openPosEdit = (p: Position) => {
    setEditingPos(p);
    setPosForm({ name: p.name, level: p.level, description: p.description || "" });
    setError(""); setShowPosModal(true);
  };
  const savePos = async () => {
    if (!posForm.name.trim()) { setError("직급명을 입력하세요"); return; }
    setSaving(true); setError("");
    try {
      const payload = { name: posForm.name.trim(), level: posForm.level, description: posForm.description || null };
      if (editingPos) await api.put(`/api/hr/positions/${editingPos.id}`, payload, { headers: bizHeaders() });
      else await api.post("/api/hr/positions", payload, { headers: bizHeaders() });
      setShowPosModal(false);
      fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "저장에 실패했습니다");
    }
    setSaving(false);
  };
  const deletePos = (id: number) => {
    setModal({ title: "삭제 확인", message: "직급을 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        try { await api.delete(`/api/hr/positions/${id}`, { headers: bizHeaders() }); fetchAll(); }
        catch (e: any) { setModal({ message: e?.response?.data?.detail || "삭제에 실패했습니다", variant: "error" }); }
      } });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)",
    color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>부서 · 직급 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>조직 구조를 설정하세요</p>
        </div>
        <button onClick={tab === "dept" ? openDeptCreate : openPosCreate}
          style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + {tab === "dept" ? "부서" : "직급"} 추가
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-surface-2)", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        {(["dept", "pos"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "7px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.15s", backgroundColor: tab === t ? "var(--bg-surface)" : "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-muted)", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
            {t === "dept" ? "부서" : "직급"}
          </button>
        ))}
      </div>

      {/* 부서 목록 */}
      {tab === "dept" && (
        loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</div>
        ) : depts.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", textAlign: "center", padding: "40px 20px", backgroundColor: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>◎</p>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>등록된 부서가 없습니다</p>
            <button onClick={openDeptCreate} style={{ marginTop: "16px", fontSize: "13px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
              첫 번째 부서 추가
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", boxShadow: "var(--shadow)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["부서명", "코드", "상위 부서", "재직 인원", "설명", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {depts.map((d, i) => {
                  const parentName = depts.find(x => x.id === d.parent_id)?.name || "—";
                  return (
                    <tr key={d.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "7px", backgroundColor: "var(--accent-light)", border: "1px solid rgba(255,190,80,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "var(--accent)", fontWeight: 800, flexShrink: 0 }}>
                            {d.name[0]}
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--text-muted)" }}>{d.code || "—"}</td>
                      <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--text-muted)" }}>{d.parent_id ? parentName : "최상위"}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{d.employee_count}</span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "2px" }}>명</span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description || "—"}</td>
                      <td style={{ padding: "13px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button onClick={() => openDeptEdit(d)}
                            style={{ padding: "5px 12px", borderRadius: "7px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                            수정
                          </button>
                          <button onClick={() => deleteDept(d.id)}
                            style={{ padding: "5px 12px", borderRadius: "7px", border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "#EF4444", fontWeight: 600 }}>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* 직급 목록 */}
      {tab === "pos" && (
        loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</div>
        ) : positions.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", textAlign: "center", padding: "40px 20px", backgroundColor: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>◑</p>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>등록된 직급이 없습니다</p>
            <button onClick={openPosCreate} style={{ marginTop: "16px", fontSize: "13px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
              첫 번째 직급 추가
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", boxShadow: "var(--shadow)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["직급명", "레벨", "재직 인원", "설명", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "7px", backgroundColor: "var(--accent-light)", border: "1px solid rgba(255,190,80,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "var(--accent)", fontWeight: 800, flexShrink: 0 }}>
                          {p.level}
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: "3px" }}>
                        {[...Array(Math.min(p.level, 5))].map((_, k) => (
                          <div key={k} style={{ width: "6px", height: "6px", borderRadius: "2px", backgroundColor: "var(--accent)" }} />
                        ))}
                        {[...Array(Math.max(5 - p.level, 0))].map((_, k) => (
                          <div key={k} style={{ width: "6px", height: "6px", borderRadius: "2px", backgroundColor: "var(--border)" }} />
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{p.employee_count}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "2px" }}>명</span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: "12px", color: "var(--text-muted)" }}>{p.description || "—"}</td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button onClick={() => openPosEdit(p)}
                          style={{ padding: "5px 12px", borderRadius: "7px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                          수정
                        </button>
                        <button onClick={() => deletePos(p.id)}
                          style={{ padding: "5px 12px", borderRadius: "7px", border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "#EF4444", fontWeight: 600 }}>
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {/* 부서 모달 */}
      {showDeptModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeptModal(false); }}>
          <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "16px", padding: "28px", width: "420px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>
              {editingDept ? "부서 수정" : "부서 추가"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>부서명 *</label>
                <input style={inputStyle} value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 개발팀" />
              </div>
              <div>
                <label style={labelStyle}>부서 코드</label>
                <input style={inputStyle} value={deptForm.code || ""} onChange={e => setDeptForm(f => ({ ...f, code: e.target.value }))} placeholder="예: DEV-01" />
              </div>
              <div>
                <label style={labelStyle}>상위 부서</label>
                <select style={inputStyle} value={deptForm.parent_id ?? ""} onChange={e => setDeptForm(f => ({ ...f, parent_id: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">최상위 부서</option>
                  {depts.filter(d => d.id !== editingDept?.id).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>설명</label>
                <textarea style={{ ...inputStyle, height: "80px", resize: "none" }} value={deptForm.description || ""} onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} placeholder="부서 설명 (선택)" />
              </div>
              {error && <p style={{ fontSize: "12px", color: "#EF4444" }}>{error}</p>}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => setShowDeptModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>
                취소
              </button>
              <button onClick={saveDept} disabled={saving}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", color: "var(--accent)", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직급 모달 */}
      {showPosModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) setShowPosModal(false); }}>
          <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "16px", padding: "28px", width: "400px", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>
              {editingPos ? "직급 수정" : "직급 추가"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>직급명 *</label>
                <input style={inputStyle} value={posForm.name} onChange={e => setPosForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 과장" />
              </div>
              <div>
                <label style={labelStyle}>직급 레벨 (1=사원, 높을수록 상위)</label>
                <input type="number" min={1} max={10} style={inputStyle} value={posForm.level} onChange={e => setPosForm(f => ({ ...f, level: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={labelStyle}>설명</label>
                <textarea style={{ ...inputStyle, height: "70px", resize: "none" }} value={posForm.description} onChange={e => setPosForm(f => ({ ...f, description: e.target.value }))} placeholder="직급 설명 (선택)" />
              </div>
              {error && <p style={{ fontSize: "12px", color: "#EF4444" }}>{error}</p>}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => setShowPosModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>
                취소
              </button>
              <button onClick={savePos} disabled={saving}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", color: "var(--accent)", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
