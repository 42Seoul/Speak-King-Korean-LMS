# Speak King Korean 프로젝트

이 프로젝트는 Next.js와 Supabase를 기반으로 구축된 **말하기 학습 중심의 LMS(Learning Management System)** MVP입니다.

## 📚 프로젝트 문서

이 README는 프로젝트의 핵심 문서를 통합하여 정리한 것입니다.

- [1. 시스템 요구사항 (MVP v1.4)](#1-시스템-요구사항-mvp-v14)
- [2. 기술 스펙 (Technical Specification)](#2-기술-스펙-technical-specification)
- [3. 말하기 학습 모듈 V2 리포트](#3-말하기-학습-모듈-v2-리포트)
- [4. 데이터베이스 설계 (ERD)](#4-데이터베이스-설계-erd)
- [5. 보안 정책 (RLS)](#5-보안-정책-rls)
- [6. 기여 가이드 (Contributing Guide)](#6-기여-가이드-contributing-guide)
- [7. QA 체크리스트](#7-qa-체크리스트)

---

## 1. 시스템 요구사항 (MVP v1.4)

### 1.1 프로젝트 개요
- **목표**: 말하기 학습 중심의 LMS 시스템 구축.
- **핵심 가치**: 딜레이 없는 빠른 반복 말하기 학습, 소셜(디스코드/메타버스) 연동을 통한 동기 부여.
- **운영 원칙**: 1인 개발 효율화, 확장성 고려, 클라이언트 중심 로직.

### 1.2 사용자 및 권한
- **인증**: Supabase Auth 기반 Google 소셜 로그인.
- **역할 (Role)**:
  - **학생 (Student)**: 수강 신청, 학습 진행, 캐릭터 스프라이트 관리, 랭킹 확인.
  - **교사 (Teacher)**: 콘텐츠 생성, 학생 진도 실시간 모니터링, 숙제 할당.
    > **참고**: 학생 계정을 교사 계정으로 승격하려면 `/become-teacher` 페이지에 직접 접속하여 관리자가 발급한 시크릿 코드를 입력해야 합니다. (UI 버튼 없음)
  - **관리자 (Admin)**: 시스템 관리 (MVP에서는 교사와 동일 권한).

### 1.3 콘텐츠 구조
- **Course (강의)**: 유료 결제 단위 (예: 3월 기초 회화반). 공식 시작/종료일 존재.
- **Enrollment (수강 이력)**: 학생 개개인의 실제 접속 권한 기간.
- **Live Class (라이브 수업)**: Course 내 실시간 수업 회차 (ZEP 메타버스 링크 포함).
- **Study Set (학습 세트)**: 독립형 콘텐츠 단위 (JSON 데이터).
  - 공개(Public) 또는 비공개(Private).
  - 문장/단어, 해석, 오디오(필수), 이미지/영상(선택)으로 구성.

### 1.4 핵심 기능: 말하기 학습 엔진
- **엔진**: Web Speech API (Client-side STT) 활용.
- **로직**: 목표 문장 vs 발화 문장 유사도 70% 이상 시 성공 → 즉시 다음 문장 이동.
- **흐름**: 오디오 자동 재생 → 듣고 따라 말하기 → 판정 → 성공 시 이동.
- **세션 완료**: 교사가 설정한 목표 반복 횟수(N회)를 채워야 1 세션 완료로 기록.

### 1.5 학생 기능
- **대시보드**: 레벨, 스프라이트 표시, 학습 바로가기.
- **랭킹**: 단어 점수 + 학습 반복 횟수 기반 주간 랭킹.
- **소셜**: 디스코드 및 ZEP 접속 연동.

### 1.6 교사 기능
- **실시간 모니터링**: 1분 간격 Polling으로 학생들의 학습 상태 확인.
- **관리 기능**: 학생 목록, 콘텐츠(학습 세트), 강의(Course), 라이브 수업 관리.

---

## 2. 기술 스펙 (Technical Specification)

### 2.1 기술 스택
- **Framework**: Next.js 14+ (App Router) - SEO, RSC 성능 확보.
- **Language**: TypeScript - 타입 안정성(Type Safety).
- **Styling**: Tailwind CSS - 빠른 스타일링.
- **UI Library**: shadcn/ui - 생산성 향상.
- **State Mgmt**: Zustand (Client) - 가벼운 전역 상태 관리.
- **Data Fetching**: TanStack Query - 서버 상태 관리 및 Polling 구현.
- **Backend/DB**: Supabase - Auth, Postgres DB, Storage, Edge Functions 올인원.

### 2.2 아키텍처
- **폴더 구조**: 역할(Role) 단위 구분 (`app/(student)`, `app/(teacher)`, `app/(public)`).
- **핵심 구현 전략**:
  - **말하기 엔진**: `useSpeechToText` 커스텀 훅. Levenshtein Distance 알고리즘으로 클라이언트 채점.
  - **모니터링**: `useQuery`의 `refetchInterval`을 이용한 Polling.
  - **타입 연동**: `npx supabase gen types typescript`로 DB 스키마 자동 동기화.

---

## 3. 말하기 학습 모듈 V2 리포트

### 3.1 개요
`Web Speech API`를 활용한 끊김 없는 실시간 말하기 평가 시스템입니다.

### 3.2 핵심 로직 (`hooks/use-speech.ts`)
- **Continuous Mode**: 문장 중간에 침묵해도 인식이 끊기지 않도록 설정.
- **누적 전략 (Accumulation)**: 브라우저 세션 재시작 시에도 텍스트가 유실되지 않도록 확정된 결과를 누적 저장.
- **낙관적 UI (Optimistic UI)**: "Waiting..." 딜레이 없이 즉각적인 "Listening" 상태 표시.
- **평가 엔진 (`lib/utils.ts`)**:
  - **정규화**: 특수문자/공백 제거, 소문자 변환.
  - **포함 로직**: 추임새가 섞여도 정답 문장이 포함되면 성공 처리.
  - **유사도**: 편집 거리(Levenshtein Distance) 70% 이상 시 통과.

### 3.3 트러블 슈팅 해결
- **문장 끊김**: `continuous=true` 및 자체 누적 로직으로 해결.
- **반응 속도**: 낙관적 UI 업데이트 적용.
- **데이터 오염(Race Condition)**: 문제 이동 시 `recognition.abort()`로 물리적 세션 강제 종료.

---

## 4. 데이터베이스 설계 (ERD)

### 주요 테이블 스키마
- **profiles**: 사용자 정보 (Auth 연동, 역할, 닉네임, 스프라이트).
- **courses**: 강의 상품 정보.
- **enrollments**: 학생별 수강 이력 (접속 권한).
- **live_classes**: 회차별 ZEP 링크 관리.
- **study_sets**: 학습 콘텐츠 (JSONB로 오디오/멀티미디어 데이터 저장).
- **user_study_progress**: 사용자별 학습 진도 (반복/스킵 횟수).
- **assignments**: 숙제 관리 (누적형/신규형).
- **weekly_rankings**: 주간 랭킹 캐시 데이터.

*(상세 SQL은 `Supabase DB 설계서 ERD.txt` 참조)*

---

## 5. 보안 정책 (RLS)

### RLS (Row Level Security) 전략
- **기본 원칙**: 모든 테이블 RLS 활성화 (Default Deny).
- **주요 정책**:
  - **Profiles**: 본인 및 교사만 조회 가능. 수정은 본인만.
  - **Courses**: 인증된 사용자는 조회 가능. 관리는 교사만.
  - **Study Sets**: Public은 전체 공개, Private은 본인만.
  - **Progress/Assignments**: 본인(학생) 및 교사만 조회 가능.
  - **Storage**: `lms-assets` 버킷에 인증된 사용자 업로드 가능. 수정/삭제는 본인 파일만.

*(상세 스크립트는 `🛡️ Supabase RLS 보안 정책 스크립트.txt` 참조)*

---

## 6. 기여 가이드 (Contributing Guide)

### 6.1 시작하기
1. 저장소 클론 (Clone).
2. `npm install`
3. `.env.local` 설정 (관리자 문의).
4. `npm run dev` 실행.

### 6.2 Git 워크플로우
- **브랜치**: `타입/기능명` (예: `feature/speaking-test`, `fix/login-bug`).
- **커밋 메시지**: `[타입] 내용` (예: `[Feat] 말하기 평가 로직 추가`).
- **PR**: 작업 후 Pull Request 생성 → 리뷰 → Squash & Merge.

### 6.3 개발 표준
- **컴포넌트**: 200줄 이상 또는 2회 이상 재사용 시 분리.
- **UI**: `shadcn/ui` 컴포넌트 적극 활용.
- **포맷팅**: Prettier (Format On Save) 준수.

---

## 7. QA 체크리스트

### 주요 테스트 항목
1. **회원/계정**: 소셜 로그인, 프로필(아바타/스프라이트) 수정, 회원 탈퇴.
2. **선생님**: 학습 세트 생성(오디오 업로드), 숙제 할당(누적/신규), 실시간 모니터링 동작.
3. **학생**: 대시보드 통계, 학습 플레이어(STT 인식/채점/스킵), 숙제 완료 처리.
4. **UI/UX**: 반응형(사이드바/탭바), 메뉴 하이라이트.
5. **말하기 모듈**: 마이크 권한 처리, 빠른 스킵 시 안정성, 오디오 재생/녹음 상태 전환.