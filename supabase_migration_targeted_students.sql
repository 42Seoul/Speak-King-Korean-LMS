-- ============================================
-- 특정 학생 맞춤형 콘텐츠 기능 마이그레이션
-- ============================================
-- 실행 방법: Supabase Dashboard > SQL Editor에 붙여넣기

-- 1. study_sets 테이블에 targeted_students 컬럼 추가
alter table public.study_sets
  add column if not exists targeted_students uuid[] default null;

-- 2. 성능 최적화를 위한 GIN 인덱스 추가
create index if not exists idx_study_sets_targeted
  on public.study_sets using gin(targeted_students);

-- 3. 기존 학생 조회 RLS 정책 삭제
drop policy if exists "Students can view public study sets" on public.study_sets;
drop policy if exists "Students can view accessible study sets" on public.study_sets;

-- 4. 새로운 학생 조회 RLS 정책 생성
create policy "Students can view accessible study sets" on public.study_sets
  for select
  using (
    -- Case 1: Public 콘텐츠 (is_public = true)
    is_public = true
    or
    -- Case 2: 본인이 생성한 콘텐츠
    owner_id = auth.uid()
    or
    -- Case 3: 본인이 타겟팅된 콘텐츠
    -- (is_public = false이면서 내 ID가 targeted_students 배열에 포함)
    (
      is_public = false
      and targeted_students is not null
      and auth.uid() = any(targeted_students)
    )
  );

-- 5. 교사/관리자 조회 정책은 기존 유지 (이미 모든 콘텐츠를 볼 수 있음)
-- 확인용: 기존 정책이 없다면 추가
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'study_sets'
    and policyname = 'Teachers can view all study sets'
  ) then
    create policy "Teachers can view all study sets" on public.study_sets
      for select
      using (
        exists (
          select 1 from public.profiles
          where id = auth.uid()
          and role in ('teacher', 'admin')
        )
      );
  end if;
end $$;

-- 완료 메시지
select 'Migration completed successfully! ✓' as status;
