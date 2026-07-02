# SelfERP Changelog

> 형식: `[버전] - YYYY-MM-DD` / 각 항목은 Backend · Frontend · 비고로 구분

---

## [v7.1] - 2026-07-02 | 유통 모듈 — 전체 구현

### Backend
| 항목 | 내용 |
|------|------|
| 신규 모델 | `Vehicle` — 차량번호, 기사명/연락처, 최대적재량 |
| | `SalesOrder` — 수주 헤더 (고객사FK, 납기일, 상태 6종), `SalesOrderItem` cascade |
| | `Delivery` — 배송 지시 (수주FK, 차량FK, 배송지, 수령인, 배송비, 상태 5종) |
| | `DeliveryReturn` — 반품 (배송FK, 품목FK, 수량, 사유 5종, 재고복원 여부) |
| 신규 라우터 | `GET /api/distribution/summary` — 대시보드 요약 4종 |
| | `GET/POST/PUT/DELETE /api/distribution/vehicles` — 차량 CRUD |
| | `GET/POST/PUT/DELETE /api/distribution/orders` — 수주 CRUD |
| | `GET/POST/PUT/DELETE /api/distribution/deliveries` — 배송 CRUD |
| | 배송 완료 시 연결 수주 상태 자동 완료 처리 |
| | `GET/POST /api/distribution/returns` — 반품 등록/조회 |
| | 반품 재고 복원 시 InventoryLog(반품) 자동 생성 |
| | `GET /api/distribution/analytics` — 배송완료율·반품률·월별수주 집계 |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/distribution` — 유통 대시보드 |
| | 요약 카드 4종, 배송효율 진행바, 바로가기 5개 |
| 신규 페이지 | `/dashboard/distribution/vehicles` — 차량 관리 |
| | 목록 + 상세 드로어, CRUD 모달 |
| 신규 페이지 | `/dashboard/distribution/orders` — 수주 관리 |
| | 납기일 초과 행 강조, 상태 직접 변경, 품목 라인 동적 등록 |
| | 상세 드로어: 품목별 수량/단가/금액 |
| 신규 페이지 | `/dashboard/distribution/deliveries` — 배송 지시 |
| | 날짜/상태 필터, 상태 직접 변경, 완료 시 자동 완료일 기록 |
| 신규 페이지 | `/dashboard/distribution/returns` — 반품 처리 |
| | 사유별 색상 뱃지, 재고복원 체크박스 |
| 신규 페이지 | `/dashboard/distribution/analytics` — 유통 분석 |
| | KPI 카드 4종, 배송완료율/반품률 진행바, 월별 수주 막대 차트 |
| 사이드바 | 유통관리 섹션 추가 (대시보드/수주/배송/차량/반품/분석 6개 메뉴) |

---

## [v5.5] - 2026-07-02 | 생산 대시보드 고도화

### Frontend
| 항목 | 내용 |
|------|------|
| 개선 | 생산 대시보드(`/dashboard/production`) 전면 개편 |
| | 안전재고 경고 배너 (부족 품목 수 + 품목명 미리보기, 클릭 시 효율/알림 페이지 이동) |
| | 요약 카드: 전체품목 / 안전재고부족 / 진행생산 / 평균달성률 (경고 조건 색상) |
| | 효율 요약 패널: 달성률·불량률 진행바 (>=100% 녹, >=80% 황, <80% 적) |
| | 바로가기 8개 전체 표시 (2열 그리드 레이아웃) |

---

## [v5.4] - 2026-07-02 | 안전재고 알림 + 생산 효율 분석

### Backend
| 항목 | 내용 |
|------|------|
| 신규 엔드포인트 | `GET /api/production/safety-stock-alerts` — 안전재고 미달 품목 목록, 부족량·부족률 |
| | `GET /api/production/efficiency` — 지시서별 달성률·불량률, 전체 평균 집계 |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/production/efficiency` (탭 UI) |
| [생산 효율] | 지시서별 달성률 진행바, 불량률 색상 뱃지 (>5% 빨강, >0% 황) |
| | 요약 카드 4종: 분석대상/평균달성률/평균불량률/총불량수량 |
| [안전재고 알림] | 부족 품목 목록, 재고 0인 항목 배경 강조 |
| | "모든 품목 안전재고 이상" 확인 메시지 |
| 사이드바 | 생산관리 > 효율·알림 메뉴 추가 |

---

