-- Owner must always see their own decision rooms; before this, reading back a
-- freshly created room failed because only decision members were visible.
DROP POLICY IF EXISTS "members view decisions" ON public.vocational_decisions;
CREATE POLICY "members view decisions" ON public.vocational_decisions FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR private.is_decision_member(id, auth.uid()));
