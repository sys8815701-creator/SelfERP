"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare, Square, Plus, Pencil, Trash2, Check, X,
  AlertTriangle, CalendarClock, Lock,
} from "lucide-react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { addNotif } from "@/lib/notif";

interface VatStatus {
  period: string; deadline: string; days_remaining: number;
  progress_pct: number; checklist: Array<{ item: string; done: boolean }>;
  vat_payable: number; estimated_refund: number;
}
interface Summary { revenue: number; expense: number; vat_estimate: number; }
interface VatCheckItem { id: number; text: string; done: boolean; }

const DEFAULT_CHECKLIST: VatCheckItem[] = [
  { id: 1, text: "매출세금계산서 합계 확인", done: false },
  { id: 2, text: "매입세금계산서 합계 확인", done: false },
  { id: 3, text: "신용카드 매출 집계", done: false },
  { id: 4, text: "홈택스 신고서 작성", done: false },
];

function loadChecklist(): VatCheckItem[] {
  if (typeof window === "undefined") return DEFAULT_CHECKLIST;
  const stored = localStorage.getItem("bk-vat-checklist");
  if (stored) { try { return JSON.parse(stored); } catch { /* fall through */ } }
  localStorage.setItem("bk-vat-checklist", JSON.stringify(DEFAULT_CHECKLIST));
  return DEFAULT_CHECKLIST;
}

