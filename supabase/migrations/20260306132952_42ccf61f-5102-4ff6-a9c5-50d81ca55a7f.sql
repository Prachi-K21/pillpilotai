
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE
-- Drop and recreate all policies as PERMISSIVE

-- dose_logs
DROP POLICY IF EXISTS "Users can view own dose logs" ON public.dose_logs;
DROP POLICY IF EXISTS "Users can insert own dose logs" ON public.dose_logs;
DROP POLICY IF EXISTS "Users can update own dose logs" ON public.dose_logs;
DROP POLICY IF EXISTS "Doctors can view patient dose logs" ON public.dose_logs;

CREATE POLICY "Users can view own dose logs" ON public.dose_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dose logs" ON public.dose_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dose logs" ON public.dose_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view patient dose logs" ON public.dose_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));

-- medicines
DROP POLICY IF EXISTS "Users can view own medicines" ON public.medicines;
DROP POLICY IF EXISTS "Users can insert own medicines" ON public.medicines;
DROP POLICY IF EXISTS "Users can update own medicines" ON public.medicines;
DROP POLICY IF EXISTS "Users can delete own medicines" ON public.medicines;
DROP POLICY IF EXISTS "Doctors can view patient medicines" ON public.medicines;

CREATE POLICY "Users can view own medicines" ON public.medicines FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medicines" ON public.medicines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medicines" ON public.medicines FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medicines" ON public.medicines FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view patient medicines" ON public.medicines FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Doctors can view all profiles for monitoring
CREATE POLICY "Doctors can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));
-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Create family_members table
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  relationship TEXT NOT NULL,
  notify_on_missed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own family members" ON public.family_members FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own family members" ON public.family_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own family members" ON public.family_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own family members" ON public.family_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
