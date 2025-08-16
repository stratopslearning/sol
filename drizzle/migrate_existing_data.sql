-- Data migration script to handle existing data
-- This script should be run after the schema migration

-- Step 1: Create sections for existing courses
-- We'll create one section per existing course with the same enrollment code
INSERT INTO sections (course_id, name, professor_enrollment_code, student_enrollment_code, is_active, created_at, updated_at)
SELECT 
    c.id as course_id,
    'Default Section' as name,
    c.enrollment_code as professor_enrollment_code,
    c.enrollment_code || 'S' as student_enrollment_code, -- Add 'S' suffix for student code
    c.is_active,
    c.created_at,
    c.updated_at
FROM courses c
WHERE c.professor_id IS NOT NULL; -- Only for courses that have professors

-- Step 2: Migrate existing professor enrollments to professor_sections
INSERT INTO professor_sections (professor_id, section_id, enrolled_at, status)
SELECT 
    c.professor_id,
    s.id as section_id,
    c.created_at as enrolled_at,
    'ACTIVE' as status
FROM courses c
JOIN sections s ON c.id = s.course_id
WHERE c.professor_id IS NOT NULL;

-- Step 3: Migrate existing student enrollments to student_sections
INSERT INTO student_sections (student_id, section_id, enrolled_at, status)
SELECT 
    ce.student_id,
    s.id as section_id,
    ce.enrolled_at,
    ce.status
FROM course_enrollments ce
JOIN sections s ON ce.course_id = s.course_id;

-- Step 4: Assign existing quizzes to sections
INSERT INTO quiz_sections (quiz_id, section_id, assigned_by, assigned_at)
SELECT 
    q.id as quiz_id,
    s.id as section_id,
    q.professor_id as assigned_by,
    q.created_at as assigned_at
FROM quizzes q
JOIN sections s ON q.course_id = s.course_id;

-- Step 5: Update attempts to reference sections instead of courses
UPDATE attempts 
SET section_id = s.id
FROM sections s
JOIN quizzes q ON attempts.quiz_id = q.id
WHERE s.course_id = attempts.course_id;

-- Note: After running this migration, you should verify the data integrity
-- and then manually delete the old quizzes as mentioned in the requirements 