export default function VatPage() {
  const router = useRouter();

  const getProKey = () => { try { const id = JSON.parse(localStorage.getItem("user") || "{}").id; return id ? `pro_plan_${id}` : "pro_plan"; } catch { return "pro_plan"; } };
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(getProKey()) === "true";
    return false;
  });
  const [vat, setVat] = useState<VatStatus | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<VatCheckItem[]>(loadChecklist);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [modal, setModal] = useState<ModalConfig | null>(null);

  useEffect(() => {
    const handler = () => setIsPro(localStorage.getItem(getProKey()) === "true");
    window.addEventListener("pro-plan-updated", handler);
    return () => window.removeEventListener("pro-plan-updated", handler);
  }, []);

  useEffect(() => {
    if (!isPro) return;
    setLoading(true);
    (async () => {
      try {
        const [vRes, sRes] = await Promise.all([
          api.get("/api/dashboard/vat-status"),
          api.get("/api/dashboard/summary"),
        ]);
        setVat(vRes.data);
        setSummary(sRes.data);
        const v = vRes.data;
        const userId = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").id || "guest"; } catch { return "guest"; } })();
        if (v.days_remaining <= 7) {
          const key = `bk-vat-warn7-${userId}`;
          if (localStorage.getItem(key) !== v.period) {
            addNotif(`⚠️ 부가세 신고 마감 ${v.days_remaining}일 전입니다 (${v.deadline})`, "/dashboard/vat", "#EF4444");
            localStorage.setItem(key, v.period);
          }
        } else if (v.days_remaining <= 30) {
          const key = `bk-vat-warn30-${userId}`;
          if (localStorage.getItem(key) !== v.period) {
            addNotif(`부가세 신고 마감 ${v.days_remaining}일 전입니다 (${v.deadline})`, "/dashboard/vat", "#f97316");
            localStorage.setItem(key, v.period);
          }
        }
      } finally { setLoading(false); }
    })();
  }, [isPro]);

  const saveChecklist = (items: VatCheckItem[]) => {
    setChecklist(items);
    localStorage.setItem("bk-vat-checklist", JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("vat-checklist-updated"));
  };

  const toggleItem  = (id: number) => saveChecklist(checklist.map(c => c.id === id ? { ...c, done: !c.done } : c));
  const addItem     = () => { const t = newItemText.trim(); if (!t) return; saveChecklist([...checklist, { id: Date.now(), text: t, done: false }]); setNewItemText(""); setAddingItem(false); };
  const saveEdit    = (id: number) => { const t = editText.trim(); if (!t) return; saveChecklist(checklist.map(c => c.id === id ? { ...c, text: t } : c)); setEditingId(null); };
  const deleteItem  = (id: number) => saveChecklist(checklist.filter(c => c.id !== id));

  const card: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)" };
  const deadlineColor = !vat ? "var(--accent)" : vat.days_remaining <= 7 ? "#EF4444" : vat.days_remaining <= 14 ? "#f97316" : "#22C55E";
  const doneCnt = checklist.filter(c => c.done).length;
  const progressPct = checklist.length > 0 ? Math.round(doneCnt / checklist.length * 100) : 0;

  /* ── PRO 잠금 화면 ── */
  if (!isPro) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>부가세 신고</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>PRO 플랜 전용 기능입니다</p>
        </div>
        <div style={{ ...card, padding: "64px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "rgba(255,190,80,0.1)", border: "2px solid #FFBE50", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={28} color="#FFBE50" />
          </div>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>PRO 플랜에서 이용 가능합니다</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.7 }}>
              부가세 신고 준비 현황, 맞춤형 체크리스트,<br />
              D-day 알림까지 — PRO 플랜으로 업그레이드하세요.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/pro")}
            style={{ backgroundColor: "#FFBE50", color: "#1a1000", border: "none", borderRadius: "10px", padding: "12px 28px", fontSize: "14px", fontWeight: 800, cursor: "pointer", marginTop: "4px" }}>
            PRO 플랜 가입하기 →
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>불러오는 중...</div>;
  if (!vat) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>부가세 신고</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>신고 준비 현황을 확인하고 기한을 놓치지 마세요</p>
      </div>

      {/* D-day 배너 */}
      <div style={{ ...card, padding: "24px", background: `linear-gradient(135deg, ${deadlineColor}22, ${deadlineColor}11)`, borderColor: `${deadlineColor}44` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <CalendarClock size={40} color={deadlineColor} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>{vat.period} 부가세 신고</p>
            <h2 style={{ fontSize: "28px", fontWeight: 900, color: deadlineColor }}>
              {vat.days_remaining > 0 ? `D-${vat.days_remaining}` : "D-Day"}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>신고 마감일: {vat.deadline}</p>
          </div>
          {vat.days_remaining <= 7 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444", padding: "8px 14px", borderRadius: "10px" }}>
              <AlertTriangle size={16} />
              <span style={{ fontSize: "13px", fontWeight: 700 }}>기한 임박!</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>신고 준비 현황</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: deadlineColor }}>{progressPct}%</span>
          </div>
          <div style={{ height: "10px", backgroundColor: "var(--bg-surface-3)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, backgroundColor: deadlineColor, borderRadius: "99px", transition: "width 0.5s" }} />
          </div>
        </div>
      </div>

      {/* 세금 계산 요약 */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "과세 매출액",      value: summary.revenue,                              desc: "부가세 과세 대상 매출" },
            { label: "매입 세액 공제",   value: summary.expense * 0.1,                        desc: "매입세액 (지출 × 10%)" },
            { label: "예상 납부세액",    value: vat.vat_payable ?? summary.vat_estimate,     desc: "매출세액 − 매입세액" },
          ].map(({ label, value, desc }) => (
            <div key={label} style={{ ...card, padding: "16px" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{desc}</p>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>{label}</p>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent)" }}>{Math.round(value).toLocaleString("ko-KR")}원</p>
            </div>
          ))}
        </div>
      )}

      {/* 체크리스트 + 신고 안내 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* 신고 준비 체크리스트 — 편집 가능 */}
        <div style={{ ...card, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>신고 준비 체크리스트</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{doneCnt}/{checklist.length} 완료</p>
            </div>
            <button onClick={() => setAddingItem(v => !v)}
              style={{ width: "26px", height: "26px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: addingItem ? "var(--accent)" : "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={13} color={addingItem ? "var(--accent-text)" : "var(--text-muted)"} />
            </button>
          </div>

          {addingItem && (
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
              <input autoFocus value={newItemText} onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addItem(); if (e.key === "Escape") { setAddingItem(false); setNewItemText(""); } }}
                placeholder="항목 입력 후 Enter"
                style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", color: "var(--text-primary)", backgroundColor: "var(--bg-surface-2)", outline: "none" }} />
              <button onClick={addItem}
                style={{ padding: "6px 10px", borderRadius: "8px", border: "none", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>추가</button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {checklist.map(item => (
              <div key={item.id}
                style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "5px 0", borderRadius: "6px" }}
                onMouseEnter={e => { const a = e.currentTarget.querySelector(".vat-acts") as HTMLElement | null; if (a) a.style.opacity = "1"; }}
                onMouseLeave={e => { const a = e.currentTarget.querySelector(".vat-acts") as HTMLElement | null; if (a) a.style.opacity = "0"; }}>

                <button onClick={() => toggleItem(item.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginTop: "2px" }}>
                  {item.done ? <CheckSquare size={16} color="var(--accent)" /> : <Square size={16} color="var(--text-subtle)" />}
                </button>

                {editingId === item.id ? (
                  <div style={{ display: "flex", flex: 1, gap: "4px" }}>
                    <input autoFocus value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(item.id); if (e.key === "Escape") setEditingId(null); }}
                      style={{ flex: 1, border: "1px solid var(--accent)", borderRadius: "6px", padding: "3px 8px", fontSize: "12px", color: "var(--text-primary)", backgroundColor: "var(--bg-surface-2)", outline: "none" }} />
                    <button onClick={() => saveEdit(item.id)}
                      style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={13} color="var(--accent-text)" />
                    </button>
                    <button onClick={() => setEditingId(null)}
                      style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <X size={13} color="var(--text-muted)" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: "13px", color: item.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.55 }}>
                      {item.text}
                    </span>
                    <div className="vat-acts" style={{ display: "flex", gap: "3px", opacity: 0, transition: "opacity 0.15s", flexShrink: 0 }}>
                      <button onClick={() => { setEditingId(item.id); setEditText(item.text); }}
                        style={{ width: 22, height: 22, borderRadius: 5, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Pencil size={11} color="var(--text-muted)" />
                      </button>
                      <button onClick={() => deleteItem(item.id)}
                        style={{ width: 22, height: 22, borderRadius: 5, border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={11} color="#EF4444" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {checklist.length === 0 && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
                + 버튼으로 항목을 추가해보세요
              </p>
            )}
          </div>
        </div>

        {/* 신고 일정 안내 */}
        <div style={{ ...card, padding: "20px" }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "16px" }}>부가세 신고 안내</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { step: "1", title: "매출세금계산서 합계 확인", desc: "홈택스에서 전자세금계산서 합계 조회" },
              { step: "2", title: "매입세금계산서 합계 확인", desc: "공제 가능한 매입세액 정리" },
              { step: "3", title: "신용카드 매출 합산",       desc: "카드 단말기 매출 집계" },
              { step: "4", title: "홈택스 부가세 신고",       desc: "국세청 홈택스에서 전자 신고" },
              { step: "5", title: "세금 납부",                desc: "마감일 전 은행 납부" },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: "flex", gap: "12px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#ffffff", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--accent)" }}>{step}</span>
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{title}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 홈택스 바로 가기 */}
      <div style={{ ...card, padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>지금 바로 홈택스에서 신고하기</p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>전자신고 시 세액공제 10,000원 혜택</p>
        </div>
        <a href="https://www.hometax.go.kr" target="_blank" rel="noopener noreferrer"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)", textDecoration: "none", borderRadius: "10px", padding: "10px 20px", fontSize: "13px", fontWeight: 800 }}>
          홈택스 바로 가기 →
        </a>
      </div>

      {/* PRO 플랜 해지 */}
      <div style={{ textAlign: "center", paddingBottom: "8px" }}>
        <button
          onClick={() => setModal({
            title: "PRO 플랜 해지",
            message: "PRO 플랜을 해지하면 부가세 신고 도우미 및\n모든 PRO 기능을 더 이상 이용할 수 없습니다.\n정말 해지하시겠습니까?",
            variant: "danger",
            showCancel: true,
            confirmLabel: "해지하기",
            onConfirm: () => {
              localStorage.removeItem(getProKey());
              window.dispatchEvent(new CustomEvent("pro-plan-updated"));
              router.push("/dashboard");
            },
          })}
          style={{ fontSize: "12px", color: "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: "4px 8px" }}>
          PRO 플랜 해지
        </button>
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
