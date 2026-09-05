-- =====================================================================
-- Wadi El Molouk — one-time data migration
-- Run this AFTER schema.sql, once. It copies the exact menu, prices,
-- hero text, contact info, and hours that were already in the site
-- (nothing is invented — this is a straight transfer).
-- =====================================================================

-- ===============================================
-- SEED DATA: migrated from the existing site content
-- Safe to run once, right after schema.sql
-- ===============================================

insert into restaurant_settings (id, hero_title, hero_tagline, hero_desc, hero_cover_image, rating_avg, rating_count, why_us, review_themes, phones, address, plus_code, map_query, directions_url)
values (
  1, 'مطعم الملوك', 'طعم يستحق التجربة', 'بيتزا، فطائر، مشويات، كريب وسوري — أشهى الأكلات في سمسطا', '',
  '4.0', '108',
  '[{"icon": "🔥", "title": "أكل طازج", "desc": "يتم تجهيز الأطباق بعناية لتقديم أفضل طعم."}, {"icon": "🥩", "title": "مشويات مميزة", "desc": "مجموعة متنوعة من المشويات والأطباق الساخنة."}, {"icon": "🛵", "title": "خدمة توصيل", "desc": "اطلب وهيوصلك لحد الباب."}, {"icon": "☕", "title": "مطعم وكافيه", "desc": "مكان مناسب للأكل والمشروبات."}]'::jsonb, '[{"id": "r1", "type": "positive", "text": "إشادة متكررة من الزائرين بجودة الطعام ومستوى الخدمة."}, {"id": "r2", "type": "mixed", "text": "بعض الملاحظات على الأسعار وسرعة التوصيل، تستحق المتابعة."}]'::jsonb, '["012 810 99 545", "0111 49 47 384", "010 18 15 28 50"]'::jsonb,
  'سمسطا – شارع 26 يوليو – أمام مطعم عزت وأمام مخبز أولاد السعودي – مركز سمسطا – بني سويف', 'WVJ4+4J', 'مطعم الملوك سمسطا بني سويف', 'https://maps.app.goo.gl/jYqZGKfG7pnmyXNv5'
) on conflict (id) do nothing;

-- Same hours every day, taken from the previous single hours line
-- (8:00 AM - 12:55 AM, i.e. past midnight). Edit per day from the dashboard afterwards.
insert into opening_hours (day_of_week, open_time, close_time, closed, note) values
  (0, '08:00', '00:55', false, ''),
  (1, '08:00', '00:55', false, ''),
  (2, '08:00', '00:55', false, ''),
  (3, '08:00', '00:55', false, ''),
  (4, '08:00', '00:55', false, ''),
  (5, '08:00', '00:55', false, ''),
  (6, '08:00', '00:55', false, '')
on conflict (day_of_week) do nothing;

-- Menu categories & items
do $$
declare
  cat_id uuid;
