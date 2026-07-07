"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, BookOpen, Zap, MessageCircle, Keyboard } from "lucide-react";

const FAQS: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "시작하기",
    items: [
      { q: "처음 로그인 후 무엇을 해야 하나요?", a: "사이드바 하단 '거래처 · 사업장' 메뉴에서 사업장 정보를 등록하세요. 이후 '카드 · 은행' 메뉴에서 거래 내역을 확인하거나, '영수증 OCR'로 영수증을 업로드하면 자동으로 회계 처리됩니다" },
      { q: "사업자등록번호를 변경할 수 있나요?", a: "환경설정 → 사업장 정보 섹션에서 수정 후 저장할 수 있습니다" },
      { q: "다크 모드와 라이트 모드를 어떻게 전환하나요?", a: "화면 오른쪽 상단 헤더의 태양(☀) 아이콘을 클릭하면 다크 · 라이트 모드가 즉시 전환됩니다" },
      { q: "여러 사업장을 동시에 관리할 수 있나요?", a: "사이드바 상단의 사업장 선택 버튼을 클릭하면 등록된 사업장 목록이 표시됩니다. 원하는 사업장을 선택하면 해당 사업장의 데이터로 전환됩니다. '거래처 · 사업장' 메뉴에서 새 사업장을 추가할 수 있습니다" },
      { q: "비밀번호를 변경하려면 어떻게 하나요?", a: "환경설정 → 내 계정 정보 → 비밀번호 변경 섹션에서 현재 비밀번호 확인 후 새 비밀번호로 변경할 수 있습니다" },
      { q: "이름(대표자명)을 수정하려면?", a: "환경설정 → 내 계정 정보 → 이름 항목에서 직접 수정 후 '변경 저장' 버튼을 클릭하세요. 변경된 이름은 대시보드 인사 배너 등 모든 페이지에 즉시 반영됩니다" },
    ],
  },
  {
    category: "영수증 OCR",
    items: [
      { q: "영수증을 업로드하면 어떻게 처리되나요?", a: "이미지를 OCR로 인식해 텍스트를 추출한 후, AI가 자동으로 계정과목을 분류하고 분개를 제안합니다. '승인' 버튼을 누르면 회계 장부에 자동으로 반영됩니다" },
      { q: "어떤 이미지 형식을 지원하나요?", a: "JPG, PNG, PDF 형식을 지원합니다. 파일 크기는 10MB 이하를 권장합니다" },
      { q: "사이드바의 숫자 뱃지는 무엇인가요?", a: "'영수증 OCR' 메뉴의 숫자는 미처리(pending) 영수증의 개수입니다. 실시간으로 업데이트되며, 모두 처리하면 뱃지가 사라집니다" },
      { q: "영수증 인식이 잘못된 경우 어떻게 하나요?", a: "OCR 결과 화면에서 금액 · 날짜 · 가맹점명을 직접 수정한 후 승인할 수 있습니다. 이미지가 흐리거나 빛 반사가 심한 경우 인식률이 낮아질 수 있으니, 선명한 사진을 사용해 주세요" },
      { q: "한 번에 여러 장을 업로드할 수 있나요?", a: "현재 버전에서는 한 번에 1장씩 업로드를 지원합니다. 다중 업로드 기능은 추후 업데이트에서 추가될 예정입니다" },
    ],
  },
  {
    category: "회계 장부",
    items: [
      { q: "거래를 직접 등록하려면 어떻게 하나요?", a: "대시보드의 '빠른 거래 등록' 기능을 이용하거나, 회계 장부 페이지에서 '빠른 분개' 버튼을 클릭해 직접 입력할 수 있습니다" },
      { q: "카테고리(계정과목)를 수동으로 변경할 수 있나요?", a: "현재 버전에서는 AI 자동 분류를 기반으로 합니다. 추후 업데이트에서 수동 수정 기능이 추가될 예정입니다" },
      { q: "거래 내역을 엑셀로 내보낼 수 있나요?", a: "환경설정 → 데이터 관리 → 'CSV 내보내기' 버튼을 클릭하면 전체 거래 내역을 CSV 파일로 다운로드할 수 있습니다" },
      { q: "수기로 등록한 거래를 수정하거나 삭제할 수 있나요?", a: "'카드 · 은행' 페이지의 거래 내역에서 각 행 오른쪽의 ✏️(수정) 또는 🗑️(삭제) 아이콘을 클릭하면 직접 수정 · 삭제가 가능합니다. 카드/은행 자동 연동 거래도 동일하게 수정 가능합니다" },
      { q: "월별 데이터를 선택해서 볼 수 있나요?", a: "헤더 우측 상단의 날짜 선택 버튼을 클릭하면 월을 선택할 수 있으며, 선택한 월의 데이터가 대시보드 및 각 페이지에 반영됩니다" },
    ],
  },
  {
    category: "부가세 신고",
    items: [
      { q: "부가세 신고 기간은 언제인가요?", a: "1기(1~6월 매출): 7월 25일, 2기(7~12월 매출): 다음 해 1월 25일이 신고 · 납부 마감일입니다. '부가세 신고 도우미' 메뉴에서 D-day를 실시간으로 확인할 수 있습니다" },
      { q: "예상 납부세액은 어떻게 계산되나요?", a: "매출세액(매출 × 10%)에서 매입세액(비용 × 10%)을 차감한 값입니다. 실제 신고 금액과 다를 수 있으므로, 반드시 홈택스에서 최종 확인 후 신고하세요" },
      { q: "간이과세자도 사용할 수 있나요?", a: "네, 간이과세자도 사용 가능합니다. 다만, 부가세 계산 로직은 일반과세자 기준으로 제공됩니다. 간이과세 전용 신고서 기능은 향후 업데이트에서 지원할 예정입니다" },
      { q: "부가세 신고 체크리스트는 어디서 확인하나요?", a: "'부가세 신고 도우미' 페이지에서 매출 자료, 매입 자료, 공제 항목, 신고서 작성 등 4단계 체크리스트를 확인하고 진행 상황을 추적할 수 있습니다" },
    ],
  },
  {
    category: "AI 회계 비서",
    items: [
      { q: "AI 비서는 어떤 질문을 처리할 수 있나요?", a: "이번 달 매출 · 비용 현황, 전월 대비 변화율, 부가세 신고 일정, 미수금 현황, 비용 절감 조언 등 실제 데이터를 기반으로 한 회계 관련 질문에 답변합니다" },
      { q: "AI 비서의 답변이 정확하지 않을 수 있나요?", a: "AI 회계 비서는 등록된 거래 데이터를 바탕으로 분석하므로, 데이터가 적을수록 정확도가 낮아질 수 있습니다. 세무 신고 등 중요한 결정은 반드시 세무사와 상담하세요" },
      { q: "AI 비서와의 대화 기록이 저장되나요?", a: "현재 버전에서는 페이지를 새로 고침하면 대화 기록이 초기화됩니다. 대화 기록 저장 및 히스토리 조회 기능은 추후 업데이트에서 제공될 예정입니다" },
      { q: "어떤 언어로 질문할 수 있나요?", a: "현재 한국어 질문만 지원합니다. 향후 영어 등 다국어 지원을 확대할 예정입니다" },
    ],
  },
];