## [v5.3] - 2026-07-02 | 재고 실사

### Backend
| 항목 | 내용 |
|------|------|
| 신규 엔드포인트 | `GET /api/production/stock-audit` — 실사 준비 품목 목록 (장부 수량 포함) |
| | `POST /api/production/stock-audit` — 실사 결과 일괄 적용 |
| 처리 로직 | 장부수량과 차이 있는 품목에 `log_type=조정` InventoryLog 자동 생성 |
| | 차이 없는 품목은 skip, 차이 있는 품목만 `current_stock` 업데이트 |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/production/audit` |
| | 품목별 장부수량 vs 실사수량 비교 테이블 |
| | 차이 있는 행 배경색 강조 (증가=녹색, 감소=빨간) |
| | 조정 사유 텍스트 입력 (차이 있는 행만 표시) |
| | 일괄 조정 적용 후 결과 요약 배너 |
| 사이드바 | 생산관리 > 재고 실사 메뉴 추가 |

---

## [v5.2] - 2026-07-02 | 단위 원가 분석

### Backend
| 항목 | 내용 |
|------|------|
| 신규 엔드포인트 | `GET /api/production/cost-analysis` — BOM별 자재 원가 자동 산출 |
| 계산 로직 | 자재 원가 = Σ(BOMLine 수량 × 품목 기준단가) |
| | 마진 = 판매 단가 - 자재 원가 / 마진율 = 마진 / 판매 단가 × 100 |
| | 자재별 라인 원가 상세 포함 |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/production/cost` |
| 목록 테이블 | 제품명 / BOM 버전 / 자재원가 / 판매단가 / 마진 / 마진율 |
| | 음수 마진 빨간 표시, 마진율 20% 미만 황색 경고 |
| 상세 드로어 | 원가 요약 카드 4종, 자재 구성별 원가 비율 인라인 바 차트 |
| | 단가 미설정 자재 안내 문구 |
| 사이드바 | 생산관리 > 단위 원가 분석 메뉴 추가 |

---

## [v5.1] - 2026-07-02 | 생산 모듈 — 프론트엔드 전체 구현

