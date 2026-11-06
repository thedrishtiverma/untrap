-- Catalogue data is served by authenticated server functions; block direct Data API reads.
DROP POLICY IF EXISTS "careers public read" ON public.careers;
REVOKE SELECT ON public.careers FROM anon, authenticated;
DROP POLICY IF EXISTS "traps public read" ON public.career_traps;
REVOKE SELECT ON public.career_traps FROM anon, authenticated;
DROP POLICY IF EXISTS "Authenticated users can read career profiles" ON public.career_profiles;
REVOKE SELECT ON public.career_profiles FROM anon, authenticated;
DROP POLICY IF EXISTS "templates public read" ON public.roadmap_templates;
REVOKE SELECT ON public.roadmap_templates FROM anon, authenticated;
-- knowledge_base and ai_prompts are internal data and remain accessible only to trusted server code and administrators.
REVOKE SELECT ON public.knowledge_base FROM anon, authenticated;
REVOKE SELECT ON public.ai_prompts FROM anon, authenticated;