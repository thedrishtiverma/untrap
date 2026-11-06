-- Career catalogues are now read through authenticated server functions only.
DROP POLICY IF EXISTS "traps public read" ON public.career_traps;
DROP POLICY IF EXISTS "careers public read" ON public.careers;
DROP POLICY IF EXISTS "Authenticated users can read career profiles" ON public.career_profiles;
DROP POLICY IF EXISTS "templates public read" ON public.roadmap_templates;
REVOKE SELECT ON public.career_traps, public.careers, public.career_profiles, public.roadmap_templates FROM anon, authenticated;
-- Internal prompt and knowledge rows are not exposed through the Data API.
REVOKE SELECT ON public.knowledge_base, public.ai_prompts FROM anon, authenticated;