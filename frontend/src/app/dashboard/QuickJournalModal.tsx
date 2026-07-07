"use client";

import { useState } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import api from "@/lib/api";
import { addNotif } from "@/lib/notif";

const INCOME_CATS = ["상품매출", "용역수익", "이자수익", "기타수익"];
const EXPENSE_CATS = ["상품매입", "임차료", "급여", "복리후생비", "광고선전비", "사무용품비", "공과금", "기타비용"];

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickJournalModal({ onClose, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txDate, setTxDate] = useState(today);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cats = txType === "income" ? INCOME_CATS : EXPENSE_CATS;

  const handleSubmit = async () => {
    if (!description.trim()) { setError("거래처/내용을 입력해 주세요"); return; }
    const amt = parseFloat(amount.replace(/,/g, ""));
    if (!amt || amt <= 0) { setError("금액을 올바르게 입력해 주세요"); return; }
    if (!txDate) { setError("날짜를 선택해 주세요"); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/api/dashboard/quick-transaction", {
        date: txDate,
        description: description.trim(),
        amount: amt,
        tx_type: txType,
        category: category || undefined,
      });
      const fmtAmt = Math.round(amt).toLocaleString("ko-KR");
      addNotif(
        `${description.trim()} — ${txType === "income" ? "수입" : "지출"} ₩${fmtAmt} 거래가 추가되었습니다`,
        "/dashboard/ledger",
        txType === "income" ? "var(--accent)" : "#EF4444",
      );
      onSaved();
      onClose();
    } catch {
      setError("등록 중 오류가 발생했습니다. 다시 시도해 주세요");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid var(--border)", borderRadius: "10px",
    padding: "10px 14px", fontSize: "14px", outline: "none",
    color: "var(--text-primary)", backgroundColor: "var(--bg-surface-2)",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)",
    display: "block", marginBottom: "6px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "20px", border: "1px solid var(--border)", width: "440px", maxWidth: "calc(100vw - 32px)", boxShadow: "var(--shadow-lg)" }}>

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-primary)" }}>빠른 거래 등록</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>거래 내역을 빠르게 입력하세요</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* 폼 */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* 구분 토글 */}
          <div>
            <label style={labelStyle}>거래 구분</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {(["income", "expense"] as const).map(t => (
                <button key={t} onClick={() => { setTxType(t); setCategory(""); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", borderRadius: "10px", border: `1.5px solid ${txType === t ? "var(--accent)" : "var(--border)"}`, backgroundColor: txType === t ? "var(--accent-light)" : "var(--bg-surface-2)", cursor: "pointer", fontWeight: 700, fontSize: "14px", color: txType === t ? "var(--accent)" : "var(--text-muted)" }}>
                  {t === "income" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  {t === "income" ? "수입" : "지출"}
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 */}
          <div>
            <label style={labelStyle}>날짜</label>
            <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} style={inputStyle} />
          </div>

          {/* 거래처/내용 */}
          <div>
            <label style={labelStyle}>거래처 / 내용</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder={txType === "income" ? "예: 네이버페이 정산, (주)미라클디자인" : "예: 스타벅스, 이마트 트레이더스"}
              style={inputStyle} />
          </div>

          {/* 금액 */}
          <div>
            <label style={labelStyle}>금액 (원)</label>
            <input type="text" value={amount}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, "");
                setAmount(v ? Number(v).toLocaleString() : "");
              }}
              placeholder="0"
              style={{ ...inputStyle, textAlign: "right", fontSize: "16px", fontWeight: 700 }} />
          </div>

          {/* 카테고리 */}
          <div>
            <label style={labelStyle}>카테고리 <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(선택)</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">자동 분류</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error && <p style={{ fontSize: "13px", color: "#EF4444" }}>{error}</p>}

          {/* 버튼 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px", marginTop: "4px" }}>
            <button onClick={onClose} style={{ padding: "12px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
              취소
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: "12px", borderRadius: "10px", border: "none", backgroundColor: "var(--accent)", color: "var(--accent-text)", fontWeight: 800, fontSize: "14px", cursor: "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 2px 8px rgba(255,190,80,0.3)" }}>
              {loading ? "등록 중..." : "거래 등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
