"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { useRole, canWrite } from "@/hooks/useRole";

interface Employee { id: number; name: string; base_salary: number; }
interface PayrollRecord {
  id: number;
  employee_id: number;
  employee_name: string | null;
  pay_year: number;
  pay_month: number;
  base_salary: number;
  overtime_pay: number;
  bonus: number;
  meal_allowance: number;
  transport_allow: number;
  other_allowance: number;
  national_pension: number;
  health_insurance: number;
  employment_insurance: number;
  income_tax: number;
  local_income_tax: number;
  other_deduction: number;
  advance_payment: number;
  gross_pay: number;
  total_deduction: number;
  net_pay: number;
  status: string;
  note: string | null;
}

const STATUS_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  작성중:   { text: "#6B7280", bg: "rgba(107,114,128,0.10)", border: "1px solid rgba(107,114,128,0.30)" },
  확정:     { text: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "1px solid rgba(245,158,11,0.40)" },
  지급완료: { text: "#22C55E", bg: "rgba(34,197,94,0.12)",   border: "1px solid rgba(34,197,94,0.40)" },
};

const EMPTY_FORM = {
  employee_id: "" as string | number,
  base_salary: 0, overtime_pay: 0, bonus: 0,
  meal_allowance: 0, transport_allow: 0, other_allowance: 0,
  national_pension: 0, health_insurance: 0, employment_insurance: 0,
  income_tax: 0, local_income_tax: 0, other_deduction: 0, advance_payment: 0,
  note: "",
};

