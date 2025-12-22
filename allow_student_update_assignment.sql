-- [Assignments 테이블 RLS 정책 추가]
-- 기존 정책: 교사만 모든 관리 가능, 학생은 조회만 가능.
-- 변경 정책: 학생이 '자신에게 할당된(student_id = auth.uid())' 숙제는 상태를 업데이트할 수 있도록 허용.

-- 정책 이름: "Students can update completion status of own assignments"
create policy "Students can update own assignments"
on public.assignments
for update
using (
  auth.uid() = student_id
)
with check (
  auth.uid() = student_id
);

-- 참고: 이 정책을 적용하려면 Supabase SQL Editor에서 이 스크립트를 실행해야 합니다.
-- 실행 후에는 학생이 클라이언트 사이드(또는 서버 액션에서 학생 권한으로)에서 
-- 자신의 숙제에 대해 .update()를 호출할 수 있게 됩니다.