begin
  insert into menu_categories (name, icon, note, sort_order) values ('بيتزا إيطالي', '🍕', 'إضافة حشو الأطراف: S ٢٠ / M ٣٠ / L ٤٠ جنيه', 0) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'مرجريتا', '', '[{"id": "v_pfoe7y", "label": "L", "price": "100"}, {"id": "v_43k71x", "label": "M", "price": "80"}, {"id": "v_jeyu4n", "label": "S", "price": "60"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'ميكس جبن', '', '[{"id": "v_5ryif0", "label": "L", "price": "110"}, {"id": "v_me9xsa", "label": "M", "price": "90"}, {"id": "v_4p3ihq", "label": "S", "price": "70"}]'::jsonb, true, 1);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'سجق', '', '[{"id": "v_haghae", "label": "L", "price": "120"}, {"id": "v_9oz4sx", "label": "M", "price": "95"}, {"id": "v_lm55rj", "label": "S", "price": "75"}]'::jsonb, true, 2);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'برجر', '', '[{"id": "v_8flwiy", "label": "L", "price": "110"}, {"id": "v_xfvobh", "label": "M", "price": "90"}, {"id": "v_52q8w0", "label": "S", "price": "75"}]'::jsonb, true, 3);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'هوت دوج', '', '[{"id": "v_t3atu5", "label": "L", "price": "110"}, {"id": "v_2phmog", "label": "M", "price": "90"}, {"id": "v_0sjzwq", "label": "S", "price": "70"}]'::jsonb, true, 4);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'سلامي', '', '[{"id": "v_3xzoio", "label": "L", "price": "130"}, {"id": "v_j08e13", "label": "M", "price": "100"}, {"id": "v_ain4mw", "label": "S", "price": "80"}]'::jsonb, true, 5);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'تونة', '', '[{"id": "v_n42kss", "label": "L", "price": "150"}, {"id": "v_odwai5", "label": "M", "price": "130"}, {"id": "v_snpyuj", "label": "S", "price": "100"}]'::jsonb, true, 6);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'بسطرمة', '', '[{"id": "v_kfy9e9", "label": "L", "price": "150"}, {"id": "v_909oq2", "label": "M", "price": "130"}, {"id": "v_pzp8f8", "label": "S", "price": "100"}]'::jsonb, true, 7);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'لحمة مفرومة', '', '[{"id": "v_fhj16q", "label": "L", "price": "160"}, {"id": "v_891gx7", "label": "M", "price": "130"}, {"id": "v_pnjk5a", "label": "S", "price": "100"}]'::jsonb, true, 8);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'ميكس لحوم', '', '[{"id": "v_w291pt", "label": "L", "price": "160"}, {"id": "v_porsa4", "label": "M", "price": "135"}, {"id": "v_fko8lk", "label": "S", "price": "110"}]'::jsonb, true, 9);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'شاورما فراخ', '', '[{"id": "v_ibykhk", "label": "L", "price": "145"}, {"id": "v_55a63c", "label": "M", "price": "120"}, {"id": "v_e7wqfb", "label": "S", "price": "90"}]'::jsonb, true, 10);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'استربس', '', '[{"id": "v_pnqz5q", "label": "L", "price": "145"}, {"id": "v_avrfpw", "label": "M", "price": "120"}, {"id": "v_xewbxe", "label": "S", "price": "90"}]'::jsonb, true, 11);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'ميكس فراخ', '', '[{"id": "v_sc9lln", "label": "L", "price": "155"}, {"id": "v_qgrlz2", "label": "M", "price": "135"}, {"id": "v_rbgub1", "label": "S", "price": "100"}]'::jsonb, true, 12);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فراخ رانش', '', '[{"id": "v_42f6u7", "label": "L", "price": "160"}, {"id": "v_r2nqaq", "label": "M", "price": "130"}, {"id": "v_9uwu3t", "label": "S", "price": "100"}]'::jsonb, true, 13);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فراخ باربيكيو', '', '[{"id": "v_zi70ru", "label": "L", "price": "155"}, {"id": "v_lgre6y", "label": "M", "price": "120"}, {"id": "v_bszxoa", "label": "S", "price": "95"}]'::jsonb, true, 14);
  insert into menu_categories (name, icon, note, sort_order) values ('فطائر حادق', '🥧', 'إضافة شرقي: +15 جنيه', 1) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة فراخ', '', '[{"id": "v_xkks96", "label": "L", "price": "155"}, {"id": "v_qbyl8h", "label": "M", "price": "125"}, {"id": "v_3fkxwi", "label": "S", "price": "95"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة ميكس فراخ', '', '[{"id": "v_4wirwo", "label": "L", "price": "165"}, {"id": "v_lpl1s4", "label": "M", "price": "130"}, {"id": "v_5ooji2", "label": "S", "price": "100"}]'::jsonb, true, 1);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة استربس', '', '[{"id": "v_m7grfd", "label": "L", "price": "155"}, {"id": "v_ufdxbj", "label": "M", "price": "125"}, {"id": "v_yu7e8v", "label": "S", "price": "95"}]'::jsonb, true, 2);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة بانية', '', '[{"id": "v_zk3vrb", "label": "L", "price": "140"}, {"id": "v_hnetp1", "label": "M", "price": "110"}, {"id": "v_ueqww5", "label": "S", "price": "80"}]'::jsonb, true, 3);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة الملوك', '', '[{"id": "v_n15gt4", "label": "L", "price": "165"}, {"id": "v_4nqo6b", "label": "M", "price": "130"}, {"id": "v_nkd3b1", "label": "S", "price": "100"}]'::jsonb, true, 4);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة لحمه مفرومة', '', '[{"id": "v_hndlpv", "label": "L", "price": "160"}, {"id": "v_08fime", "label": "M", "price": "130"}, {"id": "v_becm20", "label": "S", "price": "100"}]'::jsonb, true, 5);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة سلامي', '', '[{"id": "v_it4efs", "label": "L", "price": "160"}, {"id": "v_134xti", "label": "M", "price": "130"}, {"id": "v_2tk1rk", "label": "S", "price": "100"}]'::jsonb, true, 6);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة بسطرمة', '', '[{"id": "v_h06fn4", "label": "L", "price": "165"}, {"id": "v_dgvnmg", "label": "M", "price": "135"}, {"id": "v_ppchbi", "label": "S", "price": "115"}]'::jsonb, true, 7);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة تونة قطع', '', '[{"id": "v_usfura", "label": "L", "price": "170"}, {"id": "v_7gpwte", "label": "M", "price": "130"}, {"id": "v_pzowsn", "label": "S", "price": "100"}]'::jsonb, true, 8);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة سجق', '', '[{"id": "v_nm88i5", "label": "L", "price": "145"}, {"id": "v_w9gzxh", "label": "M", "price": "115"}, {"id": "v_1nvcdd", "label": "S", "price": "85"}]'::jsonb, true, 9);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة تركي مدخن', '', '[{"id": "v_k9vw79", "label": "L", "price": "170"}, {"id": "v_6f7zip", "label": "M", "price": "140"}, {"id": "v_htzkd4", "label": "S", "price": "110"}]'::jsonb, true, 10);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة ميكس جبن', '', '[{"id": "v_yzu1ip", "label": "L", "price": "150"}, {"id": "v_dqdtn8", "label": "M", "price": "120"}, {"id": "v_7gvwkn", "label": "S", "price": "90"}]'::jsonb, true, 11);
  insert into menu_categories (name, icon, note, sort_order) values ('فطائر حلو', '🍮', '', 2) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة بغاشة', '', '[{"id": "v_l04gvb", "label": "L", "price": "60"}, {"id": "v_g7t0n0", "label": "M", "price": "40"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة كاستر', '', '[{"id": "v_n5vc53", "label": "L", "price": "70"}, {"id": "v_q4dhyp", "label": "M", "price": "50"}]'::jsonb, true, 1);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة بسبوسة', '', '[{"id": "v_wv4l16", "label": "L", "price": "85"}, {"id": "v_1858nw", "label": "M", "price": "65"}]'::jsonb, true, 2);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة بسبوسة بالقشطة', '', '[{"id": "v_rr5615", "label": "L", "price": "110"}, {"id": "v_8ekyon", "label": "M", "price": "80"}]'::jsonb, true, 3);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة كنافة', '', '[{"id": "v_g42d85", "label": "L", "price": "85"}, {"id": "v_g0i32m", "label": "M", "price": "65"}]'::jsonb, true, 4);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة قشطة وعسل', '', '[{"id": "v_iaacp2", "label": "L", "price": "100"}, {"id": "v_mzivxn", "label": "M", "price": "70"}]'::jsonb, true, 5);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة نوتيلا', '', '[{"id": "v_emulry", "label": "L", "price": "80"}, {"id": "v_dtdzyo", "label": "M", "price": "55"}]'::jsonb, true, 6);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة لوتس', '', '[{"id": "v_xvuzb9", "label": "L", "price": "90"}, {"id": "v_uoyam4", "label": "M", "price": "80"}]'::jsonb, true, 7);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فطيرة فور سيزون', '', '[{"id": "v_sg8x6l", "label": "L", "price": "130"}, {"id": "v_vgkyqi", "label": "M", "price": "100"}]'::jsonb, true, 8);
  insert into menu_categories (name, icon, note, sort_order) values ('مكرونات', '🍝', '', 3) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'نچرسكو', '', '[{"id": "v_buabu0", "label": "", "price": "70"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'ميكس فراخ', '', '[{"id": "v_e5zs45", "label": "", "price": "80"}]'::jsonb, true, 1);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'لحمه مفرومة', '', '[{"id": "v_b4b7un", "label": "", "price": "80"}]'::jsonb, true, 2);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'سجق', '', '[{"id": "v_g8wsm2", "label": "", "price": "60"}]'::jsonb, true, 3);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'هوت دوج', '', '[{"id": "v_3g2mxt", "label": "", "price": "60"}]'::jsonb, true, 4);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'اسباجتي لحمه', '', '[{"id": "v_ymywql", "label": "", "price": "80"}]'::jsonb, true, 5);
  insert into menu_categories (name, icon, note, sort_order) values ('سندوتشات', '🥙', '', 4) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كفتة', '', '[{"id": "v_j8sm8i", "label": "", "price": "20"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كفتة ضاني', '', '[{"id": "v_g63e2i", "label": "", "price": "30"}]'::jsonb, true, 1);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'طرب', '', '[{"id": "v_r82zi8", "label": "", "price": "40"}]'::jsonb, true, 2);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كبدة', '', '[{"id": "v_j7dina", "label": "", "price": "15"}]'::jsonb, true, 3);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'حواوشي', '', '[{"id": "v_qk8y2y", "label": "", "price": "20"}]'::jsonb, true, 4);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'حواوشي ضاني', '', '[{"id": "v_fd58dn", "label": "", "price": "30"}]'::jsonb, true, 5);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'حواوشي موزريلا', '', '[{"id": "v_98u5yd", "label": "", "price": "25"}]'::jsonb, true, 6);
  insert into menu_categories (name, icon, note, sort_order) values ('إضافات', '➕', '', 5) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'أرز بالكبدة', '', '[{"id": "v_7u0o2u", "label": "", "price": "30"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'أرز عادي', '', '[{"id": "v_uup6iu", "label": "", "price": "15"}]'::jsonb, true, 1);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'طحينة', '', '[{"id": "v_4i0crz", "label": "", "price": "5"}]'::jsonb, true, 2);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'سلطة', '', '[{"id": "v_yanwmu", "label": "", "price": "5"}]'::jsonb, true, 3);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'موزريلا', '', '[{"id": "v_i3k563", "label": "", "price": "15"}]'::jsonb, true, 4);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'بطاطس', '', '[{"id": "v_38d5n3", "label": "", "price": "10"}]'::jsonb, true, 5);
  insert into menu_categories (name, icon, note, sort_order) values ('مشويات', '🔥', 'تُقدَّم مع أرز + طحينة + سلطة + عيش مع جميع الوجبات', 6) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فراخ شيش', '', '[{"id": "v_1upu2j", "label": "كيلو", "price": "300"}, {"id": "v_mv3mr9", "label": "نصف", "price": "150"}, {"id": "v_rqevw4", "label": "ربع", "price": "85"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'فراخ تكا', '', '[{"id": "v_unxp2r", "label": "كيلو", "price": "300"}, {"id": "v_tyo8c4", "label": "نصف", "price": "150"}, {"id": "v_sbfvp8", "label": "ربع", "price": "85"}]'::jsonb, true, 1);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كفتة', '', '[{"id": "v_l0rsuu", "label": "كيلو", "price": "350"}, {"id": "v_12flog", "label": "نصف", "price": "180"}, {"id": "v_g9p2i6", "label": "ربع", "price": "90"}]'::jsonb, true, 2);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كفتة ضاني', '', '[{"id": "v_o9qqf4", "label": "كيلو", "price": "390"}, {"id": "v_i5a5oe", "label": "نصف", "price": "190"}, {"id": "v_lvbplj", "label": "ربع", "price": "100"}]'::jsonb, true, 3);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'طرب', '', '[{"id": "v_9rwbhf", "label": "كيلو", "price": "550"}, {"id": "v_eq6eo1", "label": "نصف", "price": "250"}, {"id": "v_6fj3u2", "label": "ربع", "price": "130"}]'::jsonb, true, 4);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كباب', '', '[{"id": "v_nxaskm", "label": "كيلو", "price": "700"}, {"id": "v_3osco4", "label": "نصف", "price": "350"}, {"id": "v_rqftxt", "label": "ربع", "price": "175"}]'::jsonb, true, 5);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كبدة', '', '[{"id": "v_u1jkk6", "label": "كيلو", "price": "280"}, {"id": "v_l0xbpw", "label": "نصف", "price": "150"}, {"id": "v_i47rig", "label": "ربع", "price": "80"}]'::jsonb, true, 6);
  insert into menu_categories (name, icon, note, sort_order) values ('الوجبات', '🍱', '', 7) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'وجبة الأكيل', '2 قطعة شيش + 2 قطعة طرب + 2 قطعة كفتة + بطاطس + بسمتي', '[{"id": "v_y8j225", "label": "", "price": "200"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'وجبة الملوك', 'ربع فراخ + ربع كفتة + ربع طرب + بطاطس + لتر ببسي', '[{"id": "v_ova3g1", "label": "", "price": "310"}]'::jsonb, true, 1);
  insert into menu_categories (name, icon, note, sort_order) values ('كريب', '🌯', 'جميع أصناف الكريب بجبنة موزريلا', 8) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب بانية', '', '[{"id": "v_dpenpm", "label": "", "price": "50"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب استربس', '', '[{"id": "v_g3wbx4", "label": "", "price": "70"}]'::jsonb, true, 1);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب ميكس فراخ', '', '[{"id": "v_462bga", "label": "", "price": "80"}]'::jsonb, true, 2);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب برجر', '', '[{"id": "v_yxubsn", "label": "", "price": "55"}]'::jsonb, true, 3);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب هوت دوج', '', '[{"id": "v_8ip8ef", "label": "", "price": "55"}]'::jsonb, true, 4);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب ميكس لحوم', '', '[{"id": "v_8mbfpn", "label": "", "price": "80"}]'::jsonb, true, 5);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب بطاطس', '', '[{"id": "v_kwthv9", "label": "", "price": "35"}]'::jsonb, true, 6);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب بانية على بطاطس', '', '[{"id": "v_q8yua0", "label": "", "price": "60"}]'::jsonb, true, 7);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب شاورما فراخ', '', '[{"id": "v_gabrd3", "label": "", "price": "75"}]'::jsonb, true, 8);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب كفتة على الفحم', '', '[{"id": "v_yc24c8", "label": "", "price": "70"}]'::jsonb, true, 9);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب سجق', '', '[{"id": "v_0j9tl2", "label": "", "price": "55"}]'::jsonb, true, 10);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب الملوك', 'استربس + فراخ + بطاطس', '[{"id": "v_54hvj0", "label": "", "price": "90"}]'::jsonb, true, 11);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كريب الوحش', 'فراخ + استربس + بطاطس + هوت دوج', '[{"id": "v_0dewwf", "label": "", "price": "100"}]'::jsonb, true, 12);
  insert into menu_categories (name, icon, note, sort_order) values ('سوري', '🧆', '', 9) returning id into cat_id;
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'كفتة على بطاطس', 'كفتة على الفحم', '[{"id": "v_pxre0g", "label": "", "price": "30"}]'::jsonb, true, 0);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'استربس', '', '[{"id": "v_w4xjf0", "label": "", "price": "40"}]'::jsonb, true, 1);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'بانية', '', '[{"id": "v_zg7y4e", "label": "", "price": "30"}]'::jsonb, true, 2);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'بطاطس', '', '[{"id": "v_klnx8h", "label": "", "price": "10"}]'::jsonb, true, 3);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'بطاطس موزريلا', '', '[{"id": "v_x6fnwk", "label": "", "price": "15"}]'::jsonb, true, 4);
  insert into menu_items (category_id, name, description, variants, available, sort_order) values (cat_id, 'شاورما', '', '[{"id": "v_4nt6yj", "label": "", "price": "40"}]'::jsonb, true, 5);
end $$;
