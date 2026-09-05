-- =====================================================================
-- Wadi El Molouk website — Supabase schema
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. restaurant_settings  (a single row holding site-wide text/content)
-- ---------------------------------------------------------------------
create table if not exists restaurant_settings (
  id int primary key default 1,
  hero_title text not null default 'مطعم وكافيه وادي الملوك',
  hero_tagline text not null default '',
  hero_desc text not null default '',
  hero_cover_image text not null default '',
  rating_avg text not null default '4.0',
  rating_count text not null default '0',
  why_us jsonb not null default '[]'::jsonb,        -- [{icon,title,desc}, ...]
  review_themes jsonb not null default '[]'::jsonb, -- [{id,type,text}, ...]
  phones jsonb not null default '[]'::jsonb,        -- ["01...", "01..."]
  address text not null default '',
  plus_code text not null default '',
  map_query text not null default '',
  directions_url text not null default '',
  updated_at timestamptz not null default now(),
  constraint restaurant_settings_singleton check (id = 1)
);

-- ---------------------------------------------------------------------
-- 2. menu_categories
-- ---------------------------------------------------------------------
create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'قسم جديد',
  icon text not null default '🍽️',
  note text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. menu_items
-- ---------------------------------------------------------------------
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null default 'صنف جديد',
  description text not null default '',
  image_url text not null default '',
  variants jsonb not null default '[]'::jsonb, -- [{label, price}, ...]
  available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists menu_items_category_idx on menu_items(category_id);

-- ---------------------------------------------------------------------
-- 4. gallery
-- ---------------------------------------------------------------------
create table if not exists gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null default '',
  caption text not null default '',
  category text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. offers
-- ---------------------------------------------------------------------
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'عرض جديد',
  description text not null default '',
  image_url text not null default '',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. opening_hours  (one fixed row per day of week, 0 = Sunday)
-- ---------------------------------------------------------------------
create table if not exists opening_hours (
  day_of_week int primary key check (day_of_week between 0 and 6),
  open_time text not null default '08:00',
  close_time text not null default '00:55',
  closed boolean not null default false,
  note text not null default ''
);

-- =====================================================================
-- Row Level Security
-- Public visitors (anon key) can only READ. Only a signed-in admin
-- (Supabase Auth session) can write. This is what makes it safe to ship
-- the anon key in the frontend — see README.md for why this is expected.
-- =====================================================================
alter table restaurant_settings enable row level security;
alter table menu_categories     enable row level security;
alter table menu_items          enable row level security;
alter table gallery             enable row level security;
alter table offers              enable row level security;
alter table opening_hours       enable row level security;

-- Public read access
create policy "public read settings"   on restaurant_settings for select using (true);
create policy "public read categories" on menu_categories     for select using (true);
create policy "public read items"      on menu_items          for select using (true);
create policy "public read gallery"    on gallery              for select using (true);
create policy "public read offers"     on offers               for select using (true);
create policy "public read hours"      on opening_hours        for select using (true);

-- Authenticated (logged-in admin) write access
create policy "admin write settings" on restaurant_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write categories" on menu_categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write items" on menu_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write gallery" on gallery
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write offers" on offers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write hours" on opening_hours
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =====================================================================
-- Storage: one public bucket for all uploaded images
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('wadi-images', 'wadi-images', true)
on conflict (id) do nothing;

create policy "public read wadi-images"
  on storage.objects for select
  using (bucket_id = 'wadi-images');

create policy "admin upload wadi-images"
  on storage.objects for insert
  with check (bucket_id = 'wadi-images' and auth.role() = 'authenticated');

create policy "admin update wadi-images"
  on storage.objects for update
  using (bucket_id = 'wadi-images' and auth.role() = 'authenticated');

create policy "admin delete wadi-images"
  on storage.objects for delete
  using (bucket_id = 'wadi-images' and auth.role() = 'authenticated');
