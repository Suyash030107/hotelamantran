-- ============ 1. Organizations & memberships ============
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Business',
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_storage boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_user_unique UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX organization_members_org_idx ON public.organization_members(organization_id);

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER organization_members_updated_at BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 2. Private helper functions ============
CREATE OR REPLACE FUNCTION private.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.is_org_member(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = _org
  )
$$;

CREATE OR REPLACE FUNCTION private.is_org_admin(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = _org AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION private.has_legacy_storage()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.user_id = auth.uid() AND o.legacy_storage
  )
$$;

REVOKE ALL ON FUNCTION private.current_org_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_org_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_legacy_storage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_org_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_org_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_legacy_storage() TO authenticated, service_role;

CREATE POLICY "members read own org" ON public.organizations FOR SELECT TO authenticated
USING (private.is_org_member(id));
CREATE POLICY "admins update own org" ON public.organizations FOR UPDATE TO authenticated
USING (private.is_org_admin(id)) WITH CHECK (private.is_org_admin(id));

CREATE POLICY "members read org members" ON public.organization_members FOR SELECT TO authenticated
USING (organization_id = private.current_org_id());
CREATE POLICY "admins add org members" ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "admins update org members" ON public.organization_members FOR UPDATE TO authenticated
USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "admins remove org members" ON public.organization_members FOR DELETE TO authenticated
USING (private.is_org_admin(organization_id));

-- ============ 3. Add organization_id to data tables ============
ALTER TABLE public.departments    ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.staff          ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.attendance     ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.leave_records  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.salary_records ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.settings       ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============ 4. Backfill: one organization per existing account ============
DO $$
DECLARE
  v_primary uuid;
  v_org uuid;
  v_name text;
  r record;
BEGIN
  SELECT business_name INTO v_name FROM public.settings ORDER BY created_at LIMIT 1;
  SELECT id INTO v_primary FROM auth.users ORDER BY created_at LIMIT 1;

  FOR r IN SELECT id FROM auth.users ORDER BY created_at LOOP
    INSERT INTO public.organizations (name, owner_id, legacy_storage)
    VALUES (
      CASE WHEN r.id = v_primary THEN COALESCE(v_name, 'My Business') ELSE 'My Business' END,
      r.id,
      r.id = v_primary
    )
    RETURNING id INTO v_org;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org, r.id, 'admin')
    ON CONFLICT (user_id) DO NOTHING;

    IF r.id = v_primary THEN
      UPDATE public.departments    SET organization_id = v_org WHERE organization_id IS NULL;
      UPDATE public.staff          SET organization_id = v_org WHERE organization_id IS NULL;
      UPDATE public.attendance     SET organization_id = v_org WHERE organization_id IS NULL;
      UPDATE public.leave_records  SET organization_id = v_org WHERE organization_id IS NULL;
      UPDATE public.salary_records SET organization_id = v_org WHERE organization_id IS NULL;
      UPDATE public.settings       SET organization_id = v_org WHERE organization_id IS NULL;
    ELSE
      INSERT INTO public.settings (organization_id) VALUES (v_org);
    END IF;
  END LOOP;
END $$;

-- Any leftover ownerless rows are unreachable; remove them so the column can be required.
DELETE FROM public.attendance     WHERE organization_id IS NULL;
DELETE FROM public.leave_records  WHERE organization_id IS NULL;
DELETE FROM public.salary_records WHERE organization_id IS NULL;
DELETE FROM public.staff          WHERE organization_id IS NULL;
DELETE FROM public.departments    WHERE organization_id IS NULL;
DELETE FROM public.settings       WHERE organization_id IS NULL;

ALTER TABLE public.departments    ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN organization_id SET DEFAULT private.current_org_id();
ALTER TABLE public.staff          ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN organization_id SET DEFAULT private.current_org_id();
ALTER TABLE public.attendance     ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN organization_id SET DEFAULT private.current_org_id();
ALTER TABLE public.leave_records  ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN organization_id SET DEFAULT private.current_org_id();
ALTER TABLE public.salary_records ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN organization_id SET DEFAULT private.current_org_id();
ALTER TABLE public.settings       ALTER COLUMN organization_id SET NOT NULL, ALTER COLUMN organization_id SET DEFAULT private.current_org_id();

CREATE INDEX departments_org_idx    ON public.departments(organization_id);
CREATE INDEX staff_org_idx          ON public.staff(organization_id);
CREATE INDEX attendance_org_idx     ON public.attendance(organization_id, date);
CREATE INDEX leave_records_org_idx  ON public.leave_records(organization_id);
CREATE INDEX salary_records_org_idx ON public.salary_records(organization_id, month);

