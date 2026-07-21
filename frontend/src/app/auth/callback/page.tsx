"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SocialCallbackPage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState("로그인 처리 중...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        // 토큰으로 사용자 정보 조회
        const meRes = await axios.get(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = meRes.data;

        // 이전 세션 데이터 초기화
        ["bk-profile-photo", "business", "activeBizId", "bk-vat-checklist", "selectedMonth"]
          .forEach((k) => localStorage.removeItem(k));

        localStorage.setItem("access_token", token);
        localStorage.setItem("user", JSON.stringify(user));

        setStatusText("사업장 정보 확인 중...");

        // 사업장 유무에 따라 분기 (토큰을 헤더에 직접 전달)
        try {
          const bizRes = await axios.get(`${API_BASE}/api/business/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (bizRes.data.length === 0) {
            router.replace("/dashboard/business");
          } else {
            const biz = bizRes.data[0];
            localStorage.setItem("business", JSON.stringify(biz));
            localStorage.setItem("activeBizId", String(biz.id));
            router.replace("/dashboard");
          }
        } catch {
          router.replace("/dashboard");
        }
      } catch {
        router.replace("/login?social_error=auth_failed");
      }
    })();
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      backgroundColor: "var(--bg)", gap: "20px",
    }}>
      <div style={{
        width: "48px", height: "48px", borderRadius: "50%",
        border: "4px solid var(--accent-light)",
        borderTopColor: "var(--accent)",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>{statusText}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
