
-- Table: family_doctors (one doctor per user)
CREATE TABLE public.family_doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  doctor_name TEXT NOT NULL,
  clinic_name TEXT DEFAULT '',
  phone_number TEXT DEFAULT '',
  email TEXT DEFAULT '',
  specialty TEXT DEFAULT 'General Physician',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.family_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own doctor" ON public.family_doctors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own doctor" ON public.family_doctors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own doctor" ON public.family_doctors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own doctor" ON public.family_doctors FOR DELETE USING (auth.uid() = user_id);

-- Table: doctor_notes (advice from doctors to patients)
CREATE TABLE public.doctor_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID NOT NULL,
  doctor_user_id UUID,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own notes" ON public.doctor_notes FOR SELECT USING (auth.uid() = patient_user_id);
CREATE POLICY "Doctors can insert notes" ON public.doctor_notes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Doctors can view notes they created" ON public.doctor_notes FOR SELECT USING (auth.uid() = doctor_user_id);

-- Trigger for updated_at on family_doctors
CREATE TRIGGER update_family_doctors_updated_at
  BEFORE UPDATE ON public.family_doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
