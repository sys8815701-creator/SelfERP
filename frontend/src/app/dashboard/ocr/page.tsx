"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, FileText, CheckCircle, Clock, AlertCircle, Trash2, ChevronDown, ChevronUp, BookCheck } from "lucide-react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { addNotif } from "@/lib/notif";

interface Receipt {
  id: number;
  file_path: string;
  raw_text: string;
  status: string;
  vendor?: string;
  total_amount?: number;
  created_at?: string;
}

/* OCR 원문을 구조화된 필드 배열로 파싱 */
function parseReceipt(raw: string): { label: string; value: string }[] {
  if (!raw) return [];
  const fields: { label: string; value: string }[] = [];

  const attempt = (label: string, ...patterns: RegExp[]) => {
    for (const p of patterns) {
      const m = raw.match(p);
      if (m?.[1]) { fields.push({ label, value: m[1].trim().replace(/\s{2,}/g, " ") }); return; }
    }
  };

  // 판매점: 사업자번호 줄 직전 첫 의미있는 줄 or 첫 줄
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const storeLine = lines.find(l =>
    l.length >= 2 &&
    !/사업자|대표|전화|판매|부가|합계|영수|영업|팩스|주문|카드|승인|처리|신용|현금|면세|과세|포인트|환불|교환/.test(l) &&
    !/^\*/.test(l) &&
    !/^[\d,\.\-]+$/.test(l)
  );
  if (storeLine) fields.push({ label: "판매점", value: storeLine });

  attempt("사업자번호", /사업자\s*번호\s*[:：]\s*([\d\-]+)/i, /사업자번호\s*([\d\-]+)/i);
  attempt("대표이사",   /대표\s*이사\s*[:：]?\s*(.+?)(?:\n|$)/i, /대표자\s*[:：]?\s*(.+?)(?:\n|$)/i);
  attempt("전화번호",   /(?:전화\s*번호|TEL|tel)\s*[:：]?\s*([\d\-]+)/i, /전화번호\s*[:：]?\s*([\d\-]+)/i);
  attempt("날짜",
    /\[판매\]\s*(20\d{2}[-\/\.]\d{2}[-\/\.]\d{2})/i,
    /(20\d{2}[-\/\.]\d{2}[-\/\.]\d{2})/,
  );
  attempt("합계 금액",
    /(?:합\s*계|저\s*금|TOTAL|결\s*제\s*금\s*액)\s*(?:[:\n]\s*)?([\d,]{3,})/i,
    /부가세\s*면세\s*합계금액[^\n]*\n\s*([\d,]+)/i,
  );
  attempt("부가세",
    /부가세\s*과세?\s*화폐\s*금\s*액[^\n]*\n\s*([\d,]+)/i,
    /VAT\s*[:：]?\s*([\d,]+)/i,
  );

  // 품목: 숫자가 아니고, 한글 포함, 10자 이상인 줄
  const itemLine = lines.find(l =>
    l.length >= 8 &&
    /[가-힣]/.test(l) &&
    !/판매점|사업자|대표|전화|부가|합계|영수증|면세|면제|카드|승인|포인트|환불/.test(l) &&
    !/^\*/.test(l) &&
    !/^[\d,\.\-\s]+$/.test(l) &&
    l !== storeLine
  );
  if (itemLine) fields.push({ label: "품목", value: itemLine });

  return fields;
}

