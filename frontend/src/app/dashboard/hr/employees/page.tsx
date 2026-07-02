"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";

interface Department { id: number; name: string; }
interface Position   { id: number; name: string; level: number; }
interface Employee {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  hire_date: string;
  resign_date: string | null;
  employment_type: string;
  status: string;
  base_salary: number;
  gender: string | null;
  department_id: number | null;
  position_id: number | null;
  department_name: string | null;
  position_name: string | null;
  birth_date: string | null;
  address: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  bank_name: string | null;
  account_number: string | null;
  bank_holder: string | null;
  note: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  재직: "#22C55E", 휴직: "#F59E0B", 퇴직: "#6B7280",
};

const EMPTY_FORM = {
  name: "", email: "", phone: "", birth_date: "", gender: "",
  hire_date: new Date().toISOString().split("T")[0],
  resign_date: "", employment_type: "정규직", status: "재직",
  department_id: "" as string | number, position_id: "" as string | number,
  base_salary: 0, bank_name: "", account_number: "", bank_holder: "",
  address: "", emergency_name: "", emergency_phone: "", note: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("재직");
  const [filterDept, setFilterDept] = useState("");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDetail, setShowDetail] = useState<Employee | null>(null);

  const bizHeaders = () => {
    const id = localStorage.getItem("activeBizId");
    return id ? { "X-Business-Id": id } : {};
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterDept) params.dept_id = filterDept;
      const [eRes, dRes, pRes] = await Promise.all([
        api.get("/api/hr/employees", { headers: bizHeaders(), params }),
        api.get("/api/hr/departments", { headers: bizHeaders() }),
        api.get("/api/hr/positions",   { headers: bizHeaders() }),
      ]);
      setEmployees(eRes.data);
      setDepartments(dRes.data);
      setPositions(pRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [filterStatus, filterDept]);

  const filtered = useMemo(() =>
    employees.filter(e =>
      !search || e.name.includes(search) || (e.email || "").includes(search) || (e.phone || "").includes(search)
    ), [employees, search]);

  const openCreate = () => {
    setEditingEmp(null);
    setForm({ ...EMPTY_FORM, hire_date: new Date().toISOString().split("T")[0] });
    setError(""); setShowModal(true);
  };

  const openEdit = (e: Employee) => {
    setEditingEmp(e);
    setForm({
      name: e.name, email: e.email || "", phone: e.phone || "",
      birth_date: e.birth_date || "", gender: e.gender || "",
      hire_date: e.hire_date, resign_date: e.resign_date || "",
      employment_type: e.employment_type, status: e.status,
      department_id: e.department_id ?? "", position_id: e.position_id ?? "",
      base_salary: e.base_salary, bank_name: e.bank_name || "",
      account_number: e.account_number || "", bank_holder: e.bank_holder || "",
      address: e.address || "", emergency_name: e.emergency_name || "",
      emergency_phone: e.emergency_phone || "", note: e.note || "",
    });
    setError(""); setShowModal(true);
  };

  const saveEmployee = async () => {
    if (!form.name.trim()) { setError("이름을 입력하세요."); return; }
    if (!form.hire_date)   { setError("입사일을 입력하세요."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        department_id: form.department_id ? Number(form.department_id) : null,
        position_id:   form.position_id   ? Number(form.position_id)   : null,
        resign_date:   form.resign_date || null,
        birth_date:    form.birth_date  || null,
        gender:        form.gender      || null,
      };
      if (editingEmp) await api.put(`/api/hr/employees/${editingEmp.id}`, payload, { headers: bizHeaders() });
      else await api.post("/api/hr/employees", payload, { headers: bizHeaders() });
      setShowModal(false);
      fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "저장에 실패했습니다.");
    }
    setSaving(false);
  };

  const deleteEmployee = async (id: number) => {
    if (!confirm("직원 정보를 삭제하시겠습니까?")) return;
    try { await api.delete(`/api/hr/employees/${id}`, { headers: bizHeaders() }); fetchAll(); }
    catch { alert("삭제에 실패했습니다."); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: "8px",
    border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)",
    color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", display: "block",
  };
  const row2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>직원 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>직원 정보 등록 및 관리</p>
        </div>
        <button onClick={openCreate}
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + 직원 추가
        </button>
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 · 이메일 · 연락처 검색"
          style={{ ...inputStyle, width: "220px" }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: "120px" }}>
          <option value="">전체</option>
          <option value="재직">재직</option>
          <option value="휴직">휴직</option>
          <option value="퇴직">퇴직</option>
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ ...inputStyle, width: "160px" }}>
          <option value="">전체 부서</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center", marginLeft: "4px" }}>
          총 {filtered.length}명
        </span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", backgroundColor: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>◉</p>
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>등록된 직원이 없습니다.</p>
          <button onClick={openCreate} style={{ marginTop: "16px", fontSize: "13px", color: "var(--accent)", background: "none", border: "1px solid var(--accent)", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
            첫 번째 직원 추가
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["직원", "부서", "직급", "고용 형태", "입사일", "기본급", "상태", ""].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)", cursor: "pointer" }}
                  onMouseEnter={el => (el.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)"}
                  onMouseLeave={el => (el.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                  onClick={() => setShowDetail(e)}>
                  <td style={{ padding: "13px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--accent-light)", border: "1px solid rgba(255,190,80,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: "var(--accent)", flexShrink: 0 }}>
                        {e.name[0]}
                      </div>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{e.name}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>{e.email || e.phone || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>{e.department_name || "—"}</td>
                  <td style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>{e.position_name || "—"}</td>
                  <td style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>{e.employment_type}</td>
                  <td style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-secondary)" }}>{e.hire_date}</td>
                  <td style={{ padding: "13px 14px", fontSize: "12px", color: "var(--text-primary)", fontWeight: 600 }}>
                    {e.base_salary > 0 ? `${e.base_salary.toLocaleString()}원` : "—"}
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: STATUS_COLORS[e.status] || "var(--text-muted)", backgroundColor: `${STATUS_COLORS[e.status]}18`, padding: "3px 10px", borderRadius: "99px" }}>
                      {e.status}
                    </span>
                  </td>
                  <td style={{ padding: "13px 14px" }} onClick={ev => ev.stopPropagation()}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button onClick={() => openEdit(e)}
                        style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                        수정
                      </button>
                      <button onClick={() => deleteEmployee(e.id)}
                        style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid rgba(239,68,68,0.3)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "#EF4444", fontWeight: 600 }}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세 드로어 */}
      {showDetail && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex" }}
          onClick={() => setShowDetail(null)}>
          <div style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
          <div style={{ width: "380px", backgroundColor: "var(--bg-surface)", borderLeft: "1px solid var(--border)", padding: "28px", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>직원 상세</h3>
              <button onClick={() => setShowDetail(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "var(--accent-light)", border: "2px solid rgba(255,190,80,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 800, color: "var(--accent)", margin: "0 auto 12px" }}>
                {showDetail.name[0]}
              </div>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{showDetail.name}</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{showDetail.position_name || "직급 미지정"} · {showDetail.department_name || "부서 미지정"}</p>
              <span style={{ display: "inline-block", marginTop: "8px", fontSize: "11px", fontWeight: 700, color: STATUS_COLORS[showDetail.status], backgroundColor: `${STATUS_COLORS[showDetail.status]}18`, padding: "4px 12px", borderRadius: "99px" }}>
                {showDetail.status}
              </span>
            </div>
            {[
              ["고용 형태", showDetail.employment_type],
              ["입사일", showDetail.hire_date],
              ["퇴직일", showDetail.resign_date || "—"],
              ["이메일", showDetail.email || "—"],
              ["연락처", showDetail.phone || "—"],
              ["생년월일", showDetail.birth_date || "—"],
              ["성별", showDetail.gender || "—"],
              ["기본급", showDetail.base_salary > 0 ? `${showDetail.base_salary.toLocaleString()}원` : "—"],
              ["은행", showDetail.bank_name ? `${showDetail.bank_name} ${showDetail.account_number || ""}` : "—"],
              ["예금주", showDetail.bank_holder || "—"],
              ["주소", showDetail.address || "—"],
              ["비상 연락처", showDetail.emergency_name ? `${showDetail.emergency_name} (${showDetail.emergency_phone || ""})` : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{label}</span>
                <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500, textAlign: "right", maxWidth: "200px" }}>{value}</span>
              </div>
            ))}
            {showDetail.note && (
              <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>메모</p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{showDetail.note}</p>
              </div>
            )}
            <button onClick={() => { setShowDetail(null); openEdit(showDetail); }}
              style={{ width: "100%", marginTop: "20px", padding: "11px", borderRadius: "10px", border: "none", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
              수정하기
            </button>
          </div>
        </div>
      )}

      {/* 등록/수정 모달 */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "16px", padding: "28px", width: "560px", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>
              {editingEmp ? "직원 수정" : "직원 추가"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={row2}>
                <div><label style={labelStyle}>이름 *</label><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="홍길동" /></div>
                <div><label style={labelStyle}>성별</label>
                  <select style={inputStyle} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">선택</option><option value="남">남</option><option value="여">여</option>
                  </select>
                </div>
              </div>
              <div style={row2}>
                <div><label style={labelStyle}>이메일</label><input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="example@email.com" /></div>
                <div><label style={labelStyle}>연락처</label><input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" /></div>
              </div>
              <div style={row2}>
                <div><label style={labelStyle}>생년월일</label><input type="date" style={inputStyle} value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>주소</label><input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="주소 입력" /></div>
              </div>

              <div style={{ height: "1px", backgroundColor: "var(--border)" }} />

              <div style={row2}>
                <div><label style={labelStyle}>부서</label>
                  <select style={inputStyle} value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                    <option value="">부서 미지정</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>직급</label>
                  <select style={inputStyle} value={form.position_id} onChange={e => setForm(f => ({ ...f, position_id: e.target.value }))}>
                    <option value="">직급 미지정</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={row2}>
                <div><label style={labelStyle}>고용 형태</label>
                  <select style={inputStyle} value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
                    {["정규직", "계약직", "일용직", "파트타임"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>재직 상태</label>
                  <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["재직", "휴직", "퇴직"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={row2}>
                <div><label style={labelStyle}>입사일 *</label><input type="date" style={inputStyle} value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
                <div><label style={labelStyle}>퇴직일</label><input type="date" style={inputStyle} value={form.resign_date} onChange={e => setForm(f => ({ ...f, resign_date: e.target.value }))} /></div>
              </div>

              <div style={{ height: "1px", backgroundColor: "var(--border)" }} />

              <div>
                <label style={labelStyle}>기본급 (원)</label>
                <input type="number" style={inputStyle} value={form.base_salary} onChange={e => setForm(f => ({ ...f, base_salary: Number(e.target.value) }))} placeholder="0" />
              </div>
              <div style={row2}>
                <div><label style={labelStyle}>은행명</label><input style={inputStyle} value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="국민은행" /></div>
                <div><label style={labelStyle}>계좌번호</label><input style={inputStyle} value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="000-000-000000" /></div>
              </div>
              <div>
                <label style={labelStyle}>예금주</label>
                <input style={inputStyle} value={form.bank_holder} onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder="예금주명" />
              </div>

              <div style={{ height: "1px", backgroundColor: "var(--border)" }} />

              <div style={row2}>
                <div><label style={labelStyle}>비상 연락처 (이름)</label><input style={inputStyle} value={form.emergency_name} onChange={e => setForm(f => ({ ...f, emergency_name: e.target.value }))} /></div>
                <div><label style={labelStyle}>비상 연락처 (번호)</label><input style={inputStyle} value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))} /></div>
              </div>
              <div>
                <label style={labelStyle}>메모</label>
                <textarea style={{ ...inputStyle, height: "70px", resize: "none" }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="추가 메모" />
              </div>

              {error && <p style={{ fontSize: "12px", color: "#EF4444" }}>{error}</p>}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>
                취소
              </button>
              <button onClick={saveEmployee} disabled={saving}
                style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent)", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", color: "var(--accent-text)", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                {saving ? "저장 중..." : (editingEmp ? "수정 완료" : "직원 등록")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