export default function PayrollPage() {
  const role = useRole();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const [activeTab, setActiveTab] = useState<"payroll" | "severance">("payroll");
  const [sevForm, setSevForm] = useState({ employee_id: "" as string | number, resign_date: "", avg_wage_3m: 0, note: "" });
  const [sevResult, setSevResult] = useState<any>(null);
  const [sevSaving, setSevSaving] = useState(false);

  const bizHeaders = () => {
    const id = localStorage.getItem("activeBizId");
    return id ? { "X-Business-Id": id } : {};
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        api.get("/api/hr/payroll/", { headers: bizHeaders(), params: { year, month } }),
        api.get("/api/hr/employees", { headers: bizHeaders() }),
      ]);
      setPayrolls(pRes.data);
      setEmployees(eRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [year, month]);

  const autoCalculate = async (empId: number) => {
    if (!empId) return;
    setCalculating(true);
    try {
      const res = await api.post(`/api/hr/payroll/calculate?employee_id=${empId}`, {}, { headers: bizHeaders() });
      const d = res.data;
      setForm(f => ({ ...f, base_salary: d.base_salary, national_pension: d.national_pension, health_insurance: d.health_insurance, employment_insurance: d.employment_insurance, income_tax: d.income_tax, local_income_tax: d.local_income_tax }));
    } catch {}
    setCalculating(false);
  };

  const openCreate = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setError(""); setShowModal(true); };
  const openEdit = (p: PayrollRecord) => {
    setEditingId(p.id);
    setForm({ employee_id: p.employee_id, base_salary: p.base_salary, overtime_pay: p.overtime_pay, bonus: p.bonus, meal_allowance: p.meal_allowance, transport_allow: p.transport_allow, other_allowance: p.other_allowance, national_pension: p.national_pension, health_insurance: p.health_insurance, employment_insurance: p.employment_insurance, income_tax: p.income_tax, local_income_tax: p.local_income_tax, other_deduction: p.other_deduction, advance_payment: p.advance_payment, note: p.note || "" });
    setError(""); setShowModal(true);
  };

  const savePayroll = async () => {
    if (!form.employee_id) { setError("직원을 선택하세요"); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, employee_id: Number(form.employee_id), pay_year: year, pay_month: month };
      if (editingId) await api.put(`/api/hr/payroll/${editingId}`, payload, { headers: bizHeaders() });
      else await api.post("/api/hr/payroll/", payload, { headers: bizHeaders() });
      setShowModal(false); fetchAll();
    } catch (e: any) { setError(e?.response?.data?.detail || "저장 실패"); }
    setSaving(false);
  };

  const updateStatus = async (id: number, status: string) => {
    try { await api.put(`/api/hr/payroll/${id}`, { status }, { headers: bizHeaders() }); fetchAll(); }
    catch { setModal({ message: "상태 변경 실패", variant: "error" }); }
  };

  const deletePayroll = (id: number) => {
    setModal({ title: "삭제 확인", message: "급여명세서를 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        try { await api.delete(`/api/hr/payroll/${id}`, { headers: bizHeaders() }); fetchAll(); }
        catch { setModal({ message: "삭제 실패", variant: "error" }); }
      } });
  };

  const calcSeverance = async () => {
    if (!sevForm.employee_id || !sevForm.resign_date) return;
    try {
      const res = await api.post(`/api/hr/payroll/severance/calculate?employee_id=${sevForm.employee_id}&resign_date=${sevForm.resign_date}&avg_wage_3m=${sevForm.avg_wage_3m}`, {}, { headers: bizHeaders() });
      setSevResult(res.data);
      setSevForm(f => ({ ...f, avg_wage_3m: res.data.avg_wage_monthly }));
    } catch (e: any) { setModal({ message: e?.response?.data?.detail || "계산 실패", variant: "error" }); }
  };

  const saveSeverance = async () => {
    if (!sevResult) return;
    setSevSaving(true);
    try {
      await api.post("/api/hr/payroll/severance/", { employee_id: Number(sevForm.employee_id), resign_date: sevForm.resign_date, avg_wage_3m: sevResult.avg_wage_monthly, note: sevForm.note }, { headers: bizHeaders() });
      setModal({ message: "퇴직금 정산이 완료되었습니다", variant: "info" });
      setSevResult(null);
      setSevForm({ employee_id: "", resign_date: "", avg_wage_3m: 0, note: "" });
    } catch (e: any) { setModal({ message: e?.response?.data?.detail || "저장 실패", variant: "error" }); }
    setSevSaving(false);
  };

  const totalGross = payrolls.reduce((s, p) => s + p.gross_pay, 0);
  const totalNet   = payrolls.reduce((s, p) => s + p.net_pay, 0);
  const totalDed   = payrolls.reduce((s, p) => s + p.total_deduction, 0);

  const fmt = (n: number) => n.toLocaleString();
  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "5px", display: "block" };
  const numInput = (key: keyof typeof form) => (
    <input type="number" style={inputStyle} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
  );

  const gross = Number(form.base_salary) + Number(form.overtime_pay) + Number(form.bonus) + Number(form.meal_allowance) + Number(form.transport_allow) + Number(form.other_allowance);
  const deductions = Number(form.national_pension) + Number(form.health_insurance) + Number(form.employment_insurance) + Number(form.income_tax) + Number(form.local_income_tax) + Number(form.other_deduction) + Number(form.advance_payment);
  const net = gross - deductions;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>급여 정산</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>월별 급여명세서 · 4대보험 계산 · 퇴직금 정산</p>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", backgroundColor: "var(--bg-surface-2)", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        {(canWrite(role) ? [["payroll", "급여명세서"], ["severance", "퇴직금 정산"]] : [["payroll", "급여명세서"]]).map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k as any)}
            style={{ padding: "7px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.15s", backgroundColor: activeTab === k ? "var(--bg-surface)" : "transparent", color: activeTab === k ? "var(--text-primary)" : "var(--text-muted)", boxShadow: activeTab === k ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
            {l}
          </button>
        ))}
      </div>

      {activeTab === "payroll" && (
        <>
          {/* 월 선택 + 합계 */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...inputStyle, width: "90px" }}>
                {[2022,2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...inputStyle, width: "80px" }}>
                {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            </div>
            {payrolls.length > 0 && (
              <div style={{ display: "flex", gap: "20px", marginLeft: "auto" }}>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>총 지급액</p>
                  <p style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{fmt(Math.round(totalGross))}원</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>총 공제액</p>
                  <p style={{ fontSize: "16px", fontWeight: 800, color: "#EF4444", margin: 0 }}>-{fmt(Math.round(totalDed))}원</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>총 실지급액</p>
                  <p style={{ fontSize: "16px", fontWeight: 800, color: "#22C55E", margin: 0 }}>{fmt(Math.round(totalNet))}원</p>
                </div>
              </div>
            )}
            {canWrite(role) && (
              <button onClick={openCreate}
                style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                + 급여명세서 추가
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</div>
          ) : payrolls.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "320px", textAlign: "center", padding: "40px 20px", backgroundColor: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3 }}>◒</p>
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>{year}년 {month}월 급여명세서가 없습니다</p>
              {canWrite(role) && (
                <button onClick={openCreate} style={{ marginTop: "16px", fontSize: "13px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>급여명세서 생성</button>
              )}
            </div>
          ) : (
            <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["직원", "지급총액", "공제총액", "실지급액", "가불", "상태", ""].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((p, i) => {
                    const sc = STATUS_COLORS[p.status] || STATUS_COLORS["작성중"];
                    return (
                      <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-surface-2)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--accent-light)", border: "1px solid rgba(255,190,80,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: "var(--accent)" }}>
                              {(p.employee_name || "?")[0]}
                            </div>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{p.employee_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "13px 14px", fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{fmt(Math.round(p.gross_pay))}원</td>
                        <td style={{ padding: "13px 14px", fontSize: "13px", color: "#EF4444", fontWeight: 600 }}>-{fmt(Math.round(p.total_deduction))}원</td>
                        <td style={{ padding: "13px 14px", fontSize: "13px", color: "#22C55E", fontWeight: 700 }}>{fmt(Math.round(p.net_pay))}원</td>
                        <td style={{ padding: "13px 14px", fontSize: "12px", color: p.advance_payment > 0 ? "#F59E0B" : "var(--text-muted)" }}>
                          {p.advance_payment > 0 ? `-${fmt(Math.round(p.advance_payment))}원` : "—"}
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          {canWrite(role) ? (
                            <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}
                              style={{ fontSize: "11px", fontWeight: 700, color: sc.text, backgroundColor: sc.bg, border: sc.border, borderRadius: "99px", padding: "4px 10px", cursor: "pointer", outline: "none" }}>
                              {["작성중", "확정", "지급완료"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span style={{ fontSize: "11px", fontWeight: 700, color: sc.text, backgroundColor: sc.bg, border: sc.border, borderRadius: "99px", padding: "4px 10px" }}>{p.status}</span>
                          )}
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          {canWrite(role) && (
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              <button onClick={() => openEdit(p)} style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>수정</button>
                              <button onClick={() => deletePayroll(p.id)} style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid rgba(239,68,68,0.40)", backgroundColor: "rgba(239,68,68,0.12)", cursor: "pointer", fontSize: "12px", color: "#EF4444", fontWeight: 600 }}>삭제</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "severance" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>퇴직금 계산</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div><label style={labelStyle}>직원 선택</label>
                <select style={inputStyle} value={sevForm.employee_id} onChange={e => setSevForm(f => ({ ...f, employee_id: e.target.value, avg_wage_3m: employees.find(x => x.id === Number(e.target.value))?.base_salary || 0 }))}>
                  <option value="">직원 선택</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>퇴직일</label><input type="date" style={inputStyle} value={sevForm.resign_date} onChange={e => setSevForm(f => ({ ...f, resign_date: e.target.value }))} /></div>
              <div><label style={labelStyle}>3개월 평균임금 (원)</label><input type="number" style={inputStyle} value={sevForm.avg_wage_3m} onChange={e => setSevForm(f => ({ ...f, avg_wage_3m: Number(e.target.value) }))} /></div>
              <button onClick={calcSeverance} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--accent)", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                퇴직금 계산하기
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "20px" }}>계산 결과</h3>
            {!sevResult ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "13px" }}>
                <p style={{ fontSize: "32px", opacity: 0.3, marginBottom: "12px" }}>◒</p>
                직원과 퇴직일을 선택 후<br />계산하기를 눌러주세요.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  ["직원명", sevResult.employee_name],
                  ["입사일", sevResult.hire_date],
                  ["퇴직일", sevResult.resign_date],
                  ["근속일수", `${sevResult.days_worked}일`],
                  ["근속연수", `${sevResult.years_worked}년`],
                  ["평균임금(월)", `${fmt(Math.round(sevResult.avg_wage_monthly))}원`],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{l}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                <div style={{ backgroundColor: "var(--accent-light)", borderRadius: "10px", padding: "16px", textAlign: "center", border: "1px solid rgba(255,190,80,0.2)" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>퇴직금 총액</p>
                  <p style={{ fontSize: "24px", fontWeight: 800, color: "var(--accent)", margin: "4px 0 0" }}>{fmt(Math.round(sevResult.severance_pay))}원</p>
                </div>
                <button onClick={saveSeverance} disabled={sevSaving}
                  style={{ padding: "11px", borderRadius: "8px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontWeight: 700, fontSize: "13px", cursor: sevSaving ? "not-allowed" : "pointer", opacity: sevSaving ? 0.7 : 1 }}>
                  {sevSaving ? "처리 중..." : "퇴직금 정산 확정"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {/* 급여명세서 모달 */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "16px", padding: "28px", width: "580px", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{editingId ? "급여명세서 수정" : "급여명세서 추가"}</h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px" }}>{year}년 {month}월</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {!editingId && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ flex: 1 }}><label style={labelStyle}>직원 *</label>
                    <select style={inputStyle} value={form.employee_id} onChange={e => { const id = Number(e.target.value); setForm(f => ({ ...f, employee_id: e.target.value })); if (id) autoCalculate(id); }}>
                      <option value="">직원 선택</option>
                      {employees.filter(e => !payrolls.find(p => p.employee_id === e.id)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <button onClick={() => form.employee_id && autoCalculate(Number(form.employee_id))} disabled={calculating}
                    style={{ alignSelf: "flex-end", padding: "9px 14px", borderRadius: "8px", border: "1px solid var(--accent)", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontWeight: 700, fontSize: "12px", cursor: calculating ? "not-allowed" : "pointer", flexShrink: 0 }}>
                    {calculating ? "계산 중..." : "자동 계산"}
                  </button>
                </div>
              )}

              <div>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "10px" }}>지급 항목</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div><label style={labelStyle}>기본급</label>{numInput("base_salary")}</div>
                  <div><label style={labelStyle}>연장근로수당</label>{numInput("overtime_pay")}</div>
                  <div><label style={labelStyle}>상여금</label>{numInput("bonus")}</div>
                  <div><label style={labelStyle}>식대</label>{numInput("meal_allowance")}</div>
                  <div><label style={labelStyle}>교통비</label>{numInput("transport_allow")}</div>
                  <div><label style={labelStyle}>기타수당</label>{numInput("other_allowance")}</div>
                </div>
                <div style={{ marginTop: "8px", padding: "10px 12px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>지급총액</span>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>{fmt(Math.round(gross))}원</span>
                </div>
              </div>

              <div>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "10px" }}>공제 항목</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div><label style={labelStyle}>국민연금</label>{numInput("national_pension")}</div>
                  <div><label style={labelStyle}>건강보험</label>{numInput("health_insurance")}</div>
                  <div><label style={labelStyle}>고용보험</label>{numInput("employment_insurance")}</div>
                  <div><label style={labelStyle}>소득세</label>{numInput("income_tax")}</div>
                  <div><label style={labelStyle}>지방소득세</label>{numInput("local_income_tax")}</div>
                  <div><label style={labelStyle}>기타공제</label>{numInput("other_deduction")}</div>
                  <div><label style={labelStyle}>가불</label>{numInput("advance_payment")}</div>
                </div>
                <div style={{ marginTop: "8px", padding: "10px 12px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>공제총액</span>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "#EF4444" }}>-{fmt(Math.round(deductions))}원</span>
                </div>
              </div>

              <div style={{ padding: "14px 16px", backgroundColor: "var(--accent-light)", borderRadius: "10px", border: "1px solid rgba(255,190,80,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>실지급액</span>
                <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--accent)" }}>{fmt(Math.round(net))}원</span>
              </div>

              {error && <p style={{ fontSize: "12px", color: "#EF4444" }}>{error}</p>}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>취소</button>
              <button onClick={savePayroll} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", color: "var(--accent)", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>{saving ? "저장 중..." : "저장"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
