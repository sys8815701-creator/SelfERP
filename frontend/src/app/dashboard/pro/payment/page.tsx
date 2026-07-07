"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Lock, CheckCircle } from "lucide-react";
import Modal from "@/components/Modal";

function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

export default function PaymentPage() {
  const router = useRouter();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]         = useState("");
  const [cvc, setCvc]               = useState("");
  const [holder, setHolder]         = useState("");
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [status, setStatus]         = useState<"idle" | "processing" | "done">("idle");
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (cardNumber.replace(/\s/g, "").length < 16) e.cardNumber = "카드 번호 16자리를 입력해 주세요";
    if (expiry.length < 5) e.expiry = "유효기간을 MM/YY 형식으로 입력해 주세요";
    if (cvc.length < 3) e.cvc = "CVC 3자리를 입력해 주세요";
    if (!holder.trim()) e.holder = "카드 소유자 이름을 입력해 주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const processPayment = () => {
    setShowConfirm(false);
    setStatus("processing");
    setTimeout(() => {
      const proKey = (() => { try { const id = JSON.parse(localStorage.getItem("user") || "{}").id; return id ? `pro_plan_${id}` : "pro_plan"; } catch { return "pro_plan"; } })();
      localStorage.setItem(proKey, "true");
      window.dispatchEvent(new CustomEvent("pro-plan-updated"));
      setStatus("done");
      setTimeout(() => router.push("/dashboard/vat"), 1600);
    }, 1800);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setShowConfirm(true);
  };

  const card: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "14px", boxShadow: "var(--shadow)",
  };

  const field: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: "6px",
  };

  const input = (hasErr: boolean): React.CSSProperties => ({
    padding: "11px 14px", fontSize: "14px",
    backgroundColor: "var(--bg-input)", color: "var(--text-primary)",
    border: `1.5px solid ${hasErr ? "#EF4444" : "var(--border)"}`,
    borderRadius: "10px", outline: "none", width: "100%", boxSizing: "border-box",
  });

  if (status === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "rgba(34,197,94,0.12)", border: "2px solid #22C55E", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle size={36} color="#22C55E" />
        </div>
        <p style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>PRO 플랜이 시작되었습니다!</p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>부가세 신고 페이지로 이동 중...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* 헤더 */}
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>결제 정보 입력</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>PRO 플랜 월 29,900원 · 매월 자동 청구</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>

        {/* 카드 정보 폼 */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ ...card, padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <CreditCard size={18} color="var(--accent)" />
              <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>카드 정보</p>
            </div>

            {/* 카드 번호 */}
            <div style={field}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>카드 번호</label>
              <input
                style={input(!!errors.cardNumber)}
                value={cardNumber}
                onChange={e => { setCardNumber(formatCardNumber(e.target.value)); setErrors(p => ({ ...p, cardNumber: "" })); }}
                placeholder="0000 0000 0000 0000"
                inputMode="numeric"
                disabled={status === "processing"}
              />
              {errors.cardNumber && <span style={{ fontSize: "11px", color: "#EF4444" }}>{errors.cardNumber}</span>}
            </div>

            {/* 유효기간 + CVC */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={field}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>유효기간</label>
                <input
                  style={input(!!errors.expiry)}
                  value={expiry}
                  onChange={e => { setExpiry(formatExpiry(e.target.value)); setErrors(p => ({ ...p, expiry: "" })); }}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  disabled={status === "processing"}
                />
                {errors.expiry && <span style={{ fontSize: "11px", color: "#EF4444" }}>{errors.expiry}</span>}
              </div>
              <div style={field}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>CVC</label>
                <input
                  style={input(!!errors.cvc)}
                  value={cvc}
                  onChange={e => { setCvc(e.target.value.replace(/\D/g, "").slice(0, 3)); setErrors(p => ({ ...p, cvc: "" })); }}
                  placeholder="000"
                  inputMode="numeric"
                  disabled={status === "processing"}
                />
                {errors.cvc && <span style={{ fontSize: "11px", color: "#EF4444" }}>{errors.cvc}</span>}
              </div>
            </div>

            {/* 카드 소유자 */}
            <div style={field}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>카드 소유자 이름</label>
              <input
                style={input(!!errors.holder)}
                value={holder}
                onChange={e => { setHolder(e.target.value); setErrors(p => ({ ...p, holder: "" })); }}
                placeholder="홍길동"
                disabled={status === "processing"}
              />
              {errors.holder && <span style={{ fontSize: "11px", color: "#EF4444" }}>{errors.holder}</span>}
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "processing"}
            style={{
              width: "100%", padding: "15px",
              backgroundColor: "#FFBE50", color: "#1a1000",
              border: "none", borderRadius: "12px",
              fontSize: "15px", fontWeight: 800,
              cursor: status === "processing" ? "default" : "pointer",
              opacity: status === "processing" ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}>
            {status === "processing" ? "결제 처리 중..." : "결제하고 PRO 시작하기"}
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <Lock size={12} color="var(--text-muted)" />
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>결제 정보는 안전하게 암호화됩니다</span>
          </div>
        </form>

        {/* 주문 요약 */}
        <div style={{ ...card, padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>주문 요약</p>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", backgroundColor: "rgba(255,190,80,0.08)", borderRadius: "10px", border: "1px solid rgba(255,190,80,0.25)" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 900, color: "#1a1000" }}>P</span>
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>PRO 플랜</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>월 구독 · 매월 자동 청구</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>PRO 플랜 (월)</span>
              <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>27,182원</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>VAT (10%)</span>
              <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>2,718원</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>합계</span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--accent)" }}>29,900원</span>
            </div>
          </div>

          <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.7, backgroundColor: "var(--bg-surface-2)", borderRadius: "8px", padding: "12px" }}>
            · 언제든지 해지 가능<br />
            · 30일 환불 보장<br />
            · 결제 즉시 PRO 기능 활성화<br />
            · 다음 결제일: 가입일로부터 30일 후
          </div>
        </div>
      </div>

      {showConfirm && (
        <Modal
          title="PRO 플랜 가입 확인"
          message={`월 29,900원이 결제됩니다.\nPRO 플랜에 가입하시겠습니까?`}
          variant="info"
          showCancel
          confirmLabel="가입하기"
          onConfirm={processPayment}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
