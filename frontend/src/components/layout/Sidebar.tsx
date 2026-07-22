"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ScanLine,
  CreditCard,
  Receipt,
  Users,
  BarChart2,
  Bot,
  Settings,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  isNew?: boolean;
};

const menuItems: { group: string; items: MenuItem[] }[] = [
  {
    group: "메인",
    items: [
      { label: "대시보드",    href: "/dashboard",  icon: LayoutDashboard },
      { label: "회계 장부",   href: "/ledger",     icon: BookOpen },
      { label: "영수증 OCR",  href: "/ocr",        icon: ScanLine, badge: 3 },
      { label: "카드 · 은행",  href: "/banking",    icon: CreditCard },
      { label: "경비 정산",   href: "/expense",    icon: Receipt },
    ],
  },
  {
    group: "인사이트",
    items: [
      { label: "거래처 · 사업장", href: "/business",  icon: Users },
      { label: "경영 분석",    href: "/analytics", icon: BarChart2 },
      { label: "AI 회계 비서", href: "/ai-assistant", icon: Bot, isNew: true },
    ],
  },
  {
    group: "설정",
    items: [
      { label: "환경설정", href: "/settings", icon: Settings },
      { label: "도움말",   href: "/help",     icon: HelpCircle },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 bg-slate-800 flex flex-col z-50">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--accent)" }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--accent-text)" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="1.5" width="16" height="17" rx="2.5" strokeWidth="1.7"/>
              <rect x="3.8" y="3.8" width="12.4" height="3.8" rx="1" strokeWidth="1.5"/>
              <rect x="3.8" y="9"    width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
              <rect x="8.2" y="9"    width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
              <rect x="12.6" y="9"   width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
              <rect x="3.8" y="11.9" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
              <rect x="8.2" y="11.9" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
              <rect x="12.6" y="11.9" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
              <rect x="3.8" y="14.8" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
              <rect x="8.2" y="14.8" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
              <rect x="12.6" y="14.8" width="3.6" height="2.2" rx="0.6" fill="var(--accent-text)" stroke="none"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm">SelfERP</p>
            <p className="text-slate-400 text-xs">소상공인 ERP</p>
          </div>
        </div>
      </div>

      {/* 사업장 선택 */}
      <div className="px-4 py-3 border-b border-slate-700">
        <button className="w-full flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2 hover:bg-slate-600 transition">
          <div className="w-7 h-7 bg-yellow-500 rounded-md flex items-center justify-center text-white font-bold text-xs">
            행
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-xs font-medium">행복한 베이커리</p>
            <p className="text-slate-400 text-xs">개인사업자 · 강남</p>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {menuItems.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="text-slate-500 text-xs px-2 mb-1 font-medium">
              {group.group}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition text-sm ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : "text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="bg-blue-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {item.isNew && (
                    <span className="bg-emerald-500 text-white text-xs rounded px-1.5 py-0.5 font-bold leading-none">
                      NEW
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 하단 PRO 배너 */}
      <div className="px-4 py-4 border-t border-slate-700">
        <div className="bg-slate-700 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-1">PRO 플랜</p>
          <p className="text-white text-xs font-medium">부가세 신고도 자동으로!</p>
          <button className="mt-2 text-blue-400 text-xs hover:underline">
            업그레이드 →
          </button>
        </div>
      </div>
    </aside>
  );
}