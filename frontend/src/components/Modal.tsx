"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export interface ModalConfig {
  title?: string;
  message: string;
  variant?: "info" | "error" | "danger";
  showCancel?: boolean;
  confirmLabel?: string;
  onConfirm?: () => void;
}

interface Props extends ModalConfig {
  onClose: () => void;
}

export default function Modal({
  title, message, variant = "info",
  showCancel = false, confirmLabel,
  onConfirm, onClose,
}: Props) {
  const isDanger = variant === "danger";
  const isError  = variant === "error";
  const Icon        = isDanger ? AlertTriangle : isError ? AlertCircle : Info;
  const defaultTitle   = isDanger ? "주의" : isError ? "오류" : "안내";
  const defaultConfirm = isDanger ? "삭제" : "확인";

  const handleConfirm = () => { onClose(); onConfirm?.(); };

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "24px" }}
      onClick={e => { if (e.target === e.currentTarget && !showCancel) handleConfirm(); }}>
      <div style={{ backgroundColor: "var(--bg-surface)", borderRadius: "18px", border: "1.5px solid #FFBE50", padding: "28px 28px 24px", width: "100%", maxWidth: "380px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>

        {/* 아이콘 + 텍스트 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: "rgba(255,190,80,0.12)", border: "2px solid #FFBE50", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
            <Icon size={24} color="#FFBE50" />
          </div>
          <p style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", textAlign: "center" }}>
            {title ?? defaultTitle}
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px", textAlign: "center", lineHeight: 1.65, whiteSpace: "pre-line" }}>
            {message}
          </p>
        </div>

        {/* 버튼 */}
        {showCancel ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button onClick={onClose}
              style={{ padding: "11px", borderRadius: "9px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              취소
            </button>
            <button onClick={handleConfirm}
              style={{ padding: "11px", borderRadius: "9px", border: "none", backgroundColor: "#FFBE50", color: "#1a1000", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
              {confirmLabel ?? defaultConfirm}
            </button>
          </div>
        ) : (
          <button onClick={handleConfirm}
            style={{ width: "100%", padding: "11px", borderRadius: "9px", border: "none", backgroundColor: "#FFBE50", color: "#1a1000", fontSize: "13px", fontWeight: 800, cursor: "pointer" }}>
            확인
          </button>
        )}
      </div>
    </div>
  );
}