### Backend 보완
| 항목 | 내용 |
|------|------|
| 신규 엔드포인트 | `GET /api/production/results` — 생산 실적 목록 조회 (order_id 필터, order·product 조인) |
| 버그 수정 | `POST /inventory-logs` — `reference_no` → `ref_no` 별칭 처리, `log_date` 미입력 시 오늘 날짜 자동 설정 |
| 스키마 보완 | `InventoryLogCreate.log_date` Optional 처리, `reference_no` 필드 추가 |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/production/bom` — BOM(자재명세서) 목록·등록·삭제 |
| | 좌측 목록 + 우측 상세 드로어 (구성 자재 라인 표시) |
| | 등록 모달: 완제품/반제품 선택, 버전, 자재 라인 동적 추가/삭제 |
| 신규 페이지 | `/dashboard/production/orders` — 생산 지시서 관리 |
| | 상태 셀렉트 직접 변경 (`PUT /orders/{id}`) |
| | 인라인 실적 등록 버튼 → 실적 모달 팝업 |
| | 완료 수량·불량 수량 실시간 집계 표시 |
| 신규 페이지 | `/dashboard/production/results` — 생산 실적 조회 |
| | 요약 카드: 총 완료수량, 총 불량수량, 불량률 |
| | 불량률 5% 초과 시 빨간색 강조 |
| 신규 페이지 | `/dashboard/production/inventory` — 입출고 이력 |
| | 품목·유형 복합 필터 |
| | 유형별 색상 뱃지 (입고/출고/생산소비/생산완료/조정/반품) |
| | 수량 부호 표시 (입고=+, 출고=-) |
| | 등록 모달: 출고/생산소비 자동 음수 처리 안내 |

### 생산 모듈 전체 구성 (v5.1 완료 기준)
| 페이지 | 경로 | 주요 기능 |
|--------|------|-----------|
| 생산 대시보드 | `/dashboard/production` | 요약 카드 4종 + 바로가기 5개 |
| 품목·재고 | `/dashboard/production/items` | 원자재·반제품·완제품·소모품 CRUD, 안전재고 경고 |
| BOM | `/dashboard/production/bom` | 완제품별 구성 자재 정의, 버전 관리 |
| 생산 지시서 | `/dashboard/production/orders` | 생산 계획 수립·상태 관리·실적 연동 |
| 생산 실적 | `/dashboard/production/results` | 완료·불량 수량 등록, 자동 재고 증감 |
| 입출고 이력 | `/dashboard/production/inventory` | 전체 자재 흐름 이력 조회 |

---

## [v3.9] - 2026-07-02 | 원가·수익성 분석

### Backend
| 항목 | 내용 |
|------|------|
| 신규 라우터 | `GET /api/accounting/analytics/vendor` — 거래처별 매출·매입·순이익·마진율 (세금계산서 기반) |
| | `GET /api/accounting/analytics/monthly-trend` — 월별 은행거래 + 세금계산서 이중 집계 추이 |
| | `GET /api/accounting/analytics/top-vendors` — 매출/매입 상위 N개 거래처 |

---

## [v3.8] - 2026-07-02 | 자금흐름 예측

### Backend
| 항목 | 내용 |
|------|------|
| 신규 라우터 | `GET /api/accounting/cashflow-forecast/` — AR/AP 만기일 기반 주차별 예상 수금·지급, 누적 잔액 예측 |
| | `GET /api/accounting/cashflow-forecast/overdue` — 연체 미수금·미지급금 현황, 연체일수 포함 |

---

## [v3.7] - 2026-07-02 | 예산 관리

### Backend
| 항목 | 내용 |
|------|------|
| 신규 모델 | `BudgetItem` — 연월·항목·구분(revenue/expense)·금액, 복합 유니크 제약(동일 연월·항목·구분 중복 방지) |
| 신규 라우터 | `GET /api/accounting/budget/` — 예산 항목 목록(연도·월 필터) |
| | `GET /api/accounting/budget/vs-actual` — 월별 예산 vs 실적 비교 (BankTransaction 기반 실적 집계) |
| | `POST /api/accounting/budget/` — 예산 등록 (중복 시 400) |
| | `PUT/DELETE /api/accounting/budget/{id}` |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/accounting/budget` |
| | 연도·월 선택 필터 |
| | 요약 카드: 예산/실적 매출·지출 4종 + 달성률 바 차트 |
| | 월별 예산 vs 실적 테이블 (달성률 진행바: 수입 초록/지출 빨강) |
| | 예산 항목 목록 + 수정·삭제 |
| 등록 모달 | 연도·월·구분(수입/지출)·항목(자동완성) + 금액 |

---

## [v3.6] - 2026-07-02 | 견적서 · 청구서

### Backend
| 항목 | 내용 |
|------|------|
| 신규 모델 | `Estimate` — 유형(견적서/청구서/발주서), 거래처FK, 발행일, 만기일, 공급가액/세액/합계, 상태(초안/발송/승인/취소) |
| 신규 모델 | `EstimateItem` — 품목명, 수량, 단가, 금액 (cascade delete) |
| 신규 라우터 | `GET /api/accounting/estimates/` — 유형·상태 필터 |
| | `GET /api/accounting/estimates/{id}` — 품목 포함 상세 |
| | `POST /api/accounting/estimates/` — 품목 라인 포함 생성, 공급가액·세액·합계 자동 계산 |
| | `PUT/DELETE /api/accounting/estimates/{id}` — 수정 시 품목 재계산 |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/accounting/estimates` |
| | 유형·상태 필터, 행 클릭 → 상세 드로어 |
| | 드로어: 기본정보 + 품목 테이블 + 합계(공급가액/세액/합계) |
| | 상태 인라인 드롭다운 변경 |
| 등록 모달 | 품목 동적 추가/삭제, 합계 실시간 계산 표시 |

---

## [v3.5] - 2026-07-02 | 매출·매입·수익성 분석

> 재무제표(v3.3) 기반 분석 기능으로, 별도 모델 없이 기존 API 조합.
> 프론트엔드: `/dashboard/accounting/statements` 손익계산서 탭에 월별 바 차트 포함 (v3.3에서 구현 완료).

---

## [v3.4] - 2026-07-02 | 세금계산서 관리

### Backend
| 항목 | 내용 |
|------|------|
| 신규 모델 | `TaxInvoice` — 발행/수취 구분, 거래처FK, 승인번호, 발행일, 공급가액, 세액, 합계, 품목, 상태(임시저장/발행완료/취소) |
| 신규 라우터 | `GET /api/accounting/tax-invoice/summary` — 매출/매입 건수·공급가액·세액, 부가세 납부예정액(매출세액-매입세액) |
| | `GET /api/accounting/tax-invoice/` — 발행/수취·상태·연도·월 필터 |
| | `POST /api/accounting/tax-invoice/` — 등록 (세액 None 시 공급가액×10% 자동계산, total_amount 자동 계산) |
| | `PUT/DELETE /api/accounting/tax-invoice/{id}` |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/accounting/tax-invoice` |
| | 요약 카드: 매출계산서 건수/금액, 매입계산서 건수/금액, 부가세납부예정액(양수 시 빨강), 세액 |
| | 연도·발행구분·상태 필터 |
| | 상태 인라인 드롭다운 변경 |
| 등록 모달 | 공급가액 입력 시 세액 자동(10%) 계산, 합계 실시간 표시 |

