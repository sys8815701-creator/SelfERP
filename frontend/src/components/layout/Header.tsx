"use client";

import { Bell, Plus, Search, ChevronDown } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-52 right-0 h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 z-40">
      {/* 검색 */}
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
          <Search size={15} className="text-slate-400" />
          <input
            type="text"
            placeholder="거래처, 금액, 영수증, 계정과목으로 검색..."
            className="bg-transparent text-sm text-slate-600 outline-none w-full placeholder:text-slate-400"
          />
          <span className="text-slate-400 text-xs border border-slate-300 rounded px-1">
            ⌘K
          </span>
        </div>
      </div>

      {/* 날짜 선택 */}
      <button className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">
        <span>📅</span>
        <span>2026.06 · 6월</span>
        <ChevronDown size={14} />
      </button>

      {/* 거래 추가 버튼 */}
      <button className="flex items-center gap-2 bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-700 transition">
        <Plus size={15} />
        거래 추가
      </button>

      {/* 알림 */}
      <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition">
        <Bell size={18} className="text-slate-600" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* 유저 */}
      <button className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1.5 transition">
        <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
          김
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-slate-700">김사장</p>
          <p className="text-xs text-slate-400">행복한 베이커리</p>
        </div>
        <ChevronDown size={14} className="text-slate-400" />
      </button>
    </header>
  );
}