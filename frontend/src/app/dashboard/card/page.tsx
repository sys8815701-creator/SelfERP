"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2, Check, X } from "lucide-react";
import api from "@/lib/api";
import Modal, { ModalConfig } from "@/components/Modal";
import { addNotif } from "@/lib/notif";

interface Transaction {
  id: number; date: string; description: string;
  deposit: number; withdrawal: number; category: string | null; is_income: boolean;
}
interface BankInfo { bank_name: string; account_number: string; bank_holder: string; }

const CATEGORIES = ["상품매출", "서비스매출", "기타수입", "식재료비", "인건비", "임차료", "통신비", "광고비", "기타비용"];

const emptyBankForm: BankInfo = { bank_name: "", account_number: "", bank_holder: "" };

export default function CardPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "income" | "expense">("all");
  const [month, setMonth] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedMonth");
      if (stored) return stored;
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // 은행 정보
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [editingBank, setEditingBank] = useState(false);
  const [isNewBank, setIsNewBank] = useState(false);
  const [bankForm, setBankForm] = useState<BankInfo>(emptyBankForm);
  const [bankSaving, setBankSaving] = useState(false);

  // 거래 수정
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editTxForm, setEditTxForm] = useState({ description: "", amount: "", tx_type: "income" as "income" | "expense", date: "", category: "" });
  const [editTxSaving, setEditTxSaving] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  // 은행 정보 API 로드
  const fetchBankInfo = useCallback(async () => {
    const bizId = localStorage.getItem("activeBizId");
    if (!bizId) return;
    try {
      const res = await api.get(`/api/business/${bizId}/bank`);
      setBankInfo(res.data ?? null);
    } catch { /* 없으면 null 유지 */ }
  }, []);

  useEffect(() => { fetchBankInfo(); }, [fetchBankInfo]);

  // 전역 월 동기화
  useEffect(() => {
    const handler = (e: Event) => setMonth((e as CustomEvent<string>).detail);
    window.addEventListener("month-changed", handler);
    return () => window.removeEventListener("month-changed", handler);
  }, []);

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/dashboard/recent-transactions?limit=500");
      setTxs(res.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const filtered = txs.filter(t => {
    const mMatch = t.date.startsWith(month);
    const typeMatch = tab === "all" || (tab === "income" ? t.is_income : !t.is_income);
    return mMatch && typeMatch;
  });

  const totalIn  = filtered.filter(t => t.is_income).reduce((s, t) => s + t.deposit, 0);
  const totalOut = filtered.filter(t => !t.is_income).reduce((s, t) => s + t.withdrawal, 0);

  // 은행 저장 (확인 모달)
  const handleBankSave = () => {
    setModal({
      title: isNewBank ? "주 거래 은행 등록" : "주 거래 은행 수정",
      message: isNewBank ? "주 거래 은행 정보를 등록하시겠습니까?" : "주 거래 은행 정보를 수정하시겠습니까?",
      variant: "info",
      showCancel: true,
      confirmLabel: "저장",
      onConfirm: async () => {
        const bizId = localStorage.getItem("activeBizId");
        if (!bizId) return;
        setBankSaving(true);
        try {
          const res = await api.put(`/api/business/${bizId}/bank`, bankForm);
          setBankInfo(res.data);
          addNotif(
            isNewBank ? `주 거래 은행 등록 완료 — ${bankForm.bank_name}` : `주 거래 은행 정보가 수정되었습니다 — ${bankForm.bank_name}`,
            "/dashboard/card", "var(--accent)"
          );
          setEditingBank(false);
          setIsNewBank(false);
        } catch (e: any) {
          setModal({ message: e?.response?.data?.detail ?? "저장 실패", variant: "error" });
        } finally { setBankSaving(false); }
      },
    });
  };

  // 거래 수정 시작
  const startEditTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditTxForm({
      description: tx.description,
      amount: String(tx.is_income ? tx.deposit : tx.withdrawal),
      tx_type: tx.is_income ? "income" : "expense",
      date: tx.date,
      category: tx.category ?? "",
    });
  };

  // 거래 수정 저장
  const saveEditTx = async (txId: number) => {
    if (!editTxForm.description.trim() || !editTxForm.amount) return;
    setEditTxSaving(true);
    try {
      const res = await api.patch(`/api/dashboard/transactions/${txId}`, {
        description: editTxForm.description.trim(),
        transaction_date: editTxForm.date,
        amount: parseFloat(editTxForm.amount),
        tx_type: editTxForm.tx_type,
        category: editTxForm.category || null,
      });
      setTxs(prev => prev.map(t => t.id === txId ? { ...t, ...res.data } : t));
      setEditingTxId(null);
    } catch (e: any) { setModal({ message: e?.response?.data?.detail ?? "수정 실패", variant: "error" }); }
    finally { setEditTxSaving(false); }
  };

  // 거래 삭제
  const deleteTx = (txId: number) => {
    setModal({
      title: "거래 내역 삭제",
      message: "이 거래 내역을 삭제하시겠습니까?",
      variant: "danger",
      showCancel: true,
      confirmLabel: "삭제",
      onConfirm: async () => {
        try {
          await api.delete(`/api/dashboard/transactions/${txId}`);
          setTxs(prev => prev.filter(t => t.id !== txId));
        } catch (err: any) { setModal({ message: err?.response?.data?.detail ?? "삭제 실패", variant: "error" }); }
      },
    });
  };

  const card: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)" };
  const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "5px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, backgroundColor: a ? "var(--accent)" : "var(--bg-surface-2)", color: a ? "var(--accent-text)" : "var(--text-muted)" });
  const inputStyle: React.CSSProperties = { padding: "5px 8px", border: "1px solid var(--border)", borderRadius: "6px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "12px", outline: "none", width: "100%", boxSizing: "border-box" };
  const iconBtn: React.CSSProperties = { width: "26px", height: "26px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexShrink: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>카드 · 은행</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>월별 입출금 내역을 확인하세요</p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "총 입금", value: totalIn, color: "var(--accent)", Icon: ArrowDownCircle },
          { label: "총 출금", value: totalOut, color: "#EF4444", Icon: ArrowUpCircle },
          { label: "순 잔액", value: totalIn - totalOut, color: totalIn >= totalOut ? "#22C55E" : "#EF4444", Icon: CreditCard },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} style={{ ...card, padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Icon size={18} color={color} />
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{label}</span>
            </div>
            <p style={{ fontSize: "24px", fontWeight: 800, color }}>{Math.abs(Math.round(value)).toLocaleString("ko-KR")}원</p>
          </div>
        ))}
      </div>

      {/* 주 거래 은행 카드 */}
      {editingBank ? (
        <div style={{ ...card, padding: "20px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>
            {isNewBank ? "주 거래 은행 등록" : "주 거래 은행 수정"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
            {([
              { label: "은행명", key: "bank_name", placeholder: "예: 국민은행" },
              { label: "계좌번호", key: "account_number", placeholder: "예: 123-456-789012" },
              { label: "예금주 / 사업장명", key: "bank_holder", placeholder: "예: 행복한 베이커리" },
            ] as { label: string; key: keyof BankInfo; placeholder: string }[]).map(f => (
              <div key={f.key}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "5px" }}>{f.label}</p>
                <input placeholder={f.placeholder} value={bankForm[f.key]}
                  onChange={e => setBankForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: "7px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleBankSave} disabled={bankSaving}
              style={{ flex: 1, backgroundColor: "#FFBE50", color: "#1a1000", border: "none", borderRadius: "8px", padding: "9px", fontSize: "13px", fontWeight: 700, cursor: "pointer", opacity: bankSaving ? 0.7 : 1 }}>
              {bankSaving ? "저장 중..." : "저장"}
            </button>
            <button onClick={() => { setEditingBank(false); setIsNewBank(false); setBankForm(bankInfo ?? emptyBankForm); }}
              style={{ backgroundColor: "var(--bg-surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "8px", padding: "9px 18px", fontSize: "13px", cursor: "pointer" }}>
              취소
            </button>
          </div>
        </div>
      ) : bankInfo ? (
        <div style={{ ...card, padding: "20px", background: "#FFBE50", color: "#1a1000", position: "relative" }}>
          <button
            onClick={() => { setBankForm(bankInfo); setIsNewBank(false); setEditingBank(true); }}
            style={{ position: "absolute", top: "16px", right: "16px", width: "30px", height: "30px", borderRadius: "7px", border: "1px solid rgba(26,16,0,0.25)", backgroundColor: "rgba(26,16,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1000" }}
            title="은행 정보 수정">
            <Pencil size={14} />
          </button>
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, opacity: 0.7 }}>주 거래 은행</p>
            <p style={{ fontSize: "18px", fontWeight: 800 }}>{bankInfo.bank_holder}</p>
          </div>
          <p style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "2px", marginBottom: "4px" }}>{bankInfo.account_number}</p>
          <p style={{ fontSize: "12px", opacity: 0.7 }}>{bankInfo.bank_name} 사업자 통장</p>
        </div>
      ) : (
        <div style={{ ...card, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>주 거래 은행</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>등록된 은행 정보가 없습니다.</p>
          </div>
          <button
            onClick={() => { setBankForm(emptyBankForm); setIsNewBank(true); setEditingBank(true); }}
            style={{ padding: "8px 16px", backgroundColor: "#FFBE50", color: "#1a1000", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            주 거래 은행 등록
          </button>
        </div>
      )}

      {/* 거래 목록 */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{month.replace("-", "년 ")}월 거래 내역</span>
          <div style={{ display: "flex", gap: "4px" }}>
            {(["all", "income", "expense"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>
                {t === "all" ? "전체" : t === "income" ? "입금" : "출금"}
              </button>
            ))}
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)" }}>
              {["날짜", "내용", "구분", "금액", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 16px", textAlign: h === "금액" ? "right" : "left", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", width: h === "" ? "80px" : undefined }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>불러오는 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>{month} 거래 내역이 없습니다.</td></tr>
            ) : filtered.map((tx, i) => {
              const isEditing = editingTxId === tx.id;
              const d = new Date(tx.date + "T00:00:00");

              if (isEditing) {
                return (
                  <tr key={tx.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface-2)" }}>
                    <td style={{ padding: "10px 16px" }}>
                      <input type="date" value={editTxForm.date} onChange={e => setEditTxForm(p => ({ ...p, date: e.target.value }))} style={{ ...inputStyle, width: "120px" }} />
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <input value={editTxForm.description} onChange={e => setEditTxForm(p => ({ ...p, description: e.target.value }))} placeholder="내용" style={inputStyle} />
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <select value={editTxForm.tx_type} onChange={e => setEditTxForm(p => ({ ...p, tx_type: e.target.value as "income" | "expense" }))} style={{ ...inputStyle, width: "70px" }}>
                        <option value="income">입금</option>
                        <option value="expense">출금</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input type="number" value={editTxForm.amount} onChange={e => setEditTxForm(p => ({ ...p, amount: e.target.value }))} placeholder="금액" style={{ ...inputStyle, width: "110px", textAlign: "right" }} />
                        <select value={editTxForm.category} onChange={e => setEditTxForm(p => ({ ...p, category: e.target.value }))} style={{ ...inputStyle, width: "100px" }}>
                          <option value="">카테고리</option>
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button onClick={() => saveEditTx(tx.id)} disabled={editTxSaving}
                          style={{ ...iconBtn, backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "1px solid #C49A30" }}>
                          <Check size={12} />
                        </button>
                        <button onClick={() => setEditingTxId(null)} style={iconBtn}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                          <X size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={tx.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-muted)" }}>
                    {d.getMonth() + 1}.{String(d.getDate()).padStart(2, "0")}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{tx.description}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", backgroundColor: tx.is_income ? "var(--accent-light)" : "rgba(239,68,68,0.08)", color: tx.is_income ? "var(--accent)" : "#EF4444", fontWeight: 600, border: tx.is_income ? "1.5px solid #C49A30" : "1.5px solid #C41E1E" }}>
                      {tx.is_income ? "입금" : "출금"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px", fontWeight: 800, color: tx.is_income ? "var(--accent)" : "#EF4444" }}>
                    {tx.is_income ? "+" : "-"}{(tx.is_income ? tx.deposit : tx.withdrawal).toLocaleString("ko-KR")}원
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button onClick={() => startEditTx(tx)} style={iconBtn} title="수정"
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface-2)"; e.currentTarget.style.color = "var(--accent)"; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => deleteTx(tx.id)} style={iconBtn} title="삭제"
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <Modal {...modal} onClose={() => setModal(null)} />}
    </div>
  );
}