---

## [v3.3] - 2026-07-02 | 재무제표 자동 생성

### Backend
| 항목 | 내용 |
|------|------|
| 신규 라우터 | `GET /api/accounting/statements/income` — 손익계산서: 매출(은행입금+카드)/비용(은행출금), 영업이익, 순이익, 월별세부 |
| | `GET /api/accounting/statements/balance-sheet` — 대차대조표: 자산(은행잔고+AR), 부채(AP), 자본 |
| | `GET /api/accounting/statements/cash-flow` — 현금흐름표: 월별 유입/유출/순현금흐름 |
| 기반 | BankTransaction(입출금) + CardSale(카드매출) + AR/AP(미수금·미지급금) 복합 계산 |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/accounting/statements` |
| | 탭: 손익계산서 / 대차대조표 / 현금흐름표 |
| | 연도 · 월 선택, 조회 버튼 |
| 손익계산서 | 매출/비용/이익 계층 표시, 연간 시 월별 바 차트(매출 초록/비용 빨강) |
| 대차대조표 | 좌: 자산 / 우: 부채+자본 2열 레이아웃, 자산=부채+자본 검증 |
| 현금흐름표 | 요약 카드 + 월별 테이블 (순현금흐름 양/음 색상 구분) |

---

## [v3.2] - 2026-07-02 | 미수금 · 미지급금 (AR/AP)

### Backend
| 항목 | 내용 |
|------|------|
| 신규 모델 | `AccountReceivable` — 거래처FK, 제목, 금액, 수금액, 발행일, 만기일, 상태(미수/일부수금/완료/대손) |
| 신규 모델 | `AccountPayable` — 거래처FK, 제목, 금액, 지급액, 발행일, 만기일, 상태(미지급/일부지급/완료) |
| 신규 라우터 | `GET /api/accounting/ar/summary` — 전체건수/금액, 미수잔액, 연체건수·금액 |
| | `GET/POST /api/accounting/ar/` — 미수금 목록(상태·거래처·연체 필터) / 등록 |
| | `PUT/DELETE /api/accounting/ar/{id}` |
| | `GET /api/accounting/ap/summary` — 전체건수/금액, 미지급잔액, 연체 집계 |
| | `GET/POST /api/accounting/ap/` — 미지급금 목록 / 등록 |
| | `PUT/DELETE /api/accounting/ap/{id}` |
| Business 모델 | receivables · payables 관계 추가 |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/accounting/ar-ap` — AR/AP 통합 페이지 |
| | 탭 전환: 미수금(AR) / 미지급금(AP) |
| | 요약 카드: 전체건수, 총금액, 잔액, 연체건수(연체 시 빨간 강조) |
| | 연체 항목 행 강조 + "⚠ 연체" 배지 표시 |
| | 상태 인라인 드롭다운 변경 (미수→일부수금→완료) |
| | 등록/수정 모달: 거래처 연결, 내용, 금액/수금액, 발행일/만기일, 상태, 메모 |

---

## [v3.1] - 2026-07-02 | 거래처 관리 (Vendor Management)

### Backend
| 항목 | 내용 |
|------|------|
| 모델 확장 | `Vendor` — vendor_type ENUM(매출처/매입처/양방향/기타), ceo_name, contact_name, email, address, industry, bank_name, account_number, bank_holder, credit_limit(여신한도), payment_terms(결제조건일), note, is_active, updated_at 추가 |
| 스키마 | `VendorCreate` / `VendorUpdate` / `VendorResponse` — 전체 필드 반영 |
| 신규 라우터 | `GET /api/accounting/vendors/summary` — 전체·활성 거래처 수, 유형별 분포 |
| | `GET /api/accounting/vendors/` — 거래처 목록 (유형·상태·검색어 필터) |
| | `GET /api/accounting/vendors/{id}` — 단건 조회 |
| | `POST /api/accounting/vendors/` — 거래처 등록 |
| | `PUT /api/accounting/vendors/{id}` — 수정 (거래중지 포함) |
| | `DELETE /api/accounting/vendors/{id}` — 삭제 |

