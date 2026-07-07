"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";

const EMPTY_FORM = { product_id: "", version: "1.0", description: "" };
const EMPTY_LINE = { item_id: "", quantity: "", unit: "", note: "" };

export default function BomPage() {
  const [boms, setBoms]       = useState<any[]>([]);
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState<any>({ ...EMPTY_FORM });
  const [lines, setLines]         = useState<any[]>([{ ...EMPTY_LINE }]);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [modal, setModal]         = useState<ModalConfig | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const headers = () => ({ "X-Business-Id": bizId() });

  const load = useCallback(async () => {
    setLoading(true);
    const [b, i] = await Promise.all([
      api.get("/api/production/boms",  { headers: headers() }).catch(() => ({ data: [] })),
      api.get("/api/production/items", { headers: headers() }).catch(() => ({ data: [] })),
    ]);
    setBoms(b.data);
    setItems(i.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setLines([{ ...EMPTY_LINE }]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.product_id) return;
    const validLines = lines.filter(l => l.item_id && l.quantity);
    setSaving(true);
    try {
      await api.post("/api/production/boms", {
        product_id: Number(form.product_id),
        version:    form.version,
        description: form.description,
        lines: validLines.map(l => ({
          item_id:  Number(l.item_id),
          quantity: parseFloat(l.quantity),
          unit:     l.unit,
          note:     l.note,
        })),
      }, { headers: headers() });
      setShowModal(false);
      await load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    setModal({ title: "삭제 확인", message: "BOM을 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        setDeleting(true);
        try { await api.delete(`/api/production/boms/${id}`, { headers: headers() }); setSelected(null); await load(); }
        catch { /* ignore */ }
        finally { setDeleting(false); }
      } });
  };

  const addLine = () => setLines(p => [...p, { ...EMPTY_LINE }]);
  const removeLine = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));
  const setLine = (i: number, key: string, val: string) =>
    setLines(p => p.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

  const products   = items.filter(i => i.item_type === "완제품" || i.item_type === "반제품");
  const materials  = items.filter(i => i.item_type === "원자재" || i.item_type === "반제품" || i.item_type === "소모품");

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>자재명세서 (BOM)</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>제품 구성 자재를 정의합니다. · {boms.length}건</p>
        </div>
        <button onClick={openCreate}
          style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + BOM 등록
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: "20px" }}>
        {/* 목록 */}
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                {["제품명", "버전", "구성 자재 수", "설명", ""].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
              ) : boms.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>등록된 BOM이 없습니다</td></tr>
              ) : boms.map((bom, i) => (
                <tr key={bom.id}
                  onClick={() => setSelected(selected?.id === bom.id ? null : bom)}
                  style={{ borderBottom: i < boms.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer", backgroundColor: selected?.id === bom.id ? "var(--bg-surface-2)" : "transparent" }}
                  onMouseEnter={e => { if (selected?.id !== bom.id) e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                  onMouseLeave={e => { if (selected?.id !== bom.id) e.currentTarget.style.backgroundColor = "transparent"; }}>
                  <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{bom.product_name}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", backgroundColor: "var(--bg-surface-3)", color: "var(--text-muted)" }}>v{bom.version}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{bom.lines?.length ?? 0}개</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bom.description || "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <button onClick={e => { e.stopPropagation(); handleDelete(bom.id); }}
                      disabled={deleting}
                      style={{ fontSize: "11px", color: "#DC2626", background: "none", border: "1px solid #FCA5A5", borderRadius: "6px", padding: "3px 7px", cursor: "pointer" }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 상세 드로어 */}
        {selected && (
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>{selected.product_name}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>v{selected.version}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            {selected.description && (
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px", padding: "10px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px" }}>{selected.description}</p>
            )}
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px" }}>구성 자재 ({selected.lines?.length ?? 0})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(selected.lines ?? []).map((line: any, idx: number) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px" }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{line.item_name}</p>
                    {line.note && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>{line.note}</p>}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{line.quantity} {line.unit || ""}</span>
                </div>
              ))}
              {(!selected.lines || selected.lines.length === 0) && (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "12px", textAlign: "center" }}>등록된 자재가 없습니다</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 등록 모달 */}
      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "560px", maxHeight: "90vh", overflowY: "auto", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>BOM 등록</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* 기본 정보 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>완제품 / 반제품 *</label>
                <select value={form.product_id} onChange={e => setForm((p: any) => ({ ...p, product_id: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }}>
                  <option value="">선택...</option>
                  {products.map((i: any) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>버전</label>
                <input value={form.version} onChange={e => setForm((p: any) => ({ ...p, version: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>설명</label>
                <input value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
              </div>
            </div>

            {/* 자재 라인 */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>구성 자재</p>
                <button onClick={addLine}
                  style={{ fontSize: "12px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" }}>
                  + 자재 추가
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lines.map((line, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", alignItems: "start" }}>
                    <select value={line.item_id} onChange={e => setLine(idx, "item_id", e.target.value)}
                      style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px" }}>
                      <option value="">자재 선택...</option>
                      {materials.map((i: any) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                    </select>
                    <input type="number" placeholder="수량" value={line.quantity} onChange={e => setLine(idx, "quantity", e.target.value)}
                      style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px" }} />
                    <input placeholder="단위" value={line.unit} onChange={e => setLine(idx, "unit", e.target.value)}
                      style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "12px" }} />
                    <button onClick={() => removeLine(idx)}
                      style={{ padding: "7px 10px", background: "none", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px" }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleSave} disabled={saving || !form.product_id}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : "저장"}
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
