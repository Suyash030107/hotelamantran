ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS face_descriptor jsonb,
  ADD COLUMN IF NOT EXISTS face_enrolled_at timestamptz;

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_out_photo_path text,
  ADD COLUMN IF NOT EXISTS verification_method text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS face_match_score numeric;

CREATE INDEX IF NOT EXISTS attendance_staff_date_idx ON public.attendance (staff_id, date);
CREATE INDEX IF NOT EXISTS leave_records_staff_idx ON public.leave_records (staff_id);
CREATE INDEX IF NOT EXISTS salary_records_staff_month_idx ON public.salary_records (staff_id, month);