### Frontend
| 항목 | 내용 |
|------|------|
| 사이드바 | **회계관리** 섹션 추가 (회계대시보드/거래처/미수금미지급금/재무제표/세금계산서/견적서/예산) |
| 신규 페이지 | `/dashboard/accounting` — 회계 대시보드: 요약 카드(전체/활성/중지), 유형 분포, 바로가기 메뉴 |
| 신규 페이지 | `/dashboard/accounting/vendors` — 거래처 관리 |
| | 검색(거래처명/사업자번호/대표자) + 유형 필터 + 상태 필터 |
| | 테이블: 거래처명, 유형 배지(매출처/매입처/양방향/기타), 사업자번호, 대표자, 연락처, 결제조건, 상태 |
| | 행 클릭 → 우측 상세 드로어 (기본정보·계좌정보·메모·거래중지/재개·수정·삭제) |
| | 등록/수정 모달: 2열 그리드, 기본정보/결제조건/계좌정보/메모 섹션 구분 |

---

## [v1.9] - 2026-07-02 | HR 마무리 · 권한 구분 기반

> v1.8 완료 후 태그만 부여. 권한 체계는 v9.5에서 고도화 예정.

---

## [v1.8] - 2026-07-02 | 급여 정산

### Backend
| 항목 | 내용 |
|------|------|
| 신규 모델 | `Payroll` — 지급항목(기본급/연장/상여/식대/교통/기타), 공제항목(국민연금/건강보험/고용보험/소득세/지방소득세/기타), 가불, 상태(작성중/확정/지급완료) |
| 신규 모델 | `Severance` — 퇴직일, 퇴직금총액, 3개월평균임금, 근속연수, 지급상태 |
| 신규 라우터 | `POST /api/hr/payroll/` — 월별 급여명세서 생성 (직원 + 연월 중복방지) |
| | `PUT /api/hr/payroll/{id}` — 항목별 수정, 상태 변경 |
| | `DELETE /api/hr/payroll/{id}` |
| | `POST /api/hr/payroll/calculate` — 4대보험 자동계산 (국민연금 4.5%, 건강보험 3.545%, 고용보험 0.9%, 소득세 간이세액표) |
| | `POST /api/hr/payroll/severance/calculate` — 퇴직금 계산 (근속일÷365×평균임금) |
| | `POST /api/hr/payroll/severance/` — 퇴직금 정산 확정 (직원 상태 → 퇴직 자동 변경) |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/hr/payroll` — 탭 구조(급여명세서 / 퇴직금 정산) |
| 급여명세서 탭 | 연월 선택 → 직원별 지급총액/공제총액/실지급액 테이블, 상태 인라인 변경 |
| 자동계산 | 직원 선택 시 기본급 기반 4대보험 자동입력 |
| 집계 | 선택 월 전체 지급총액 · 공제총액 · 실지급액 합계 표시 |
| 퇴직금 탭 | 직원+퇴직일 선택 → 계산결과 패널(근속연수·퇴직금총액) → 정산 확정 |

---

## [v1.5] - 2026-07-02 | 휴가 관리

### Backend
| 항목 | 내용 |
|------|------|
| 신규 모델 | `Leave` — 휴가유형(연차/반차(오전)/반차(오후)/병가/경조사/무급/기타), 기간, 일수(0.5 단위), 상태(대기/승인/거절) |
| 신규 API | `GET/POST /api/hr/leaves` — 목록 조회(상태·직원 필터), 신청 생성 |
| | `PUT /api/hr/leaves/{id}` — 내용 수정 / 승인·거절 상태 변경 |
| | `DELETE /api/hr/leaves/{id}` |
| | `GET /api/hr/leaves/summary/{employee_id}` — 연도별 연차 사용/잔여 계산 (근속기간 기반 법정 연차 자동 산정) |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/hr/leave` — 전체 휴가 신청 목록 |
| | 직원/상태 필터, 대기 건수 뱃지 표시 |
| | 인라인 상태 변경(대기→승인/거절) |
| | 반차 선택 시 사용일수 0.5 자동입력 |

