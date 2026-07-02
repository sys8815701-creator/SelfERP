"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User } from "lucide-react";
import api from "@/lib/api";

interface Message { role: "user" | "assistant"; content: string; }

const QUICK_QUESTIONS = [
  "이번 달 매출이 지난달보다 얼마나 늘었나요?",
  "현재 비용 중 가장 많은 비중을 차지하는 항목은?",
  "부가세 신고 마감일이 언제인가요?",
  "순이익률을 개선하려면 어떻게 해야 할까요?",
  "올해 예상 세금은 얼마인가요?",
  "장기 미수금이 있나요?",
];

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "안녕하세요! AI 회계 비서입니다.\n재무 현황, 세금 신고, 경비 분석 등 무엇이든 물어보세요. 실시간 데이터를 바탕으로 정확한 답변을 드립니다." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await api.post("/api/ai/chat", { message: msg });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "죄송합니다. 잠시 후 다시 시도해 주세요." }]);
    } finally { setLoading(false); }
  };

  const card: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 130px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #C49A30" }}>
          <Sparkles size={18} color="var(--accent-text)" />
        </div>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>AI 회계 비서</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>재무 데이터를 분석하고 전문적인 조언을 제공합니다</p>
        </div>
      </div>

      {/* 빠른 질문 */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {QUICK_QUESTIONS.map(q => (
          <button key={q} onClick={() => send(q)} style={{ fontSize: "12px", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 12px", backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--accent-light)"; e.currentTarget.style.border = "1.5px solid #C49A30"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "var(--bg-surface)"; e.currentTarget.style.border = "1px solid var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            {q}
          </button>
        ))}
      </div>

      {/* 채팅창 */}
      <div style={{ ...card, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px", border: "1.5px solid #C49A30" }}>
                  <Sparkles size={14} color="var(--accent-text)" />
                </div>
              )}
              <div style={{ maxWidth: "70%", backgroundColor: m.role === "user" ? "var(--accent-light)" : "var(--bg-surface-2)", border: m.role === "user" ? "1.5px solid #C49A30" : "none", color: "var(--text-primary)", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "12px 16px", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap", transition: "all 0.15s" }}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--bg-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                  <User size={14} color="var(--text-muted)" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1.5px solid #C49A30" }}>
                <Sparkles size={14} color="var(--accent-text)" />
              </div>
              <div style={{ backgroundColor: "var(--bg-surface-2)", borderRadius: "14px 14px 14px 4px", padding: "12px 16px", display: "flex", gap: "4px", alignItems: "center" }}>
                {[0, 1, 2].map(n => (
                  <div key={n} style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--text-muted)", animation: `pulse 1.4s infinite ${n * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="질문을 입력하세요... (Shift+Enter로 줄바꿈)"
            rows={1}
            style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 14px", backgroundColor: "var(--bg-surface-2)", color: "var(--text-primary)", fontSize: "14px", outline: "none", resize: "none", fontFamily: "inherit", maxHeight: "100px", overflowY: "auto" }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: input.trim() && !loading ? "var(--accent)" : "var(--bg-surface-3)", color: input.trim() && !loading ? "var(--accent-text)" : "var(--text-muted)", border: "none", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
            <Send size={16} />
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}
