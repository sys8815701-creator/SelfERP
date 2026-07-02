"use client";

import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ size = 36 }: { size?: number }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "10px",
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-surface-2)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "background-color 0.15s",
      }}
    >
      {isDark
        ? <Sun size={16} color="var(--accent)" />
        : <Moon size={16} color="var(--text-muted)" />
      }
    </button>
  );
}
