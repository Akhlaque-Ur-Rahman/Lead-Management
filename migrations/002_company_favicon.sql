-- Company branding: optional favicon (data URL or path), alongside existing logo
ALTER TABLE companies ADD COLUMN IF NOT EXISTS favicon TEXT;