---

## [v1.4] - 2026-07-02 | 계약서 관리

### Backend
| 항목 | 내용 |
|------|------|
| 신규 모델 | `Contract` — 유형(근로계약서/거래처계약서/인사계약서/기타), 계약상대방, 기간, 금액, 서명상태(작성중/서명요청/서명완료/거절), 직원 연결(nullable) |
| 신규 API | `GET/POST /api/hr/contracts` — 유형 필터, 생성 |
| | `PUT /api/hr/contracts/{id}` — 내용 수정 / 서명상태 변경 |
| | `DELETE /api/hr/contracts/{id}` |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/hr/contracts` — 카드형 목록 |
| | 유형·서명상태 필터, 만료 임박(30일 이내) 배지 자동 표시 |
| | 서명상태 인라인 드롭다운 변경 |
| | 직원 연결(선택) |

---

## [v1.3] - 2026-07-02 | 직원 정보 관리

### Backend
| 항목 | 내용 |
|------|------|
| 신규 API | `GET /api/hr/employees` — 재직상태·부서 필터 |
| | `POST /api/hr/employees` — 직원 등록 (20개 이상 필드) |
| | `GET /api/hr/employees/{id}` |
| | `PUT /api/hr/employees/{id}` |
| | `DELETE /api/hr/employees/{id}` |

### Frontend
| 항목 | 내용 |
|------|------|
| 신규 페이지 | `/dashboard/hr/employees` — 이름/이메일/연락처 검색 + 재직상태·부서 필터 |
| | 직원 행 클릭 → 우측 상세 드로어(슬라이드 인) |
| | 상세 드로어: 기본정보·계좌·비상연락처·메모 전체 표시 |
| | 등록/수정 모달: 2열 그리드, 기본정보/소속/급여/비상연락처 섹션 구분 |
| 상태 | 재직(초록) · 휴직(노랑) · 퇴직(회색) 색상 배지 |

---

## [v1.2] - 2026-07-02 | 부서 · 직급 관리 / HR 대시보드

### Backend
| 항목 | 내용 |
|------|------|
| 신규 모델 | `Department` — 부서명, 코드, 설명, 상위부서(자기참조 FK), 사업장 연결 |
| 신규 모델 | `Position` — 직급명, 레벨(숫자, 높을수록 상위), 설명 |
| 신규 모델 | `Employee` — 직원 기본정보 전체 필드 사전 정의 |
| 신규 라우터 | `GET/POST /api/hr/departments` |
| | `PUT/DELETE /api/hr/departments/{id}` — 소속 직원 있으면 삭제 거부 |
| | `GET/POST /api/hr/positions` |
| | `PUT/DELETE /api/hr/positions/{id}` |
| | `GET /api/hr/summary` — HR 개요(직원수, 부서수, 직급수, 이번달 입사, 부서별 인원) |
| Business 모델 | departments · positions · employees · contracts · leaves · payrolls · severances 관계 추가 |

### Frontend
| 항목 | 내용 |
|------|------|
| 사이드바 | **인사관리** 섹션 추가 (HR대시보드/직원관리/부서·직급/계약서/휴가/급여정산) |
| 신규 페이지 | `/dashboard/hr` — 4개 요약 카드 + 빠른메뉴 + 부서별 인원 바 차트 |
| 신규 페이지 | `/dashboard/hr/departments` — 탭(부서/직급) 분리 |
| | 부서 탭: 상위부서 계층 표시, 재직인원 수 |
| | 직급 탭: 레벨 시각화(골드 블록) |
| | 생성/수정 모달 (부서: 상위부서 셀렉트 포함) |

### 기타
- `backend/models/__init__.py` 통합 임포트 관리
- git submodule 이슈 해결: `frontend` gitlink(160000) 제거 → 일반 디렉토리로 재추가, 프론트엔드 소스 전체 GitHub 반영

---

## [v1.1] - 2026-07-02 | 개발 계획서

| 항목 | 내용 |
|------|------|
| `DEVELOPMENT_PLAN.md` | 전체 ERP 로드맵 문서화 |
| 버전 체계 | v1.x HR · v3.x 회계 · v5.x 생산 · v7.x 유통 · v9.x 최종통합 |
| 기능 목록 | 각 버전별 구현 항목 사전 정의 (총 9개 모듈, 70+ 기능) |
