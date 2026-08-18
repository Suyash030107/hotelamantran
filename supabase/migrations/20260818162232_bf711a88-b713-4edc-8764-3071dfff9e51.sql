CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "admins manage staff" ON public.staff;
CREATE POLICY "admins manage staff" ON public.staff FOR ALL TO authenticated
USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins manage departments" ON public.departments;
CREATE POLICY "admins manage departments" ON public.departments FOR ALL TO authenticated
USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins manage attendance" ON public.attendance;
CREATE POLICY "admins manage attendance" ON public.attendance FOR ALL TO authenticated
USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins manage leave" ON public.leave_records;
CREATE POLICY "admins manage leave" ON public.leave_records FOR ALL TO authenticated
USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins manage salary" ON public.salary_records;
CREATE POLICY "admins manage salary" ON public.salary_records FOR ALL TO authenticated
USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins manage settings" ON public.settings;
CREATE POLICY "admins manage settings" ON public.settings FOR ALL TO authenticated
USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "admins read photos" ON storage.objects;
CREATE POLICY "admins read photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'photos' AND private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins upload photos" ON storage.objects;
CREATE POLICY "admins upload photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos' AND private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins update photos" ON storage.objects;
CREATE POLICY "admins update photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'photos' AND private.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admins delete photos" ON storage.objects;
CREATE POLICY "admins delete photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photos' AND private.has_role(auth.uid(),'admin'));

CREATE POLICY "admins manage user roles" ON public.user_roles FOR ALL TO authenticated
USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);