const GUIDE_MODULES = [
  {
    id: "integrated",
    label: "통합관리",
    color: { bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.40)", text: "#db2777" },
    steps: [
      { step: "1", title: "대시보드 확인", desc: "전체 사업장 매출·비용 현황을 한눈에 파악합니다", link: "/dashboard/integrated" },
      { step: "2", title: "알림 센터", desc: "미처리 알림과 직원 가입 승인 요청을 확인합니다", link: "/dashboard/integrated/alerts" },
      { step: "3", title: "권한 관리", desc: "직원별 메뉴 접근 권한과 역할을 설정합니다", link: "/dashboard/integrated/access" },
    ],
  },
  {
    id: "accounting",
    label: "회계",
    color: { bg: "rgba(196,154,48,0.12)", border: "rgba(196,154,48,0.40)", text: "#a37c14" },
    steps: [
      { step: "1", title: "사업장 등록", desc: "거래처·사업장 메뉴에서 사업장 기본 정보를 등록합니다", link: "/dashboard/business" },
      { step: "2", title: "영수증 업로드", desc: "영수증 OCR로 영수증을 업로드해 자동 처리를 시작합니다", link: "/dashboard/ocr" },
      { step: "3", title: "거래 장부 확인", desc: "회계 장부에서 자동 분류된 수입·지출 내역을 확인합니다", link: "/dashboard/ledger" },
      { step: "4", title: "부가세 준비", desc: "부가세 신고 도우미로 신고 준비 현황을 체크합니다", link: "/dashboard/vat" },
    ],
  },
  {
    id: "hr",
    label: "인사",
    color: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.40)", text: "#2563eb" },
    steps: [
      { step: "1", title: "직원 관리", desc: "직원 관리 메뉴에서 직원 기본 정보를 등록합니다", link: "/dashboard/hr/employees" },
      { step: "2", title: "근태 관리", desc: "휴가 신청·승인과 출결 현황을 관리합니다", link: "/dashboard/hr/leave" },
      { step: "3", title: "급여 처리", desc: "월별 급여를 계산하고 지급 내역을 관리합니다", link: "/dashboard/hr/payroll" },
    ],
  },
  {
    id: "production",
    label: "생산",
    color: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.40)", text: "#16a34a" },
    steps: [
      { step: "1", title: "품목 등록", desc: "생산할 제품과 원자재 품목 정보를 등록합니다", link: "/dashboard/production/items" },
      { step: "2", title: "BOM 설정", desc: "제품 구성에 필요한 자재 목록(BOM)을 설정합니다", link: "/dashboard/production/bom" },
      { step: "3", title: "생산 지시", desc: "생산 계획을 등록하고 작업 지시를 내립니다", link: "/dashboard/production/orders" },
    ],
  },
  {
    id: "distribution",
    label: "유통",
    color: { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.40)", text: "#7c3aed" },
    steps: [
      { step: "1", title: "거래처 등록", desc: "공급업체와 고객사 거래처 정보를 등록합니다", link: "/dashboard/accounting/vendors" },
      { step: "2", title: "주문 처리", desc: "발주서·수주서를 생성하고 주문 현황을 관리합니다", link: "/dashboard/distribution/orders" },
      { step: "3", title: "배송 현황", desc: "배송 진행 상태와 운송 현황을 실시간으로 확인합니다", link: "/dashboard/distribution/deliveries" },
    ],
  },
];