export default function OcrPage() {
  const [sessionReceipts, setSessionReceipts] = useState<Receipt[]>([]);
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerDone, setRegisterDone] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [month, setMonth] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedMonth");
      if (stored) return stored;
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await api.get("/api/ocr/receipts");
      setAllReceipts(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const handler = (e: Event) => setMonth((e as CustomEvent<string>).detail);
    window.addEventListener("month-changed", handler);
    return () => window.removeEventListener("month-changed", handler);
  }, []);

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setRegisterDone(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/api/ocr/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      setSessionReceipts(prev => [res.data, ...prev]);
      setSelected(res.data);
      fetchAll();
      const vendor = res.data?.vendor_name || res.data?.description || "영수증";
      const amt = res.data?.total_amount ? ` ₩${Math.round(res.data.total_amount).toLocaleString("ko-KR")}` : "";
      addNotif(`OCR 처리 완료 — ${vendor}${amt}`, "/dashboard/ocr", "var(--accent)");
    } catch (e: any) {
      setModal({ title: "OCR 오류", message: "OCR 처리 중 오류: " + (e?.response?.data?.detail ?? e.message), variant: "error" });
    } finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const register = async (id: number) => {
    setRegistering(true);
    try {
      await api.post(`/api/ocr/receipts/${id}/approve-journal`);
      setRegisterDone(id);
      fetchAll();
    } catch (e: any) {
      setModal({ title: "장부 등록 실패", message: e?.response?.data?.detail ?? "LLM 서비스를 확인해 주세요", variant: "error" });
    } finally { setRegistering(false); }
  };

  const deleteReceipt = (id: number) => {
    setModal({
      title: "인식 내역 삭제",
      message: "이 영수증 인식 내역을 삭제하시겠습니까?\n삭제하면 복구할 수 없습니다",
      variant: "danger",
      showCancel: true,
      confirmLabel: "삭제",
      onConfirm: async () => {
        try {
          await api.delete(`/api/ocr/receipts/${id}`);
          setAllReceipts(prev => prev.filter(r => r.id !== id));
          setSessionReceipts(prev => prev.filter(r => r.id !== id));
          if (selected?.id === id) setSelected(null);
          if (expandedId === id) setExpandedId(null);
        } catch { /* ignore */ }
      },
    });
  };

  const card: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)" };

  const StatusIcon = ({ s }: { s: string }) => {
    if (s === "done" || s === "approved") return <CheckCircle size={14} color="#22C55E" />;
    if (s === "pending") return <Clock size={14} color="var(--accent)" />;
    return <AlertCircle size={14} color="#EF4444" />;
  };

  const statusLabel = (s: string) => {
    if (s === "done" || s === "approved") return "처리 완료";
    if (s === "pending") return "대기 중";
    return "오류";
  };

  const statusColor = (s: string) => {
    if (s === "done" || s === "approved") return "#22C55E";
    if (s === "pending") return "var(--accent)";
    return "#EF4444";
  };

  const fieldBox: React.CSSProperties = {
    backgroundColor: "var(--accent-light)",
    border: "1.5px solid #C49A30",
    borderRadius: "10px",
    padding: "14px 16px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>영수증 OCR</h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "2px" }}>영수증을 업로드하면 AI가 자동으로 내용을 인식합니다</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* 업로드 영역 */}
        <div style={{ ...card, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>영수증 업로드</p>
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            style={{ border: "2px dashed var(--border)", borderRadius: "12px", padding: "40px 20px", textAlign: "center", cursor: "pointer", transition: "border-color 0.2s, background 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.backgroundColor = "var(--accent-light)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.backgroundColor = "transparent"; }}>
            {uploading ? (
              <div style={{ color: "var(--accent)", fontSize: "14px", fontWeight: 600 }}>OCR 처리 중...</div>
            ) : (
              <>
                <Upload size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>클릭하거나 파일을 여기에 드래그</p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>PNG, JPG, JPEG 지원</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          {preview && (
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>미리보기</p>
              <img src={preview} alt="preview" style={{ width: "100%", borderRadius: "10px", border: "1px solid var(--border)", maxHeight: "200px", objectFit: "contain" }} />
            </div>
          )}

          {/* 이번 세션 업로드 목록 */}
          {sessionReceipts.length > 0 && (
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>이번 세션에서 업로드한 영수증</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {sessionReceipts.map(r => (
                  <div key={r.id}
                    onClick={() => { setSelected(r); setRegisterDone(null); }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "9px", cursor: "pointer", border: `1px solid ${selected?.id === r.id ? "var(--accent)" : "var(--border)"}`, backgroundColor: selected?.id === r.id ? "var(--accent-light)" : "var(--bg-surface-2)" }}>
                    <StatusIcon s={r.status} />
                    <span style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.file_path.split(/[\\/]/).pop()}
                    </span>
                    <span style={{ fontSize: "11px", color: statusColor(r.status), fontWeight: 700 }}>{statusLabel(r.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 인식 결과 */}
        <div style={{ ...card, padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>인식 결과</p>
          {selected ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <StatusIcon s={selected.status} />
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{statusLabel(selected.status)}</span>
              </div>

              {/* 정형화된 필드 표시 */}
              {(() => {
                const fields = parseReceipt(selected.raw_text || "");
                return fields.length > 0 ? (
                  <div style={{ ...fieldBox, display: "flex", flexDirection: "column", gap: "10px" }}>
                    {fields.map(({ label, value }) => (
                      <div key={label} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "8px", alignItems: "baseline" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{label}</span>
                        <span style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ ...fieldBox, textAlign: "center" }}>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>인식된 구조화 정보가 없습니다</p>
                    <p style={{ fontSize: "12px", color: "var(--text-subtle)", marginTop: "4px" }}>원문 텍스트가 불명확하거나 지원하지 않는 형식일 수 있습니다</p>
                  </div>
                );
              })()}

              {/* 장부 등록 버튼 */}
              {registerDone === selected.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "8px", backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid #22C55E" }}>
                  <CheckCircle size={16} color="#22C55E" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#22C55E" }}>장부에 등록되었습니다</span>
                </div>
              ) : (
                <button
                  onClick={() => register(selected.id)}
                  disabled={registering || selected.status === "approved"}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", backgroundColor: selected.status === "approved" ? "var(--bg-surface-3)" : "var(--accent)", color: selected.status === "approved" ? "var(--text-muted)" : "var(--accent-text)", border: "none", borderRadius: "8px", padding: "11px 16px", fontSize: "13px", fontWeight: 700, cursor: selected.status === "approved" ? "default" : "pointer", opacity: registering ? 0.7 : 1 }}>
                  <BookCheck size={15} />
                  {registering ? "처리 중..." : selected.status === "approved" ? "이미 장부에 등록됨" : "장부에 자동 등록"}
                </button>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "220px" }}>
              <div style={{ textAlign: "center" }}>
                <FileText size={40} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>영수증을 업로드하면 내용이 여기에 표시됩니다</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 인식 내역 (전체) */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>인식 내역</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>전체 {allReceipts.filter(r => r.created_at?.startsWith(month)).length}건 · 클릭하여 상세 내용 확인</p>
          </div>
        </div>

        {/* 테이블 헤더 */}
        {allReceipts.filter(r => r.created_at?.startsWith(month)).length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 80px 40px", gap: "0", padding: "10px 20px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)" }}>
            {["파일명", "판매점", "날짜", "상태", ""].map(h => (
              <span key={h} style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.5px" }}>{h}</span>
            ))}
          </div>
        )}

        {allReceipts.filter(r => r.created_at?.startsWith(month)).length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
            <FileText size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: "14px" }}>해당 월에 인식한 영수증이 없습니다</p>
          </div>
        ) : (
          allReceipts.filter(r => r.created_at?.startsWith(month)).map((r, i) => {
            const isExpanded = expandedId === r.id;
            const fields = parseReceipt(r.raw_text || "");
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "-";
            const fileName = r.file_path.split(/[\\/]/).pop() || "-";
            return (
              <div key={r.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
                {/* 행 */}
                <div
                  style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 80px 40px", gap: "0", padding: "12px 20px", cursor: "pointer", alignItems: "center" }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                    {isExpanded ? <ChevronUp size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} /> : <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                    <span style={{ fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.vendor || fields.find(f => f.label === "판매점")?.value || "-"}</span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{dateStr}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <StatusIcon s={r.status} />
                    <span style={{ fontSize: "11px", color: statusColor(r.status), fontWeight: 700 }}>{statusLabel(r.status)}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteReceipt(r.id); }}
                    style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={13} color="#EF4444" />
                  </button>
                </div>

                {/* 확장 상세 */}
                {isExpanded && (
                  <div style={{ padding: "0 20px 16px 20px", borderTop: "1px solid var(--border-subtle)" }}>
                    {fields.length > 0 ? (
                      <div style={{ backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", borderRadius: "10px", padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginTop: "12px" }}>
                        {fields.map(({ label, value }) => (
                          <div key={label} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>{label}</span>
                            <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: "12px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px", marginTop: "12px", textAlign: "center" }}>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>구조화된 정보를 추출할 수 없습니다</p>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button
                        onClick={() => { setSelected(r); setRegisterDone(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        style={{ padding: "7px 14px", borderRadius: "8px", border: "1.5px solid #C49A30", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                        인식 결과 보기
                      </button>
                      {r.status !== "approved" && (
                        <button
                          onClick={() => register(r.id)}
                          disabled={registering}
                          style={{ padding: "7px 14px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                          장부에 자동 등록
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