-- Scope uniqueness per organization
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE public.departments ADD CONSTRAINT departments_org_name_key UNIQUE (organization_id, name);
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_staff_code_key;
ALTER TABLE public.staff ADD CONSTRAINT staff_org_code_key UNIQUE (organization_id, staff_code);
ALTER TABLE public.settings ADD CONSTRAINT settings_org_key UNIQUE (organization_id);

-- ============ 5. Replace RLS policies with organization-scoped ones ============
DROP POLICY IF EXISTS "admins manage departments" ON public.departments;
DROP POLICY IF EXISTS "admins manage staff" ON public.staff;
DROP POLICY IF EXISTS "admins manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "admins manage leave" ON public.leave_records;
DROP POLICY IF EXISTS "admins manage salary" ON public.salary_records;
DROP POLICY IF EXISTS "admins manage settings" ON public.settings;

CREATE POLICY "org read departments" ON public.departments FOR SELECT TO authenticated
USING (organization_id = private.current_org_id());
CREATE POLICY "org admins write departments" ON public.departments FOR INSERT TO authenticated
WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins update departments" ON public.departments FOR UPDATE TO authenticated
USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins delete departments" ON public.departments FOR DELETE TO authenticated
USING (private.is_org_admin(organization_id));

CREATE POLICY "org read staff" ON public.staff FOR SELECT TO authenticated
USING (organization_id = private.current_org_id());
CREATE POLICY "org admins write staff" ON public.staff FOR INSERT TO authenticated
WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins update staff" ON public.staff FOR UPDATE TO authenticated
USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins delete staff" ON public.staff FOR DELETE TO authenticated
USING (private.is_org_admin(organization_id));

CREATE POLICY "org read attendance" ON public.attendance FOR SELECT TO authenticated
USING (organization_id = private.current_org_id());
CREATE POLICY "org admins write attendance" ON public.attendance FOR INSERT TO authenticated
WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins update attendance" ON public.attendance FOR UPDATE TO authenticated
USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins delete attendance" ON public.attendance FOR DELETE TO authenticated
USING (private.is_org_admin(organization_id));

CREATE POLICY "org read leave" ON public.leave_records FOR SELECT TO authenticated
USING (organization_id = private.current_org_id());
CREATE POLICY "org admins write leave" ON public.leave_records FOR INSERT TO authenticated
WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins update leave" ON public.leave_records FOR UPDATE TO authenticated
USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins delete leave" ON public.leave_records FOR DELETE TO authenticated
USING (private.is_org_admin(organization_id));

CREATE POLICY "org read salary" ON public.salary_records FOR SELECT TO authenticated
USING (organization_id = private.current_org_id());
CREATE POLICY "org admins write salary" ON public.salary_records FOR INSERT TO authenticated
WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins update salary" ON public.salary_records FOR UPDATE TO authenticated
USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));
CREATE POLICY "org admins delete salary" ON public.salary_records FOR DELETE TO authenticated
USING (private.is_org_admin(organization_id));

CREATE POLICY "org read settings" ON public.settings FOR SELECT TO authenticated
USING (organization_id = private.current_org_id());
CREATE POLICY "org admins update settings" ON public.settings FOR UPDATE TO authenticated
USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id));

-- ============ 6. Storage: photos scoped per organization ============
DROP POLICY IF EXISTS "admins read photos" ON storage.objects;
DROP POLICY IF EXISTS "admins upload photos" ON storage.objects;
DROP POLICY IF EXISTS "admins update photos" ON storage.objects;
DROP POLICY IF EXISTS "admins delete photos" ON storage.objects;

CREATE POLICY "org read photos" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'photos' AND (
    (storage.foldername(name))[1] = private.current_org_id()::text
    OR ((storage.foldername(name))[1] IN ('staff','attendance') AND private.has_legacy_storage())
  )
);
CREATE POLICY "org upload photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = private.current_org_id()::text
  AND private.is_org_admin(private.current_org_id())
);
CREATE POLICY "org update photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = private.current_org_id()::text);
CREATE POLICY "org delete photos" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'photos' AND (
    (storage.foldername(name))[1] = private.current_org_id()::text
    OR ((storage.foldername(name))[1] IN ('staff','attendance') AND private.is_org_admin(private.current_org_id()) AND private.has_legacy_storage())
  )
);

-- ============ 7. Signup trigger: own organization per account ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.organizations (name, owner_id)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name', ''), 'My Business'), NEW.id)
  RETURNING id INTO v_org;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org, NEW.id, 'admin')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.settings (organization_id) VALUES (v_org)
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============ 8. Drop the old global roles table ============
DROP POLICY IF EXISTS "admins manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "own roles read" ON public.user_roles;
DROP TABLE IF EXISTS public.user_roles;
DROP FUNCTION IF EXISTS private.has_role(uuid, app_role);