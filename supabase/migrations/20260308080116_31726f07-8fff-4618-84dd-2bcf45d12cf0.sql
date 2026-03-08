
-- Allow doctors to update their own notes
CREATE POLICY "Doctors can update own notes" ON public.doctor_notes
FOR UPDATE USING (auth.uid() = doctor_user_id);

-- Allow doctors to delete their own notes
CREATE POLICY "Doctors can delete own notes" ON public.doctor_notes
FOR DELETE USING (auth.uid() = doctor_user_id);
