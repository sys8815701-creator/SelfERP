"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useRole, canWrite, canDelete } from "@/hooks/useRole";
import Modal, { ModalConfig } from "@/components/Modal";

const TYPES = ["원자재", "반제품", "완제품", "소모품"];

const TYPE_COLOR: Record<string, { backgroundColor: string; color: string; border: string }> = {
  원자재: { backgroundColor: "rgba(29,78,216,0.12)",   color: "#1D4ED8", border: "1px solid rgba(29,78,216,0.40)" },
  반제품: { backgroundColor: "rgba(217,119,6,0.12)",   color: "#D97706", border: "1px solid rgba(217,119,6,0.40)" },
  완제품: { backgroundColor: "rgba(21,128,61,0.12)",   color: "#15803D", border: "1px solid rgba(21,128,61,0.40)" },
  소모품: { backgroundColor: "rgba(107,114,128,0.10)", color: "#6B7280", border: "1px solid rgba(107,114,128,0.30)" },
};

const EMPTY = { item_code: "", item_name: "", item_type: "원자재", unit: "개", unit_price: 0, current_stock: 0, safety_stock: 0, max_stock: 0, description: "" };

function fmt(v: any) { return parseFloat(String(v ?? 0)).toLocaleString("ko-KR"); }

export default function ItemsPage() {
  const role = useRole();
  const [items, setItems]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch]     = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [form, setForm]           = useState<any>({ ...EMPTY });
  const [saving, setSaving]       = useState(false);
  const [drawer, setDrawer]       = useState<any>(null);
  const [modal, setModal]         = useState<ModalConfig | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";

  const load = useCallback(async () => {
    setLoading(true);
    const params: any = {};
    if (typeFilter)   params.item_type      = typeFilter;
    if (lowStockOnly) params.low_stock_only = true;
    if (search)       params.search         = search;
    try {
      const res = await api.get("/api/production/items", { params, headers: { "X-Business-Id": bizId() } });
      setItems(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [typeFilter, lowStockOnly, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setShowModal(true); };
  const openEdit   = (item: any) => {
    setEditing(item);
    setForm({
      item_code: item.item_code || "", item_name: item.item_name,
      item_type: item.item_type, unit: item.unit,
      unit_price: Number(item.unit_price), current_stock: Number(item.current_stock),
      safety_stock: Number(item.safety_stock), max_stock: Number(item.max_stock),
      description: item.description || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.item_name) return;
    setSaving(true);
    try {
      const h = { "X-Business-Id": bizId() };
      if (editing) {
        const { current_stock, ...updateBody } = form;
        await api.put(`/api/production/items/${editing.id}`, updateBody, { headers: h });
      } else {
        await api.post("/api/production/items", form, { headers: h });
      }
      setShowModal(false);
      await load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    setModal({ title: "삭제 확인", message: "품목을 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        try {
          await api.delete(`/api/production/items/${id}`, { headers: { "X-Business-Id": bizId() } });
          setDrawer(null);
          await load();
        } catch (e: any) {
          setModal({ message: e.response?.data?.detail || "삭제 실패", variant: "error" });
        }
      } });
  };

  const F = (key: string, label: string, type = "text", opts?: string[]) => (
    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
      {opts ? (
        <select value={form[key]} onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))}
          style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]}
          onChange={e => setForm((p: any) => ({ ...p, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
          style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
      )}
    </div>
  );

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>품목 · 재고</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>원자재 · 반제품 · 완제품을 관리합니다. · {items.length}개</p>
        </div>
        {canWrite(role) && (
          <button onClick={openCreate}
            style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            + 품목 등록
          </button>
        )}
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="품목명, 코드 검색..."
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "13px" }}>
          <option value="">전체 유형</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
          안전재고 부족만
        </label>
      </div>

      {/* 테이블 */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
              {["코드", "품목명", "유형", "단위", "현재고", "안전재고", "기준단가", "상태", ""].map(h => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                등록된 품목이 없습니다<br />
                {canWrite(role) && <button onClick={openCreate} style={{ marginTop: "12px", padding: "8px 16px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>품목 등록</button>}
              </td></tr>
            ) : items.map((item, i) => {
              const tc = TYPE_COLOR[item.item_type] || { bg: "#F3F4F6", color: "#374151" };
              const isLow = item.is_low_stock;
              return (
                <tr key={item.id}
                  onClick={() => setDrawer(item)}
                  style={{ borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer", backgroundColor: isLow ? "rgba(239,68,68,0.03)" : "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = isLow ? "rgba(239,68,68,0.03)" : "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{item.item_code || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{item.item_name}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ ...tc, fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px" }}>{item.item_type}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-muted)" }}>{item.unit}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: 700, color: isLow ? "#DC2626" : "var(--text-primary)" }}>
                    {fmt(item.current_stock)}
                    {isLow && <span style={{ marginLeft: "6px", fontSize: "10px", color: "#DC2626" }}>⚠ 부족</span>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{fmt(item.safety_stock)}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{Number(item.unit_price).toLocaleString()}원</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px",
                      backgroundColor: item.is_active === 1 ? "rgba(21,128,61,0.12)" : "rgba(107,114,128,0.10)",
                      border: item.is_active === 1 ? "1px solid rgba(21,128,61,0.40)" : "1px solid rgba(107,114,128,0.30)",
                      color: item.is_active === 1 ? "#15803D" : "#9CA3AF" }}>
                      {item.is_active === 1 ? "사용" : "중지"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {canWrite(role) && (
                      <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                        style={{ fontSize: "12px", color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}>수정</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {/* 드로어 */}
      {drawer && (
        <>
          <div onClick={() => setDrawer(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "360px", backgroundColor: "var(--bg-surface)", borderLeft: "1px solid var(--border)", zIndex: 201, overflowY: "auto", padding: "28px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>{drawer.item_name}</h2>
              <button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            {[
              { label: "품목 코드", value: drawer.item_code },
              { label: "유형",      value: drawer.item_type },
              { label: "단위",      value: drawer.unit },
              { label: "기준단가",  value: `${Number(drawer.unit_price).toLocaleString()}원` },
              { label: "현재 재고", value: `${fmt(drawer.current_stock)} ${drawer.unit}` },
              { label: "안전재고",  value: `${fmt(drawer.safety_stock)} ${drawer.unit}` },
              { label: "최대재고",  value: `${fmt(drawer.max_stock)} ${drawer.unit}` },
            ].map(r => r.value ? (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>{r.label}</span>
                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{r.value}</span>
              </div>
            ) : null)}
            {drawer.description && (
              <div style={{ marginTop: "14px" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>설명</p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{drawer.description}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
              {canWrite(role) && (
                <button onClick={() => { setDrawer(null); openEdit(drawer); }}
                  style={{ flex: 1, padding: "10px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>수정</button>
              )}
              {canDelete(role) && (
                <button onClick={() => handleDelete(drawer.id)}
                  style={{ padding: "10px 14px", backgroundColor: "transparent", color: "#EF4444", border: "1px solid #FCA5A5", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>삭제</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* 등록/수정 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "560px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>{editing ? "품목 수정" : "품목 등록"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {F("item_code", "품목 코드")}
              {F("item_type", "유형", "text", TYPES)}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>품목명 *</label>
                <input value={form.item_name} onChange={e => setForm((p: any) => ({ ...p, item_name: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              {F("unit", "단위")}
              {F("unit_price", "기준단가 (원)", "number")}
              {!editing && F("current_stock", "초기 재고", "number")}
              {F("safety_stock", "안전재고", "number")}
              {F("max_stock", "최대재고", "number")}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>설명</label>
                <textarea value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} rows={2}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={handleSave} disabled={saving || !form.item_name}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : editing ? "수정 완료" : "등록"}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
