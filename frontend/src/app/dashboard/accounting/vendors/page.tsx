"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useRole, canWrite, canDelete } from "@/hooks/useRole";
import Modal, { ModalConfig } from "@/components/Modal";

const TYPES = ["매출처", "매입처", "양방향", "기타"];

const TYPE_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  매출처: { bg: "rgba(21,128,61,0.12)",   color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  매입처: { bg: "rgba(29,78,216,0.12)",   color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.40)" },
  양방향: { bg: "rgba(126,34,206,0.12)",  color: "#7E22CE", border: "1px solid rgba(126,34,206,0.40)" },
  기타:   { bg: "rgba(107,114,128,0.10)", color: "#374151", border: "1px solid rgba(107,114,128,0.30)" },
};

const EMPTY: any = {
  vendor_name: "", vendor_type: "기타", business_number: "",
  ceo_name: "", contact_name: "", contact: "", email: "",
  address: "", industry: "", bank_name: "", account_number: "",
  bank_holder: "", credit_limit: 0, payment_terms: 30,
  consultation_history: "", note: "", is_active: 1,
};

export default function VendorsPage() {
  const role = useRole();
  const searchParams = useSearchParams();
  const [vendors, setVendors]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>(() => searchParams.get("is_active") ?? "");

  // 모달
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any | null>(null);
  const [form, setForm]           = useState<any>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState<ModalConfig | null>(null);

  // 상세 드로어
  const [drawer, setDrawer] = useState<any | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search)      params.search      = search;
      if (typeFilter)  params.vendor_type = typeFilter;
      if (activeFilter !== "") params.is_active = activeFilter;
      const res = await api.get("/api/accounting/vendors/", {
        params,
        headers: { "X-Business-Id": bizId() },
      });
      setVendors(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, typeFilter, activeFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit   = (v: any) => {
    setEditing(v);
    setForm({
      vendor_name: v.vendor_name || "", vendor_type: v.vendor_type || "기타",
      business_number: v.business_number || "", ceo_name: v.ceo_name || "",
      contact_name: v.contact_name || "", contact: v.contact || "",
      email: v.email || "", address: v.address || "", industry: v.industry || "",
      bank_name: v.bank_name || "", account_number: v.account_number || "",
      bank_holder: v.bank_holder || "", credit_limit: v.credit_limit ?? 0,
      payment_terms: v.payment_terms ?? 30,
      consultation_history: v.consultation_history || "", note: v.note || "", is_active: v.is_active ?? 1,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.vendor_name.trim()) return;
    setModal({
      title: editing ? "거래처 수정" : "거래처 등록", variant: "info", showCancel: true,
      confirmLabel: editing ? "수정" : "등록",
      message: editing ? "거래처 정보를 수정하시겠습니까?" : "거래처를 등록하시겠습니까?",
      onConfirm: async () => {
        setSaving(true);
        try {
          const h = { "X-Business-Id": bizId() };
          if (editing) {
            await api.put(`/api/accounting/vendors/${editing.id}`, form, { headers: h });
          } else {
            await api.post("/api/accounting/vendors/", form, { headers: h });
          }
          setShowModal(false);
          await load();
        } catch (e: any) {
          setModal({ message: e?.response?.data?.detail ?? "저장에 실패했습니다.", variant: "error" });
        }
        finally { setSaving(false); }
      },
    });
  };

  const handleDelete = (id: number) => {
    setModal({ title: "삭제 확인", message: "거래처를 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        try {
          await api.delete(`/api/accounting/vendors/${id}`, { headers: { "X-Business-Id": bizId() } });
          setDrawer(null);
          await load();
        } catch (e: any) {
          setModal({ message: e?.response?.data?.detail ?? "삭제에 실패했습니다.", variant: "error" });
        }
      } });
  };

  const toggleActive = async (v: any) => {
    try {
      await api.put(`/api/accounting/vendors/${v.id}`, { is_active: v.is_active === 1 ? 0 : 1 }, { headers: { "X-Business-Id": bizId() } });
      await load();
      if (drawer?.id === v.id) setDrawer((prev: any) => ({ ...prev, is_active: prev.is_active === 1 ? 0 : 1 }));
    } catch (e: any) {
      setModal({ message: e?.response?.data?.detail ?? "상태 변경에 실패했습니다.", variant: "error" });
    }
  };

  const F = (key: string, label: string, type = "text", opts?: string[]) => (
    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
      {opts ? (
        <select
          value={form[key]}
          onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
          style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={form[key]}
          onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
          rows={3}
          style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }}
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm((p: any) => ({ ...p, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
          style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}
        />
      )}
    </div>
  );

  return (
    <div style={{ width: "100%" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>거래처 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>매출처 · 매입처를 등록하고 거래 이력을 관리합니다. · {vendors.length}곳</p>
        </div>
        {canWrite(role) && (
          <button
            onClick={openCreate}
            style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            + 거래처 등록
          </button>
        )}
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="거래처명, 사업자번호, 대표자 검색..."
          style={{ flex: 1, minWidth: "220px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 유형</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={activeFilter}
          onChange={e => setActiveFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 상태</option>
          <option value="1">거래 중</option>
          <option value="0">거래중지</option>
        </select>
      </div>

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["거래처명", "유형", "사업자번호", "대표자", "연락처", "결제조건", "상태", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            ) : vendors.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                등록된 거래처가 없습니다<br />
                {canWrite(role) && <button onClick={openCreate} style={{ marginTop: "12px", padding: "8px 16px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>첫 거래처 등록</button>}
              </td></tr>
            ) : vendors.map((v, i) => {
              const tc = TYPE_COLOR[v.vendor_type] || TYPE_COLOR["기타"];
              return (
                <tr key={v.id}
                  onClick={() => setDrawer(v)}
                  style={{ borderBottom: i < vendors.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={{ padding: "13px 16px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{v.vendor_name}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ backgroundColor: tc.bg, color: tc.color, border: tc.border, fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{v.vendor_type || "기타"}</span>
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>{v.business_number || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>{v.ceo_name || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>{v.contact || "—"}</td>
                  <td style={{ padding: "13px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>{v.payment_terms ?? 30}일</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px",
                      backgroundColor: v.is_active === 1 ? "rgba(21,128,61,0.12)" : "rgba(107,114,128,0.10)",
                      border: v.is_active === 1 ? "1px solid rgba(21,128,61,0.40)" : "1px solid rgba(107,114,128,0.30)",
                      color: v.is_active === 1 ? "#15803D" : "#9CA3AF",
                    }}>
                      {v.is_active === 1 ? "거래 중" : "거래중지"}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {canWrite(role) && (
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(v); }}
                        style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" }}>
                        수정
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {/* ── 상세 드로어 ── */}
      {drawer && (
        <>
          <div onClick={() => setDrawer(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", backgroundColor: "var(--bg-surface)", borderLeft: "1px solid var(--border)", zIndex: 201, overflowY: "auto", padding: "28px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>{drawer.vendor_name}</h2>
              <button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {[
              { label: "유형",     value: drawer.vendor_type },
              { label: "사업자번호", value: drawer.business_number },
              { label: "대표자",   value: drawer.ceo_name },
              { label: "담당자",   value: drawer.contact_name },
              { label: "연락처",   value: drawer.contact },
              { label: "이메일",   value: drawer.email },
              { label: "업종",     value: drawer.industry },
              { label: "주소",     value: drawer.address },
            ].map(row => row.value ? (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: "13px", color: "var(--text-primary)", textAlign: "right", maxWidth: "240px", wordBreak: "break-all" }}>{row.value}</span>
              </div>
            ) : null)}

            {(drawer.bank_name || drawer.account_number) && (
              <div style={{ marginTop: "16px", padding: "14px", backgroundColor: "var(--bg-surface-2)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>계좌 정보</p>
                <p style={{ fontSize: "13px", color: "var(--text-primary)" }}>{drawer.bank_name} {drawer.account_number}</p>
                {drawer.bank_holder && <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>예금주: {drawer.bank_holder}</p>}
              </div>
            )}

            {drawer.consultation_history && (
              <div style={{ marginTop: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>상담 내역</p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{drawer.consultation_history}</p>
              </div>
            )}
            {drawer.note && (
              <div style={{ marginTop: "16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>메모</p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{drawer.note}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "28px" }}>
              {canWrite(role) && (
                <button
                  onClick={() => { setDrawer(null); openEdit(drawer); }}
                  style={{ flex: 1, padding: "10px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                  수정
                </button>
              )}
              {canWrite(role) && (
                <button
                  onClick={() => toggleActive(drawer)}
                  style={{ flex: 1, padding: "10px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  {drawer.is_active === 1 ? "거래중지" : "거래재개"}
                </button>
              )}
              {canDelete(role) && (
                <button
                  onClick={() => handleDelete(drawer.id)}
                  style={{ padding: "10px 14px", backgroundColor: "rgba(220,38,38,0.12)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.40)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  삭제
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── 등록/수정 모달 ── */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "680px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>
                {editing ? "거래처 수정" : "거래처 등록"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* 기본정보 */}
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>기본 정보</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>거래처명 *</label>
                <input
                  value={form.vendor_name}
                  onChange={e => setForm((p: any) => ({ ...p, vendor_name: e.target.value }))}
                  placeholder="필수 입력"
                  style={{ padding: "8px 10px", border: `1px solid ${!form.vendor_name.trim() ? "#FCA5A5" : "var(--border)"}`, borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}
                />
              </div>
              {F("vendor_type", "거래처 유형", "text", TYPES)}
              {F("business_number", "사업자번호")}
              {F("ceo_name", "대표자명")}
              {F("contact_name", "담당자명")}
              {F("contact", "연락처")}
              {F("email", "이메일", "email")}
              {F("industry", "업종")}
              <div style={{ gridColumn: "1 / -1" }}>{F("address", "주소")}</div>

              {/* 결제 조건 */}
              <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>결제 조건</p>
              </div>
              {F("credit_limit", "여신한도 (원)", "number")}
              {F("payment_terms", "결제조건 (일)", "number")}

              {/* 계좌 정보 */}
              <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px" }}>계좌 정보</p>
              </div>
              {F("bank_name", "은행명")}
              {F("account_number", "계좌번호")}
              {F("bank_holder", "예금주")}

              <div style={{ gridColumn: "1 / -1" }}>{F("consultation_history", "상담 내역", "textarea")}</div>
              <div style={{ gridColumn: "1 / -1" }}>{F("note", "메모", "textarea")}</div>

              {/* 상태 */}
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>거래 중</label>
                <input
                  type="checkbox"
                  checked={form.is_active === 1}
                  onChange={e => setForm((p: any) => ({ ...p, is_active: e.target.checked ? 1 : 0 }))}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button
                onClick={handleSave}
                disabled={saving || !form.vendor_name.trim()}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : editing ? "수정 완료" : "등록"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
