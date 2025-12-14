-- Drop table if exists to ensure clean slate with correct policies
drop table if exists ocr_templates;

-- Create OCR Templates table for learning column positions
create table ocr_templates (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references teachers(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  template_name text,
  column_config jsonb, -- Stores [{ subject_id, subject_name, x_offset }]
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(teacher_id, class_id)
);

-- Enable RLS
alter table ocr_templates enable row level security;

-- Policies
create policy "Teachers can view their own templates"
  on ocr_templates for select
  using (auth.uid() in (
    select profile_id from teachers where id = ocr_templates.teacher_id
  ));

create policy "Teachers can insert/update their own templates"
  on ocr_templates for all
  using (auth.uid() in (
    select profile_id from teachers where id = ocr_templates.teacher_id
  ));

-- Function to update timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

drop trigger if exists update_ocr_templates_updated_at on ocr_templates;
create trigger update_ocr_templates_updated_at
    before update on ocr_templates
    for each row
    execute procedure update_updated_at_column();
