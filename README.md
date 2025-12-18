# LMS MVP Project

This project is a Learning Management System (LMS) MVP focused on speaking practice, built with Next.js and Supabase.

## 📚 Project Documentation

This README aggregates the key documentation for the project.

- [1. System Requirements](#1-system-requirements-mvp-v14)
- [2. Technical Specification](#2-technical-specification)
- [3. Speaking Module V2 Report](#3-speaking-module-v2-report)
- [4. Database Design (ERD)](#4-database-design-erd)
- [5. Security Policies (RLS)](#5-security-policies-rls)
- [6. Contributing Guide](#6-contributing-guide)
- [7. QA Checklist](#7-qa-checklist)

---

## 1. System Requirements (MVP v1.4)

### 1.1 Project Overview
- **Goal**: Build an LMS focused on speaking practice.
- **Key Values**: Zero-delay repetitive speaking practice, motivation via social features (Discord/Metaverse).
- **Environment**: Next.js (Front/Back), Supabase (DB/Auth/Storage).
- **Principles**: Efficient 1-person development, scalability, client-centric logic.

### 1.2 User & Auth
- **Auth**: Google Social Login via Supabase Auth.
- **Roles**:
  - **Student**: Enroll, study, manage sprite, check rankings.
  - **Teacher**: Create content, monitor progress, assign homework.
  - **Admin**: System management (same permissions as Teacher for MVP).

### 1.3 Content Structure
- **Course**: Top-level paid product unit (e.g., "March Basic Conv"). Has official Start/End dates.
- **Enrollment**: Access period management for individual students.
- **Live Class**: Real-time class sessions within a Course (with ZEP Metaverse links).
- **Study Set**: Independent content unit (JSON data with Audio/Image/Video).
  - Can be Public or Private.
  - Consists of sentences/words with translation and audio.

### 1.4 Speaking Engine (Core)
- **Engine**: Web Speech API (Client-side STT).
- **Logic**: Compare spoken text vs target text. >70% similarity = Success.
- **Flow**: Auto-play audio -> User speaks -> Success -> Next sentence.
- **Session Completion**: Must reach target repeat count (N) to count as 1 session.

### 1.5 Student Features
- **Dashboard**: Level, Sprite, Quick access to study.
- **Ranking**: Based on word score + repetition count (Weekly).
- **Social**: Discord & ZEP integration.

### 1.6 Teacher Features
- **Live Monitoring**: Real-time status of students (Polling every 1 min).
- **Management**: Students, Content (Study Sets), Courses, Live Classes.

---

## 2. Technical Specification

### 2.1 Tech Stack
- **Framework**: Next.js 14+ (App Router) - SEO, RSC.
- **Language**: TypeScript - Type safety.
- **Styling**: Tailwind CSS - Rapid styling.
- **UI Library**: shadcn/ui - Pre-built components.
- **State Mgmt**: Zustand (Client).
- **Data Fetching**: TanStack Query - Server state, polling.
- **Backend/DB**: Supabase - Auth, Postgres, Storage, Edge Functions.

### 2.2 Architecture
- **Structure**: Role-based (app/(student), app/(teacher), app/(public)).
- **Core Strategy**:
  - **Speaking Engine**: `useSpeechToText` hook using Web Speech API. Levenshtein Distance for scoring.
  - **Monitoring**: Polling with `useQuery` (refetchInterval).
  - **Type Gen**: `npx supabase gen types typescript` for DB type safety.

---

## 3. Speaking Module V2 Report

### 3.1 Overview
Real-time speaking practice system using `Web Speech API`.

### 3.2 Core Logic (`hooks/use-speech.ts`)
- **Continuous Mode**: Keeps listening even if user pauses.
- **Accumulation**: Prevents data loss during browser session restarts by storing finalized results.
- **Optimistic UI**: Shows "Listening..." immediately to reduce perceived latency.
- **Evaluation**: 
  - Normalization (remove special chars, lowercase).
  - Contains Check (if key phrase is present, pass).
  - Similarity Check (Levenshtein Distance > 70%).

### 3.3 Troubleshooting
- **Issue**: Sentences lost when pausing. -> **Fix**: Added accumulation logic.
- **Issue**: "Waiting..." delay. -> **Fix**: Optimistic UI updates.
- **Issue**: Race conditions on skipping. -> **Fix**: `recognition.abort()` on reset.

---

## 4. Database Design (ERD)

### Schema Overview
- **profiles**: Users (Student/Teacher). Linked to Auth.
- **courses**: Paid classes.
- **enrollments**: User-Course relation (Access rights).
- **live_classes**: Scheduled sessions with ZEP links.
- **study_sets**: Content container (JSONB for sentences/media).
- **user_study_progress**: Tracking repeats/skips per user per set.
- **assignments**: Homework assignments.
- **weekly_rankings**: Cached ranking data.

*(Refer to `Supabase DB 설계서 ERD.txt` for full SQL script)*

---

## 5. Security Policies (RLS)

### Strategy
- **Default**: All tables have RLS enabled.
- **Policies**:
  - **Profiles**: Viewable by self or teachers. Update own only.
  - **Courses**: Viewable by authenticated. Manage by Teacher.
  - **Study Sets**: Public sets viewable by all. Private sets by owner only.
  - **Progress/Assignments**: Viewable by owner (Student) or Teacher.
  - **Storage**: Authenticated users can upload to `lms-assets`. Users manage their own files.

*(Refer to `🛡️ Supabase RLS (Row Level Security) 보안 정책 스크립트.txt` for full SQL script)*

---

## 6. Contributing Guide

### 6.1 Setup
1. Clone repo.
2. `npm install`
3. Copy `.env.example` to `.env.local` (Get keys from admin).
4. `npm run dev`

### 6.2 Git Workflow
- **Branch**: `type/feature-name` (e.g., `feature/speaking-test`).
- **Commits**: `[Type] Summary` (e.g., `[Feat] Add scoring logic`).
- **PR**: Create PR -> Review -> Squash & Merge.

### 6.3 Standards
- **Components**: Break down if > 200 lines or reused > 2 times.
- **UI**: Use `shadcn/ui`.
- **Formatting**: Prettier with "Format On Save".

---

## 7. QA Checklist

### Key Test Areas
1. **Auth**: Login, Profile Update (Avatar/Sprite), Delete Account.
2. **Teacher**: Create Study Set (Audio upload), Assign Homework, Live Monitoring.
3. **Student**: Dashboard stats, Speaking Practice (STT/Scoring), Homework completion.
4. **UI/UX**: Responsive sidebar/tabbar, Menu highlighting.
5. **Speaking Module**: Permission handling, Race condition checks (rapid skipping), Audio/Mic state transitions.