const SHORTCUTS = [
  { key: "Enter", desc: "검색 / 전송" },
  { key: "Esc",   desc: "팝업 닫기" },
  { key: "/",     desc: "검색창 포커스 (헤더)" },
];

const ITEMS_PER_PAGE = 3;

const accentBox: React.CSSProperties = {
  backgroundColor: "var(--accent-light)",
  border: "1.5px solid #C49A30",
  borderRadius: "10px",
  padding: "14px 16px",
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: "12px" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>{q}</span>
        <span style={{ flexShrink: 0, color: "var(--text-muted)" }}>
          {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </span>
      </button>
      {open && (
        <div style={{ ...accentBox, marginBottom: "14px" }}>
          <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.75 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [pages, setPages] = useState<number[]>(FAQS.map(() => 0));
  const [activeGuideTab, setActiveGuideTab] = useState("integrated");

  const card: React.CSSProperties = {
    backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
    borderRadius: "14px", boxShadow: "var(--shadow)", padding: "24px",
  };

  const isSearching = search.trim().length > 0;
  const searchFiltered = FAQS.map(cat => ({
    ...cat,
    items: cat.items.filter(i => i.q.includes(search) || i.a.includes(search)),
  })).filter(cat => cat.items.length > 0);

  const currentCat = FAQS[activeTab];
  const currentPage = pages[activeTab];
  const totalPages = Math.ceil(currentCat.items.length / ITEMS_PER_PAGE);
  const pagedItems = currentCat.items.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const setPage = (catIdx: number, page: number) => {
    setPages(prev => prev.map((p, i) => i === catIdx ? page : p));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 헤더 */}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>도움말</h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "2px" }}>자주 묻는 질문과 사용 가이드를 확인하세요</p>
      </div>

      {/* 검색 */}
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="질문 검색..."
          style={{ width: "100%", padding: "12px 14px 12px 40px", border: "1px solid var(--border)", borderRadius: "10px", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* 빠른 시작 */}
      {!isSearching && (() => {
        const guide = GUIDE_MODULES.find(m => m.id === activeGuideTab) ?? GUIDE_MODULES[0];
        return (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "9px", backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={17} color="var(--accent)" />
              </div>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>빠른 시작 가이드</span>
            </div>
            {/* 모듈 탭 */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {GUIDE_MODULES.map(mod => {
                const isActive = activeGuideTab === mod.id;
                return (
                  <button key={mod.id}
                    onClick={() => setActiveGuideTab(mod.id)}
                    style={{
                      padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                      backgroundColor: isActive ? mod.color.bg : "var(--bg-surface-2)",
                      color: isActive ? mod.color.text : "var(--text-muted)",
                      border: isActive ? `1.5px solid ${mod.color.border}` : "1px solid var(--border)",
                    }}>
                    {mod.label}
                  </button>
                );
              })}
            </div>
            {/* 단계 카드 */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${guide.steps.length}, 1fr)`, gap: "12px" }}>
              {guide.steps.map(({ step, title, desc, link }) => (
                <a key={step} href={link} style={{ display: "block", textDecoration: "none" }}>
                  <div
                    style={{ ...accentBox, cursor: "pointer", height: "100%", transition: "filter 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.filter = "brightness(0.96)"; }}
                    onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "#ffffff", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--accent)" }}>{step}</span>
                    </div>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>{title}</p>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.55 }}>{desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {/* FAQ */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
          <div style={{ width: 34, height: 34, borderRadius: "9px", backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={17} color="var(--accent)" />
          </div>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
            자주 묻는 질문{isSearching ? ` — "${search}" 검색 결과 ${searchFiltered.reduce((s, c) => s + c.items.length, 0)}건` : ""}
          </span>
        </div>

        {isSearching ? (
          /* 검색 결과 — 기존 vertical 방식 */
          searchFiltered.length === 0 ? (
            <p style={{ textAlign: "center", padding: "32px 0", fontSize: "14px", color: "var(--text-muted)" }}>검색 결과가 없습니다</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              {searchFiltered.map(cat => (
                <div key={cat.category}>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--accent)", backgroundColor: "var(--accent-light)", padding: "3px 9px", borderRadius: "5px", border: "1.5px solid #C49A30", display: "inline-block", marginBottom: "4px" }}>
                    {cat.category}
                  </span>
                  {cat.items.map(item => <FaqItem key={item.q} {...item} />)}
                </div>
              ))}
            </div>
          )
        ) : (
          /* 탭 + 페이지네이션 */
          <>
            {/* 카테고리 탭 */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
              {FAQS.map((cat, idx) => {
                const isActive = activeTab === idx;
                return (
                  <button key={cat.category}
                    onClick={() => setActiveTab(idx)}
                    style={{
                      padding: "7px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                      backgroundColor: isActive ? "var(--accent)" : "var(--bg-surface-2)",
                      color: isActive ? "var(--accent-text)" : "var(--text-muted)",
                      border: isActive ? "1.5px solid #C49A30" : "1px solid var(--border)",
                    }}>
                    {cat.category}
                  </button>
                );
              })}
            </div>

            {/* 현재 탭 아이템 */}
            <div>
              {pagedItems.map(item => <FaqItem key={item.q} {...item} />)}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "18px" }}>
                <button
                  onClick={() => setPage(activeTab, currentPage - 1)}
                  disabled={currentPage === 0}
                  style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", cursor: currentPage === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", opacity: currentPage === 0 ? 0.4 : 1 }}>
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i}
                    onClick={() => setPage(activeTab, i)}
                    style={{ width: "32px", height: "32px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", border: i === currentPage ? "1.5px solid #C49A30" : "1px solid var(--border)", backgroundColor: i === currentPage ? "var(--accent)" : "var(--bg-surface-2)", color: i === currentPage ? "var(--accent-text)" : "var(--text-muted)" }}>
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage(activeTab, currentPage + 1)}
                  disabled={currentPage === totalPages - 1}
                  style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-surface-2)", cursor: currentPage === totalPages - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", opacity: currentPage === totalPages - 1 ? 0.4 : 1 }}>
                  <ChevronRight size={15} />
                </button>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "4px" }}>
                  {currentPage + 1} / {totalPages}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 하단 2열 */}
      {!isSearching && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* 키보드 단축키 */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "9px", backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Keyboard size={17} color="var(--accent)" />
              </div>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>단축키</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", backgroundColor: "var(--bg-surface-2)", borderRadius: "8px" }}>
                  <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{desc}</span>
                  <kbd style={{ fontSize: "12px", fontWeight: 700, backgroundColor: "var(--bg-surface-3)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "5px", padding: "2px 9px", fontFamily: "monospace" }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* 고객 지원 */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "9px", backgroundColor: "var(--accent-light)", border: "1.5px solid #C49A30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageCircle size={17} color="var(--accent)" />
              </div>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>고객 지원</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "이메일 문의",  value: "sys8815701@gmail.com", sub: "영업일 기준 24시간 내 회신" },
                { label: "카카오 채널",  value: "@SelfERP",             sub: "평일 09:00 – 18:00" },
                { label: "서비스 상태",  value: "status.selferp.kr",   sub: "실시간 서비스 가용성 확인" },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ padding: "11px 14px", backgroundColor: "var(--bg-surface-2)", borderRadius: "9px" }}>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "2px" }}>{label}</p>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{value}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "1px" }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 버전 정보 */}
      {!isSearching && (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <p style={{ fontSize: "13px", color: "var(--text-subtle)" }}>SelfERP v1.0.0 · 소상공인 전용 AI 회계 ERP</p>
        </div>
      )}
    </div>
  );
}
