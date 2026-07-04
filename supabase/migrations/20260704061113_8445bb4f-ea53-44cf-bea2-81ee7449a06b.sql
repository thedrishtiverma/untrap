
-- 1) Scope sensitive-table policies to authenticated role (drop + recreate)
DROP POLICY IF EXISTS "own reports" ON public.career_reports;
CREATE POLICY "own reports" ON public.career_reports
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own messages" ON public.chat_messages;
CREATE POLICY "own messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own tasks" ON public.roadmap_tasks;
CREATE POLICY "own tasks" ON public.roadmap_tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own moat profile" ON public.student_moat_profile;
CREATE POLICY "Users manage their own moat profile" ON public.student_moat_profile
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) user_roles: add RESTRICTIVE policy so non-admins can NEVER write, regardless of future permissive policies
DROP POLICY IF EXISTS "only admins may write user_roles" ON public.user_roles;
CREATE POLICY "only admins may write user_roles" ON public.user_roles
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    (current_setting('request.method', true) IS NULL)
    OR private.has_role(auth.uid(), 'admin'::app_role)
    OR ((SELECT current_query()) ILIKE 'SELECT%')
  )
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Simpler & correct: separate restrictive policies per write cmd
DROP POLICY IF EXISTS "only admins may write user_roles" ON public.user_roles;

CREATE POLICY "restrict inserts to admins" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "restrict updates to admins" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "restrict deletes to admins" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 3) Harden has_role: only allow self-lookup unless caller is admin
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  -- Allow only self-lookup unless caller is an admin (self admin check permitted)
  IF _caller IS NULL THEN
    RETURN false;
  END IF;

  IF _user_id <> _caller THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _caller AND role = 'admin'::app_role
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;
