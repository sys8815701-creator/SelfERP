"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Save, X, User, Building2, Phone, Mail, Briefcase, Calendar, Hash, Shield } from "lucide-react";
import api from "@/lib/api";

const ROLE_DISPLAY: Record<string, { label: string; color: string; bg: string; border: string }> = {
  admin:      { label: "최고 관리자 (관리자)", color: "#DC2626", bg: "rgba(220,38,38,0.10)",   border: "rgba(220,38,38,0.35)" },
  accountant: { label: "매니저",              color: "#2563EB", bg: "rgba(37,99,235,0.10)",   border: "rgba(37,99,235,0.35)" },
  employee:   { label: "일반 사용자 (뷰어)",  color: "#6B7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.30)" },
};

export default function ProfilePage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto]     = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  /* 개인 정보 */
  const [role,           setRole]           = useState("employee");
  const [name,           setName]           = useState("");
  const [email,          setEmail]          = useState("");
  const [phone,          setPhone]          = useState("");
  const [department,     setDepartment]     = useState("");
  const [position,       setPosition]       = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [hireDate,       setHireDate]       = useState("");

  /* 사업장 정보 */
  const [bizName,  setBizName]  = useState("");
  const [bizRegNo, setBizRegNo] = useState("");
  const [industry, setIndustry] = useState("");
  const [openDate, setOpenDate] = useState("");

  useEffect(() => {
    const p = localStorage.getItem("bk-profile-photo");
    if (p) setPhoto(p);

    // localStorage에서 즉시 표시
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setName(u.name || "");
      setEmail(u.email || "");
      setRole(u.role || "employee");
    } catch {}

    try {
      const b = JSON.parse(localStorage.getItem("business") || "{}");
      setBizName(b.business_name || "");
      setBizRegNo(b.business_number || "");
      setIndustry(b.industry || "");
      setOpenDate(b.open_date || "");
    } catch {}

    // API에서 사업장 정보 조회 (localStorage 덮어쓰기)
    api.get("/api/business/").then(res => {
      const list: any[] = res.data;
      if (list.length > 0) {
        const storedId = Number(localStorage.getItem("activeBizId"));
        const biz = list.find(b => b.id === storedId) || list[0];
        setBizName(biz.business_name || "");
        setBizRegNo(biz.business_number || "");
        setIndustry(biz.industry || "");
        setOpenDate(biz.open_date || "");
        localStorage.setItem("business", JSON.stringify(biz));
      }
    }).catch(() => {});

    // API에서 전체 프로필 조회
    api.get("/api/auth/me").then(res => {
      const u = res.data;
      setName(u.name || "");
      setEmail(u.email || "");
      setRole(u.role || "employee");
      setPhone(u.phone || "");
      setDepartment(u.department_name || "");
      setPosition(u.position_name || "");
      setEmployeeNumber(u.employee_number || "");
      setHireDate(u.hire_date || "");
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, ...u }));
    }).catch(() => {
      setPhone(localStorage.getItem("bk-profile-phone") || "");
    });
  }, []);

  /* 프로필 사진 */
  const handlePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setPhoto(dataUrl);
      localStorage.setItem("bk-profile-photo", dataUrl);
      window.dispatchEvent(new CustomEvent("profile-photo-updated"));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    localStorage.removeItem("bk-profile-photo");
    window.dispatchEvent(new CustomEvent("profile-photo-updated"));
  };

  /* 개인 정보 저장 */
  const savePersonal = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await api.patch("/api/auth/me", {
        name,
        phone:           phone || null,
        department_name: department || null,
        position_name:   position || null,
        employee_number: employeeNumber || null,
        hire_date:       hireDate || null,
      });
      const updated = res.data;
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, ...updated }));
      window.dispatchEvent(new CustomEvent("user-updated", { detail: updated }));
      setSaveMsg("저장되었습니다");
    } catch (e: any) {
      setSaveMsg(e?.response?.data?.detail ?? "저장에 실패했습니다");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  /* 사업장 정보 저장 */
  const saveBusiness = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const biz = JSON.parse(localStorage.getItem("business") || "{}");
      if (biz?.id) {
        await api.patch(`/api/business/${biz.id}`, {
          business_name: bizName,
          business_number: bizRegNo,
          industry,
          open_date: openDate || null,
        });
        const updated = { ...biz, business_name: bizName, business_number: bizRegNo, industry, open_date: openDate };
        localStorage.setItem("business", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("business-updated", { detail: updated }));
      }
      setSaveMsg("사업장 정보가 저장되었습니다");
    } catch (e: any) {
      setSaveMsg(e?.response?.data?.detail ?? "저장에 실패했습니다");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const card: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    boxShadow: "var(--shadow)",
    padding: "24px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "9px",
    backgroundColor: "var(--bg-surface-2)",
    color: "var(--text-primary)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const readonlyStyle: React.CSSProperties = {
    ...inputStyle,
    backgroundColor: "var(--bg-surface-3)",
    color: "var(--text-muted)",
    cursor: "not-allowed",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text-muted)",
    marginBottom: "6px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  };

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#ffffff", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
    </div>
  );

  const roleInfo = ROLE_DISPLAY[role] || ROLE_DISPLAY.employee;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>내 프로필</h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "2px" }}>계정 및 사업장 정보를 관리합니다</p>
      </div>

      {/* 프로필 사진 */}
      <div style={{ ...card }}>
        {sectionTitle(<Camera size={17} color="var(--accent)" />, "프로필 사진")}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", backgroundColor: "var(--accent)", border: "2.5px solid #C49A30", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {photo
                ? <img src={photo} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "32px", fontWeight: 800, color: "var(--accent-text)" }}>{name?.[0] || "U"}</span>}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", backgroundColor: "var(--accent)", border: "2px solid var(--bg-surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={14} color="var(--accent-text)" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ""; }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>JPG, PNG 파일을 업로드해 주세요. 최대 5MB</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                사진 변경
              </button>
              {photo && (
                <button
                  onClick={removePhoto}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                  <X size={13} /> 사진 삭제
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 개인 정보 */}
      <div style={{ ...card }}>
        {sectionTitle(<User size={17} color="var(--accent)" />, "개인 정보")}

        {/* 권한 표시 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", padding: "12px 16px", backgroundColor: roleInfo.bg, borderRadius: "10px", border: `1px solid ${roleInfo.border}` }}>
          <Shield size={15} color={roleInfo.color} />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)" }}>권한</span>
          <span style={{ fontSize: "13px", fontWeight: 800, color: roleInfo.color }}>{roleInfo.label}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <p style={labelStyle}><User size={12} /> 이름 *</p>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="이름" />
          </div>
          <div>
            <p style={labelStyle}><Mail size={12} /> 이메일</p>
            <input value={email} readOnly style={readonlyStyle} />
            <p style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "4px" }}>이메일은 변경할 수 없습니다</p>
          </div>
          <div>
            <p style={labelStyle}><Phone size={12} /> 연락처</p>
            <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="010-0000-0000" />
          </div>
          <div>
            <p style={labelStyle}><Briefcase size={12} /> 부서</p>
            <input value={department} onChange={e => setDepartment(e.target.value)} style={inputStyle} placeholder="예: 회계팀" />
          </div>
          <div>
            <p style={labelStyle}><Briefcase size={12} /> 직급</p>
            <input value={position} onChange={e => setPosition(e.target.value)} style={inputStyle} placeholder="예: 과장" />
          </div>
          <div>
            <p style={labelStyle}><Hash size={12} /> 사원번호</p>
            <input value={employeeNumber} onChange={e => setEmployeeNumber(e.target.value)} style={inputStyle} placeholder="예: EMP-001" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={labelStyle}><Calendar size={12} /> 입사일</p>
            <input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)} style={{ ...inputStyle, maxWidth: "240px" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px" }}>
          <button
            onClick={savePersonal}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "9px", border: "none", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontSize: "13px", fontWeight: 800, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? "저장 중..." : "개인 정보 저장"}
          </button>
          {saveMsg && <span style={{ fontSize: "13px", color: saveMsg.includes("실패") ? "#EF4444" : "#22C55E", fontWeight: 600 }}>{saveMsg}</span>}
        </div>
      </div>

      {/* 사업장 정보 */}
      <div style={{ ...card }}>
        {sectionTitle(<Building2 size={17} color="var(--accent)" />, "사업장 정보")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <p style={labelStyle}><Building2 size={12} /> 사업장명 *</p>
            <input value={bizName} onChange={e => setBizName(e.target.value)} style={inputStyle} placeholder="○○ 베이커리" />
          </div>
          <div>
            <p style={labelStyle}><Briefcase size={12} /> 사업자등록번호</p>
            <input value={bizRegNo} onChange={e => setBizRegNo(e.target.value)} style={inputStyle} placeholder="000-00-00000" />
          </div>
          <div>
            <p style={labelStyle}><Briefcase size={12} /> 업종</p>
            <input value={industry} onChange={e => setIndustry(e.target.value)} style={inputStyle} placeholder="예: 제과 · 제빵업" />
          </div>
          <div>
            <p style={labelStyle}><Calendar size={12} /> 개업일</p>
            <input type="date" value={openDate} onChange={e => setOpenDate(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px" }}>
          <button
            onClick={saveBusiness}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "10px 20px", borderRadius: "9px", border: "none", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontSize: "13px", fontWeight: 800, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? "저장 중..." : "사업장 정보 저장"}
          </button>
          {saveMsg && <span style={{ fontSize: "13px", color: saveMsg.includes("실패") ? "#EF4444" : "#22C55E", fontWeight: 600 }}>{saveMsg}</span>}
        </div>
      </div>
    </div>
  );
}
