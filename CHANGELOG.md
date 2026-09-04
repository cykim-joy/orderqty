# 백오더 수량 대시보드 - 개발 작업 내역

> 프로젝트: `Backorder_Qty_Dashboard`  
> 담당: 영업지원팀  
> 최종 업데이트: 2026-09-02 (SKU 단가 USD 통화 변경)

---

## 📁 프로젝트 구조

```
src/
├── components/
│   ├── SKUTab.jsx          # SKU 관리 탭
│   ├── SquadTab.jsx        # 스쿼드별 취합 탭
│   ├── FeedbackTab.jsx     # 월별 FEEDBACK 탭
│   └── SettingsTab.jsx     # 드롭다운 설정 탭
├── utils/
│   └── storage.js          # localStorage 저장/불러오기 유틸
└── App.jsx                 # 루트 컴포넌트
```

---

## ✅ 주요 구현 내용

### 1. 티어(Tier) 표시 통일
- 판매처에 티어 정보 추가 (`{code, tier}` 객체 구조)
- 티어 배지 색상: Tier 1 → 황색, Tier 2 → 하늘색, Tier 3 → 회색, Tier 4 → 장미색
- 티어 번호 기반 자동 색상 매핑 (`getTierColor`)
- 설정 탭 티어 입력 placeholder → `"티어 (예: Tier 1)"`

### 2. 드롭다운 설정 탭 (`SettingsTab.jsx`) — 체크박스 다중 선택 삭제
- 스쿼드 / 판매처 / 발주현황 목록에 체크박스 추가
- **전체 선택 / 전체 해제** 토글
- **선택 삭제 (N)** 버튼으로 일괄 삭제
- `SelectAllBar` 공통 서브컴포넌트로 추출

### 3. 스쿼드별 취합 탭 (`SquadTab.jsx`) — CSV/엑셀 기능

#### 엑셀 양식 다운로드
- `ExcelJS` 라이브러리를 **CDN(jsdelivr)에서 동적 로드** (npm install 없음)
- 다운로드 파일명: `스쿼드별취합_양식.xlsx`
- 기본 열 너비: 15 (EAN코드 열 18)
- 글자 크기: 10.5pt 고정
- A열(PO Date): 날짜 서식 `yyyy-mm-dd`
- C열(EAN코드): 숫자 서식 `0`
- 헤더 행: 연회색 배경, Bold, 하단 테두리

#### CSV 업로드
- 파일 선택 → 자동 파싱 → 기존 데이터에 병합(append)
- **quoted 필드 파싱** 지원: `"15,000"` 처럼 쉼표 포함 숫자 정상 처리
- 업로드 결과 상태 표시 (성공 N건 / 실패 N건)

#### 컬럼 변경
- `월` → `PO Date` (테이블 헤더 및 CSV 양식)
- PO Date: **일자까지 저장** (`YYYY-MM-DD`)
- 월별 필터: `YYYY-MM` 앞 7자리 비교로 월 단위 필터링
- `확보여부` 열: CSV 양식에서 제거 (앱 내부에서는 유지)

### 4. 스쿼드별 취합 탭 — 품목(SKU) 필터 추가
- 등록된 SKU 중 실제 데이터가 있는 항목만 필터 옵션으로 표시
- 필터 순서: **월 → 스쿼드 → 티어 → 품목**

### 6. SKU 관리 탭 (`SKUTab.jsx`) — 단가 통화 변경
- 단가 표시 및 입력 필드 기호 `₩` → `$` (USD 기준으로 통일)
- 기회비용 산정 시 USD 단일 통화 사용 방침 반영

### 5. 월별 FEEDBACK 탭 (`FeedbackTab.jsx`) — 데이터 연동 수정
- **버그 수정**: `e.month === selectedMonth` 완전 일치 비교로 인해 데이터 미반영
- **원인**: 저장된 `e.month`는 `YYYY-MM-DD`, 필터는 `YYYY-MM` 형식 불일치
- **수정**: `.slice(0, 7)` 비교로 통일 → 스쿼드 데이터가 FEEDBACK에 정상 반영

---

## 🔧 기술 메모

| 항목 | 내용 |
|------|------|
| 프레임워크 | React + Vite + Tailwind CSS |
| 상태 저장 | `localStorage` (load/save 유틸) |
| UUID | `uuid` 패키지 (`uuidv4`) |
| 엑셀 생성 | `ExcelJS 4.4.0` CDN 동적 로드 |
| 아이콘 | `lucide-react` |
| 날짜 필터 | `(e.month \|\| '').slice(0, 7)` 로 YYYY-MM 비교 |
| CSV 파싱 | quoted field 처리 커스텀 파서 (`parseCSVLine`) |

---

## 📌 데이터 구조

### Entry (스쿼드별 취합 항목)
```js
{
  id: string,          // UUID
  skuId: string,       // SKU 참조 ID
  squad: string,       // 스쿼드명
  manager: string,     // 담당자
  salesChannel: string,// 판매처 코드
  backorderQty: number,// 백오더 수량
  orderStatus: string, // 발주현황
  secured: boolean,    // 확보여부
  month: string        // PO Date (YYYY-MM-DD)
}
```

### Settings
```js
{
  squads: string[],
  salesChannels: { code: string, tier: string }[],
  orderStatuses: string[]
}
```
