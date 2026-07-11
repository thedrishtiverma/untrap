DROP POLICY IF EXISTS "questions readable" ON public.assessment_questions;
CREATE POLICY "questions readable" ON public.assessment_questions FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.assessment_questions FROM anon;