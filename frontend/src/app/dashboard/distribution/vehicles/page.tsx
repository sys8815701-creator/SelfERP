"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";

const EMPTY = { plate_no: "", vehicle_type: "", driver_name: "", driver_phone: "", max_weight: "", note: "" };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);
  const [form, setForm]         = useState<any>({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [modal, setModal]       = useState<ModalConfig | null>(null);

  const bizId = () => localStorage.getItem("activeBizId") || "";
  const h = () => ({ "X-Business-Id": bizId() });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get("/api/distribution/vehicles", { headers: h() }).catch(() => ({ data: [] }));
    setVehicles(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ ...EMPTY }); setEditId(null); setShowModal(true); };
  const openEdit   = (v: any) => { setForm({ plate_no: v.plate_no, vehicle_type: v.vehicle_type || "", driver_name: v.driver_name || "", driver_phone: v.driver_phone || "", max_weight: v.max_weight ?? "", note: v.note || "" }); setEditId(v.id); setShowModal(true); };

  const handleSave = async () => {
    if (!form.plate_no) return;
    setSaving(true);
    try {
      const body = { ...form, max_weight: form.max_weight ? parseFloat(form.max_weight) : null };
      if (editId) await api.put(`/api/distribution/vehicles/${editId}`, body, { headers: h() });
      else await api.post("/api/distribution/vehicles", body, { headers: h() });
      setShowModal(false); setSelected(null); await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    setModal({ title: "삭제 확인", message: "차량을 삭제하시겠습니까?", variant: "danger", showCancel: true, confirmLabel: "삭제",
      onConfirm: async () => {
        await api.delete(`/api/distribution/vehicles/${id}`, { headers: h() });
        setSelected(null); await load();
      } });
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>차량 관리</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>배송 차량 및 기사를 관리합니다. · {vehicles.filter(v => v.is_active).length}대</p>
        </div>
        <button onClick={openCreate} style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
          + 차량 등록
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: "20px" }}>
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
                {["차량번호", "종류", "기사명", "연락처", "최대적재(kg)", "상태"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>불러오는 중...</td></tr>
              : vehicles.length === 0 ? <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>등록된 차량이 없습니다</td></tr>
              : vehicles.map((v, i) => (
                <tr key={v.id} onClick={() => setSelected(selected?.id === v.id ? null : v)}
                  style={{ borderBottom: i < vehicles.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer", backgroundColor: selected?.id === v.id ? "var(--bg-surface-2)" : "transparent" }}
                  onMouseEnter={e => { if (selected?.id !== v.id) e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                  onMouseLeave={e => { if (selected?.id !== v.id) e.currentTarget.style.backgroundColor = "transparent"; }}>
                  <td style={{ padding: "12px 14px", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{v.plate_no}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{v.vehicle_type || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-primary)" }}>{v.driver_name || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--text-muted)" }}>{v.driver_phone || "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>{v.max_weight ? `${parseFloat(v.max_weight).toLocaleString("ko-KR")}kg` : "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, backgroundColor: v.is_active ? "rgba(21,128,61,0.12)" : "rgba(107,114,128,0.10)", border: v.is_active ? "1px solid rgba(21,128,61,0.40)" : "1px solid rgba(107,114,128,0.30)", color: v.is_active ? "#15803D" : "#6B7280" }}>
                      {v.is_active ? "운행중" : "미사용"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <p style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>{selected.plate_no}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{selected.vehicle_type || "종류 미지정"}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {[
                { label: "기사명",    value: selected.driver_name },
                { label: "연락처",   value: selected.driver_phone },
                { label: "최대적재", value: selected.max_weight ? `${parseFloat(selected.max_weight).toLocaleString("ko-KR")}kg` : null },
                { label: "비고",     value: selected.note },
              ].map(row => row.value ? (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{row.value}</span>
                </div>
              ) : null)}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => openEdit(selected)} style={{ flex: 1, padding: "9px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>수정</button>
              <button onClick={() => handleDelete(selected.id)} style={{ padding: "9px 14px", backgroundColor: "var(--bg-surface-2)", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>삭제</button>
            </div>
          </div>
        )}
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}

      {showModal && (
        <>
          <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 300 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "460px", backgroundColor: "var(--bg-surface)", borderRadius: "18px", boxShadow: "var(--shadow-lg)", zIndex: 301, padding: "28px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>{editId ? "차량 수정" : "차량 등록"}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {[
                { label: "차량번호 *", key: "plate_no",     span: false },
                { label: "차량 종류",  key: "vehicle_type", span: false },
                { label: "기사명",     key: "driver_name",  span: false },
                { label: "기사 연락처", key: "driver_phone", span: false },
                { label: "최대 적재량(kg)", key: "max_weight", span: false, type: "number" },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.span ? "1 / -1" : "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>{f.label}</label>
                  <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                    style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px" }} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>비고</label>
                <textarea value={form.note} onChange={e => setForm((p: any) => ({ ...p, note: e.target.value }))} rows={2}
                  style={{ padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleSave} disabled={saving || !form.plate_no}
                style={{ flex: 1, padding: "11px", backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1.5px solid #C49A30", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 20px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
