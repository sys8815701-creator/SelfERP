"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Users, Phone, Trash2, Pencil, Check, X, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { addNotif } from "@/lib/notif";
import { useRole, canWrite } from "@/hooks/useRole";

interface Business { id: number; business_name: string; business_number: string; owner_name: string; industry: string; business_type: string; open_date: string; }
interface Vendor { id: number; vendor_name: string; vendor_type: string; business_number: string; contact: string; }

const VENDOR_TYPES = ["거래처", "공급업체", "고객사", "파트너사"];
const INDUSTRY_OPTIONS = ["음식점업", "소매업", "도매업", "제조업", "서비스업", "건설업", "IT/소프트웨어", "교육업", "의료업", "기타"];

const emptyBizForm = { business_name: "", business_number: "", owner_name: "", industry: "", business_type: "", open_date: "" };
const emptyVendorForm = { vendor_name: "", vendor_type: "거래처", business_number: "", contact: "" };

export default function BusinessPage() {
  const router = useRouter();
  const role = useRole();
  const isEmployee = !canWrite(role);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBizId, setActiveBizId] = useState<number | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // 직원 사업장 가입 요청 상태
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinBizNum, setJoinBizNum] = useState("");
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 사업장 상태
  const [showBizForm, setShowBizForm] = useState(false);
  const [bForm, setBForm] = useState(emptyBizForm);
  const [bizSubmitting, setBizSubmitting] = useState(false);
  const [bizMsg, setBizMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editingBizId, setEditingBizId] = useState<number | null>(null);
  const [editBizForm, setEditBizForm] = useState(emptyBizForm);
  const [editBizSubmitting, setEditBizSubmitting] = useState(false);

  const [modal, setModal] = useState<ModalConfig | null>(null);

  // 거래처 상태
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vForm, setVForm] = useState(emptyVendorForm);
  const [vendorSubmitting, setVendorSubmitting] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [editVForm, setEditVForm] = useState(emptyVendorForm);
  const [editVendorSubmitting, setEditVendorSubmitting] = useState(false);

  const activeBusiness = businesses.find(b => b.id === activeBizId) ?? businesses[0] ?? null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const bRes = await api.get("/api/business/");
      const bizList: Business[] = bRes.data;
      setBusinesses(bizList);
      const storedId = Number(localStorage.getItem("activeBizId"));
      const active = bizList.find(b => b.id === storedId) ?? bizList[0];
      if (active) {
        setActiveBizId(active.id);
        const vRes = await api.get(`/api/business/${active.id}/vendors`);
        setVendors(vRes.data);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* 사업장 없으면 자동으로 폼 오픈 (관리자만) */
  useEffect(() => {
    if (!loading && businesses.length === 0) {
      if (isEmployee) setShowJoinForm(true);
      else setShowBizForm(true);
    }
  }, [loading, businesses.length, isEmployee]);

  const formatJoinBizNum = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  };

  const submitJoinRequest = async () => {
    if (!joinBizNum.trim()) { setJoinMsg({ ok: false, text: "사업자번호를 입력해주세요" }); return; }
    setJoinSubmitting(true); setJoinMsg(null);
    try {
      const res = await api.post("/api/business/join-request", { business_number: joinBizNum });
      setJoinMsg({ ok: true, text: `${res.data.business_name}에 가입 요청이 전송되었습니다. 관리자 승인 후 연결됩니다.` });
      setJoinBizNum("");
    } catch (e: any) {
      setJoinMsg({ ok: false, text: e?.response?.data?.detail ?? "요청 실패" });
    } finally { setJoinSubmitting(false); }
  };

  const switchActive = (biz: Business) => {
    setActiveBizId(biz.id);
    localStorage.setItem("activeBizId", String(biz.id));
    localStorage.setItem("business", JSON.stringify(biz));
    api.get(`/api/business/${biz.id}/vendors`).then(r => setVendors(r.data)).catch(() => {});
    window.dispatchEvent(new CustomEvent("business-updated", { detail: biz }));
  };

  // ── 사업장 추가 ──
  const addBusiness = async () => {
    if (!bForm.business_name.trim()) { setBizMsg({ ok: false, text: "상호명은 필수입니다" }); return; }
    setBizSubmitting(true); setBizMsg(null);
    try {
      const res = await api.post("/api/business/", {
        business_name: bForm.business_name.trim(),
        business_number: bForm.business_number || null,
        owner_name: bForm.owner_name || null,
        industry: bForm.industry || null,
        business_type: bForm.business_type || null,
        open_date: bForm.open_date || null,
      });
      setBForm(emptyBizForm); setShowBizForm(false);
      addNotif(`사업장 등록 완료 — ${res.data.business_name}`, "/dashboard/business", "var(--accent)");
      const isFirst = businesses.length === 0;
      await fetchData();
      switchActive(res.data);
      if (isFirst) router.push("/dashboard");
    } catch (e: any) {
      setBizMsg({ ok: false, text: e?.response?.data?.detail ?? "등록 실패" });
    } finally { setBizSubmitting(false); }
  };

  // ── 사업장 수정 시작 ──
  const startEditBiz = (biz: Business, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBizId(biz.id);
    setEditBizForm({
      business_name: biz.business_name ?? "",
      business_number: biz.business_number ?? "",
      owner_name: biz.owner_name ?? "",
      industry: biz.industry ?? "",
      business_type: biz.business_type ?? "",
      open_date: biz.open_date ?? "",
    });
  };

  // ── 사업장 수정 저장 ──
  const saveEditBiz = async (bizId: number) => {
    if (!editBizForm.business_name.trim()) return;
    setEditBizSubmitting(true);
    try {
      const res = await api.patch(`/api/business/${bizId}`, {
        business_name: editBizForm.business_name.trim(),
        business_number: editBizForm.business_number || null,
        owner_name: editBizForm.owner_name || null,
        industry: editBizForm.industry || null,
        business_type: editBizForm.business_type || null,
        open_date: editBizForm.open_date || null,
      });
      setBusinesses(prev => prev.map(b => b.id === bizId ? res.data : b));
      addNotif(`사업장 정보 수정 완료 — ${res.data.business_name}`, "/dashboard/business", "var(--accent)");
      if (bizId === activeBizId) {
        localStorage.setItem("business", JSON.stringify(res.data));
        window.dispatchEvent(new CustomEvent("business-updated", { detail: res.data }));
      }
      setEditingBizId(null);
    } catch (e: any) { setModal({ message: e?.response?.data?.detail ?? "수정 실패", variant: "error" }); }
    finally { setEditBizSubmitting(false); }
  };

  // ── 사업장 삭제 ──
  const deleteBusiness = (bizId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setModal({
      title: "사업장 삭제",
      message: "사업장을 삭제하면 모든 거래 데이터도 함께 삭제됩니다.\n삭제하면 복구할 수 없습니다",
      variant: "danger",
      showCancel: true,
      confirmLabel: "삭제",
      onConfirm: async () => {
        try {
          await api.delete(`/api/business/${bizId}`);
          const next = businesses.filter(b => b.id !== bizId);
          setBusinesses(next);
          if (bizId === activeBizId) {
            const fallback = next[0];
            if (fallback) {
              switchActive(fallback);
            } else {
              setActiveBizId(null);
              localStorage.removeItem("activeBizId");
              localStorage.removeItem("business");
              setVendors([]);
            }
          }
        } catch (err: any) { setModal({ message: err?.response?.data?.detail ?? "삭제 실패", variant: "error" }); }
      },
    });
  };

  // ── 거래처 추가 ──
  const addVendor = async () => {
    if (!vForm.vendor_name || !activeBusiness) return;
    setVendorSubmitting(true);
    try {
      await api.post(`/api/business/${activeBusiness.id}/vendors`, vForm);
      setVForm(emptyVendorForm); setShowVendorForm(false);
      const vRes = await api.get(`/api/business/${activeBusiness.id}/vendors`);
      setVendors(vRes.data);
    } catch (e: any) { setModal({ message: e?.response?.data?.detail ?? "오류 발생", variant: "error" }); }
    finally { setVendorSubmitting(false); }
  };

  // ── 거래처 수정 시작 ──
  const startEditVendor = (v: Vendor) => {
    setEditingVendorId(v.id);
    setEditVForm({ vendor_name: v.vendor_name ?? "", vendor_type: v.vendor_type ?? "거래처", business_number: v.business_number ?? "", contact: v.contact ?? "" });
  };

  // ── 거래처 수정 저장 ──
  const saveEditVendor = async (vendorId: number) => {
    if (!editVForm.vendor_name || !activeBusiness) return;
    setEditVendorSubmitting(true);
    try {
      const res = await api.patch(`/api/business/${activeBusiness.id}/vendors/${vendorId}`, editVForm);
      setVendors(prev => prev.map(v => v.id === vendorId ? res.data : v));
      setEditingVendorId(null);
    } catch (e: any) { setModal({ message: e?.response?.data?.detail ?? "수정 실패", variant: "error" }); }
    finally { setEditVendorSubmitting(false); }
  };

  // ── 거래처 삭제 ──
  const deleteVendor = (vendorId: number) => {
    if (!activeBusiness) return;
    setModal({
      title: "거래처 삭제",
      message: "거래처를 삭제하시겠습니까?",
      variant: "danger",
      showCancel: true,
      confirmLabel: "삭제",
      onConfirm: async () => {
        try {
          await api.delete(`/api/business/${activeBusiness.id}/vendors/${vendorId}`);
          setVendors(prev => prev.filter(v => v.id !== vendorId));
        } catch (err: any) { setModal({ message: err?.response?.data?.detail ?? "삭제 실패", variant: "error" }); }
      },
    });
  };

  const card: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "7px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box" };
  const iconBtn = (color?: string): React.CSSProperties => ({ width: "30px", height: "30px", borderRadius: "7px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: color ?? "var(--text-muted)", flexShrink: 0 });

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>불러오는 중...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>거래처 · 사업장</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>사업장 정보와 거래처를 관리하세요</p>
      </div>

      {/* ── 사업장 목록 ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Building2 size={18} color="var(--accent)" />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>사업장 목록</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", backgroundColor: "var(--bg-surface-2)", padding: "2px 8px", borderRadius: "6px" }}>{businesses.length}개</span>
          </div>
          {isEmployee ? (
            <button onClick={() => { setShowJoinForm(v => !v); setJoinMsg(null); }}
              style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              <Plus size={14} /> 사업장 가입 요청
            </button>
          ) : (
            <button onClick={() => { setShowBizForm(v => !v); setBizMsg(null); }}
              style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              <Plus size={14} /> 사업장 추가
            </button>
          )}
        </div>

        {/* 직원 — 사업장 가입 요청 폼 */}
        {isEmployee && showJoinForm && (
          <div style={{ ...card, padding: "18px", marginBottom: "12px", border: "1.5px solid var(--accent)" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>사업장 가입 요청</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.5 }}>
              소속되고자 하는 사업장의 사업자등록번호를 입력하세요.<br />
              관리자 승인 후 사업장에 연결됩니다.
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="000-00-00000"
                value={joinBizNum}
                onChange={e => setJoinBizNum(formatJoinBizNum(e.target.value))}
                onKeyDown={e => { if (e.key === "Enter") submitJoinRequest(); }}
                style={{ ...inputStyle, flex: 1, fontSize: "15px" }}
              />
              <button onClick={submitJoinRequest} disabled={joinSubmitting}
                style={{ padding: "7px 18px", borderRadius: "8px", backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", fontSize: "13px", fontWeight: 700, cursor: joinSubmitting ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: joinSubmitting ? 0.7 : 1 }}>
                {joinSubmitting ? "요청 중..." : "가입 요청"}
              </button>
            </div>
            {joinMsg && (
              <p style={{ fontSize: "12px", color: joinMsg.ok ? "#10B981" : "#EF4444", lineHeight: 1.5 }}>{joinMsg.text}</p>
            )}
            <button onClick={() => { setShowJoinForm(false); setJoinMsg(null); setJoinBizNum(""); }}
              style={{ marginTop: "10px", background: "none", border: "none", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}>
              닫기
            </button>
          </div>
        )}

        {/* 관리자 — 사업장 추가 폼 */}
        {!isEmployee && showBizForm && (
          <div style={{ ...card, padding: "18px", marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>새 사업장 등록</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
              {([
                { label: "상호명 *", key: "business_name", placeholder: "예: 맛있는 김밥" },
                { label: "사업자번호", key: "business_number", placeholder: "000-00-00000" },
                { label: "대표자", key: "owner_name", placeholder: "대표자 이름" },
                { label: "업태", key: "business_type", placeholder: "예: 음식점" },
                { label: "개업일", key: "open_date", placeholder: "", type: "date" },
              ] as { label: string; key: keyof typeof bForm; placeholder: string; type?: string }[]).map(f => (
                <div key={f.key}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>{f.label}</p>
                  <input type={f.type ?? "text"} placeholder={f.placeholder} value={bForm[f.key]}
                    onChange={e => setBForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={inputStyle} />
                </div>
              ))}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>업종</p>
                <select value={bForm.industry} onChange={e => setBForm(prev => ({ ...prev, industry: e.target.value }))}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">선택</option>
                  {INDUSTRY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {bizMsg && <p style={{ fontSize: "12px", color: bizMsg.ok ? "#10B981" : "#EF4444", marginBottom: "10px" }}>{bizMsg.text}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addBusiness} disabled={bizSubmitting}
                style={{ flex: 1, backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", padding: "9px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                {bizSubmitting ? "처리 중..." : "등록"}
              </button>
              <button onClick={() => { setShowBizForm(false); setBizMsg(null); setBForm(emptyBizForm); }}
                style={{ backgroundColor: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", cursor: "pointer" }}>
                취소
              </button>
            </div>
          </div>
        )}

        {/* 사업장 카드 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {businesses.length === 0 ? (
            <div style={{ ...card, padding: "50px", textAlign: "center", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>소속된 사업장이 없습니다</p>
              <p style={{ fontSize: "13px" }}>
                {isEmployee
                  ? "사업장 가입 요청 버튼을 눌러 소속 사업장을 신청하세요"
                  : "사업장 추가 버튼을 눌러 등록하세요"}
              </p>
            </div>
          ) : businesses.map(biz => {
            const isActive = biz.id === activeBizId;
            const isEditing = editingBizId === biz.id;

            if (isEditing) {
              return (
                <div key={biz.id} style={{ ...card, padding: "18px", border: "1px solid var(--accent)" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>사업장 수정</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "12px" }}>
                    {([
                      { label: "상호명 *", key: "business_name", placeholder: "" },
                      { label: "사업자번호", key: "business_number", placeholder: "000-00-00000" },
                      { label: "대표자", key: "owner_name", placeholder: "" },
                      { label: "업태", key: "business_type", placeholder: "" },
                      { label: "개업일", key: "open_date", placeholder: "", type: "date" },
                    ] as { label: string; key: keyof typeof editBizForm; placeholder: string; type?: string }[]).map(f => (
                      <div key={f.key}>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>{f.label}</p>
                        <input type={f.type ?? "text"} placeholder={f.placeholder} value={editBizForm[f.key]}
                          onChange={e => setEditBizForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          style={inputStyle} />
                      </div>
                    ))}
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>업종</p>
                      <select value={editBizForm.industry} onChange={e => setEditBizForm(prev => ({ ...prev, industry: e.target.value }))}
                        style={{ ...inputStyle, cursor: "pointer" }}>
                        <option value="">선택</option>
                        {INDUSTRY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => saveEditBiz(biz.id)} disabled={editBizSubmitting}
                      style={{ flex: 1, backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", padding: "9px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                      {editBizSubmitting ? "저장 중..." : "저장"}
                    </button>
                    <button onClick={() => setEditingBizId(null)}
                      style={{ backgroundColor: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", cursor: "pointer" }}>
                      취소
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={biz.id} onClick={() => switchActive(biz)}
                style={{ ...card, padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`, transition: "border-color 0.15s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface)"; }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "12px", backgroundColor: isActive ? "var(--accent)" : "var(--bg-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: isActive ? "1.5px solid #C49A30" : "1px solid var(--border)" }}>
                  <Building2 size={22} color={isActive ? "var(--accent-text)" : "var(--text-muted)"} />
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)" }}>{biz.business_name}</span>
                    {isActive && (
                      <span style={{ fontSize: "10px", fontWeight: 700, backgroundColor: "var(--accent-light)", color: "var(--accent)", padding: "2px 8px", borderRadius: "5px", border: "1px solid #C49A30" }}>사용 중</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "16px" }}>
                    {[{ label: "대표자", value: biz.owner_name }, { label: "사업자번호", value: biz.business_number }, { label: "업종", value: biz.industry }]
                      .filter(f => f.value).map(f => (
                        <span key={f.label} style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          <span style={{ color: "var(--text-subtle)" }}>{f.label} </span>{f.value}
                        </span>
                      ))}
                  </div>
                </div>
                {isActive && <CheckCircle2 size={20} color="var(--accent)" style={{ flexShrink: 0 }} />}
                <div style={{ display: "flex", gap: "6px" }} onClick={e => e.stopPropagation()}>
                  <button onClick={e => startEditBiz(biz, e)} style={iconBtn()}
                    title="수정"
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={e => deleteBusiness(biz.id, e)} style={iconBtn()}
                    title="삭제"
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 거래처 목록 ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={18} color="var(--accent)" />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>거래처 목록</span>
            {activeBusiness && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>— {activeBusiness.business_name}</span>}
            <span style={{ fontSize: "12px", color: "var(--text-muted)", backgroundColor: "var(--bg-surface-2)", padding: "2px 8px", borderRadius: "6px" }}>{vendors.length}개</span>
          </div>
          {activeBusiness && (
            <button onClick={() => setShowVendorForm(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              <Plus size={14} /> 거래처 추가
            </button>
          )}
        </div>

        {/* 거래처 추가 폼 */}
        {showVendorForm && (
          <div style={{ ...card, padding: "18px", marginBottom: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "12px" }}>
              {([
                { label: "거래처명 *", key: "vendor_name", placeholder: "예: 밀가루 공급사" },
                { label: "사업자번호", key: "business_number", placeholder: "000-00-00000" },
                { label: "연락처", key: "contact", placeholder: "010-0000-0000" },
              ] as { label: string; key: keyof typeof vForm; placeholder: string }[]).map(f => (
                <div key={f.key}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>{f.label}</p>
                  <input placeholder={f.placeholder} value={vForm[f.key]}
                    onChange={e => setVForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={inputStyle} />
                </div>
              ))}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>유형</p>
                <select value={vForm.vendor_type} onChange={e => setVForm(prev => ({ ...prev, vendor_type: e.target.value }))}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addVendor} disabled={vendorSubmitting}
                style={{ flex: 1, backgroundColor: "var(--accent)", color: "var(--accent-text)", border: "none", borderRadius: "8px", padding: "9px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                {vendorSubmitting ? "처리 중..." : "등록"}
              </button>
              <button onClick={() => setShowVendorForm(false)}
                style={{ backgroundColor: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", cursor: "pointer" }}>
                취소
              </button>
            </div>
          </div>
        )}

        {/* 거래처 목록 */}
        <div style={{ ...card, overflow: "hidden" }}>
          {vendors.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>등록된 거래처가 없습니다</p>
              <p style={{ fontSize: "13px" }}>거래처 추가 버튼을 눌러 등록하세요</p>
            </div>
          ) : vendors.map((v, i) => {
            const isEditingThis = editingVendorId === v.id;
            return (
              <div key={v.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
                {isEditingThis ? (
                  /* 인라인 수정 행 */
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px auto", gap: "8px", padding: "12px 16px", alignItems: "center", backgroundColor: "var(--bg-surface-2)" }}>
                    <input value={editVForm.vendor_name} placeholder="거래처명"
                      onChange={e => setEditVForm(p => ({ ...p, vendor_name: e.target.value }))}
                      style={{ ...inputStyle, fontSize: "12px" }} autoFocus />
                    <input value={editVForm.business_number} placeholder="사업자번호"
                      onChange={e => setEditVForm(p => ({ ...p, business_number: e.target.value }))}
                      style={{ ...inputStyle, fontSize: "12px" }} />
                    <input value={editVForm.contact} placeholder="연락처"
                      onChange={e => setEditVForm(p => ({ ...p, contact: e.target.value }))}
                      style={{ ...inputStyle, fontSize: "12px" }} />
                    <select value={editVForm.vendor_type} onChange={e => setEditVForm(p => ({ ...p, vendor_type: e.target.value }))}
                      style={{ ...inputStyle, fontSize: "12px", cursor: "pointer" }}>
                      {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => saveEditVendor(v.id)} disabled={editVendorSubmitting}
                        style={{ ...iconBtn("var(--accent)"), backgroundColor: "var(--accent-light)", border: "1px solid #C49A30" }}
                        title="저장">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingVendorId(null)} style={iconBtn()} title="취소"
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-3)"; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 일반 행 */
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: "var(--bg-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Building2 size={18} color="var(--text-muted)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{v.vendor_name}</span>
                        <span style={{ fontSize: "10px", backgroundColor: "var(--accent-light)", color: "var(--accent)", padding: "2px 7px", borderRadius: "5px", fontWeight: 600, border: "1px solid #C49A30" }}>{v.vendor_type}</span>
                      </div>
                      <div style={{ display: "flex", gap: "14px", marginTop: "3px" }}>
                        {v.business_number && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{v.business_number}</span>}
                        {v.contact && <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}><Phone size={10} />{v.contact}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => startEditVendor(v)} style={iconBtn()} title="수정"
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; e.currentTarget.style.color = "var(--accent)"; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteVendor(v.id)} style={iconBtn()} title="삭제"
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
