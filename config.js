/* =====================================================================
   Fill in these two values from your OWN Supabase project, then save.
   Where to find them: Supabase Dashboard → your project → Project
   Settings (gear icon) → Data API.

   - SUPABASE_URL      → "Project URL"          e.g. https://abcduvwxyz.supabase.co
   - SUPABASE_ANON_KEY → "anon" / "public" key   (NOT the "service_role" key)

   This anon key is meant to be public — it is safe to ship inside the
   website's frontend code. It can only do what the Row Level Security
   policies in sql/schema.sql allow (public read, admin-only write).
   NEVER put the "service_role" secret key here or anywhere in this
   frontend — that key bypasses all security rules.
   ===================================================================== */
window.SUPABASE_CONFIG = {
  url: "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE",
  anonKey: "PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE",

  // Name of the public storage bucket created by sql/schema.sql.
  // Only change this if you renamed the bucket.
  storageBucket: "wadi-images"
};
