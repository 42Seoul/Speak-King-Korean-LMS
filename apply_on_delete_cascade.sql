-- This script applies ON DELETE CASCADE to relevant foreign keys in your Supabase 'public' schema.
-- Execute this script in the Supabase SQL Editor to ensure proper data cleanup on user or study set deletion.
--
-- IMPORTANT:
-- Running this script will modify your database schema.
-- Please ensure you understand the changes and have a backup if necessary.
--
-- After execution, when a user is deleted from 'auth.users', their 'profiles' record will be deleted.
-- Subsequently, due to ON DELETE CASCADE on 'profiles.id', all related records in the following tables will also be deleted:
-- - public.courses (if the user was a teacher owning courses)
-- - public.enrollments (user's course enrollments)
-- - public.study_sets (study sets owned by the user)
-- - public.user_study_progress (user's study progress records)
-- - public.assignments (assignments given by or received by the user)
-- - public.weekly_rankings (user's ranking data)
--
-- Additionally, deleting a study_set will cascade to:
-- - public.user_study_progress
-- - public.assignments
--
-- =====================================================================

-- 1. courses table: teacher_id references public.profiles(id)
ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS courses_teacher_id_fkey;
ALTER TABLE public.courses
ADD CONSTRAINT courses_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. enrollments table: user_id references public.profiles(id)
ALTER TABLE public.enrollments
DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;
ALTER TABLE public.enrollments
ADD CONSTRAINT enrollments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. enrollments table: course_id references public.courses(id)
ALTER TABLE public.enrollments
DROP CONSTRAINT IF EXISTS enrollments_course_id_fkey;
ALTER TABLE public.enrollments
ADD CONSTRAINT enrollments_course_id_fkey
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- 4. live_classes table: course_id references public.courses(id)
ALTER TABLE public.live_classes
DROP CONSTRAINT IF EXISTS live_classes_course_id_fkey;
ALTER TABLE public.live_classes
ADD CONSTRAINT live_classes_course_id_fkey
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- 5. study_sets table: owner_id references public.profiles(id)
ALTER TABLE public.study_sets
DROP CONSTRAINT IF EXISTS study_sets_owner_id_fkey;
ALTER TABLE public.study_sets
ADD CONSTRAINT study_sets_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. user_study_progress table: user_id references public.profiles(id)
ALTER TABLE public.user_study_progress
DROP CONSTRAINT IF EXISTS user_study_progress_user_id_fkey;
ALTER TABLE public.user_study_progress
ADD CONSTRAINT user_study_progress_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. user_study_progress table: study_set_id references public.study_sets(id)
ALTER TABLE public.user_study_progress
DROP CONSTRAINT IF EXISTS user_study_progress_study_set_id_fkey;
ALTER TABLE public.user_study_progress
ADD CONSTRAINT user_study_progress_study_set_id_fkey
FOREIGN KEY (study_set_id) REFERENCES public.study_sets(id) ON DELETE CASCADE;

-- 8. assignments table: teacher_id references public.profiles(id)
ALTER TABLE public.assignments
DROP CONSTRAINT IF EXISTS assignments_teacher_id_fkey;
ALTER TABLE public.assignments
ADD CONSTRAINT assignments_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 9. assignments table: student_id references public.profiles(id)
ALTER TABLE public.assignments
DROP CONSTRAINT IF EXISTS assignments_student_id_fkey;
ALTER TABLE public.assignments
ADD CONSTRAINT assignments_student_id_fkey
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 10. assignments table: study_set_id references public.study_sets(id)
ALTER TABLE public.assignments
DROP CONSTRAINT IF EXISTS assignments_study_set_id_fkey;
ALTER TABLE public.assignments
ADD CONSTRAINT assignments_study_set_id_fkey
FOREIGN KEY (study_set_id) REFERENCES public.study_sets(id) ON DELETE CASCADE;

-- 11. weekly_rankings table: user_id references public.profiles(id)
ALTER TABLE public.weekly_rankings
DROP CONSTRAINT IF EXISTS weekly_rankings_user_id_fkey;
ALTER TABLE public.weekly_rankings
ADD CONSTRAINT weekly_rankings_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- End of script.
