/* =====================================================================
   Supabase data-access layer.
   Every function here talks to Supabase. Nothing in this file touches
   window.storage or any Claude-artifact API — this is what makes the
   site independent once it's hosted on its own domain.
   ===================================================================== */
(function () {
  "use strict";

  if (!window.supabase) {
    console.error("Supabase JS library did not load. Check your internet connection / the <script> tag in index.html.");
  }

  var cfg = window.SUPABASE_CONFIG || {};
  var placeholder = !cfg.url || cfg.url.indexOf("PASTE_YOUR") === 0 ||
                     !cfg.anonKey || cfg.anonKey.indexOf("PASTE_YOUR") === 0;

  var client = null;
  if (!placeholder && window.supabase) {
    client = window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  function assertReady() {
    if (placeholder) {
      throw new Error("لم يتم إعداد Supabase بعد. افتح js/config.js وضع بيانات مشروعك (URL + anon key).");
    }
  }

  function throwIfError(res) {
    if (res && res.error) throw res.error;
    return res;
  }

  /* ---------------- Auth ---------------- */
  var Auth = {
    isConfigured: function () { return !placeholder; },

    getSession: async function () {
      assertReady();
      var res = await client.auth.getSession();
      throwIfError(res);
      return res.data.session; // null if signed out
    },

    signIn: async function (email, password) {
      assertReady();
      var res = await client.auth.signInWithPassword({ email: email, password: password });
      throwIfError(res);
      return res.data.session;
    },

    signOut: async function () {
      assertReady();
      await client.auth.signOut();
    },

    onChange: function (cb) {
      if (placeholder) return;
      client.auth.onAuthStateChange(function (_event, session) { cb(session); });
    }
  };

  /* ---------------- Settings (single row) ---------------- */
  var Settings = {
    get: async function () {
      assertReady();
      var res = await client.from("restaurant_settings").select("*").eq("id", 1).maybeSingle();
      throwIfError(res);
      return res.data; // null if not seeded yet
    },
    update: async function (patch) {
      assertReady();
      patch.updated_at = new Date().toISOString();
      var res = await client.from("restaurant_settings").update(patch).eq("id", 1).select().single();
      throwIfError(res);
      return res.data;
    }
  };

  /* ---------------- Menu: categories + items ---------------- */
  var Menu = {
    listCategoriesWithItems: async function () {
      assertReady();
      var catRes = await client.from("menu_categories").select("*").order("sort_order", { ascending: true });
      throwIfError(catRes);
      var itemRes = await client.from("menu_items").select("*").order("sort_order", { ascending: true });
      throwIfError(itemRes);
      var itemsByCategory = {};
      (itemRes.data || []).forEach(function (it) {
        (itemsByCategory[it.category_id] = itemsByCategory[it.category_id] || []).push(it);
      });
      return (catRes.data || []).map(function (c) {
        return Object.assign({}, c, { items: itemsByCategory[c.id] || [] });
      });
    },
    createCategory: async function (data, sortOrder) {
      assertReady();
      var res = await client.from("menu_categories").insert(Object.assign({ sort_order: sortOrder || 0 }, data)).select().single();
      throwIfError(res);
      return res.data;
    },
    updateCategory: async function (id, patch) {
      assertReady();
      var res = await client.from("menu_categories").update(patch).eq("id", id).select().single();
      throwIfError(res);
      return res.data;
    },
    deleteCategory: async function (id) {
      assertReady();
      throwIfError(await client.from("menu_categories").delete().eq("id", id));
    },
    createItem: async function (categoryId, data, sortOrder) {
      assertReady();
      var payload = Object.assign({ category_id: categoryId, sort_order: sortOrder || 0 }, data);
      var res = await client.from("menu_items").insert(payload).select().single();
      throwIfError(res);
      return res.data;
    },
    updateItem: async function (id, patch) {
      assertReady();
      var res = await client.from("menu_items").update(patch).eq("id", id).select().single();
      throwIfError(res);
      return res.data;
    },
    deleteItem: async function (id) {
      assertReady();
      throwIfError(await client.from("menu_items").delete().eq("id", id));
    }
  };

  /* ---------------- Gallery ---------------- */
  var Gallery = {
    list: async function () {
      assertReady();
      var res = await client.from("gallery").select("*").order("sort_order", { ascending: true });
      throwIfError(res);
      return res.data || [];
    },
    create: async function (data, sortOrder) {
      assertReady();
      var res = await client.from("gallery").insert(Object.assign({ sort_order: sortOrder || 0 }, data)).select().single();
      throwIfError(res);
      return res.data;
    },
    update: async function (id, patch) {
      assertReady();
      var res = await client.from("gallery").update(patch).eq("id", id).select().single();
      throwIfError(res);
      return res.data;
    },
    remove: async function (id) {
      assertReady();
      throwIfError(await client.from("gallery").delete().eq("id", id));
    }
  };

  /* ---------------- Offers ---------------- */
  var Offers = {
    list: async function () {
      assertReady();
      var res = await client.from("offers").select("*").order("sort_order", { ascending: true });
      throwIfError(res);
      return res.data || [];
    },
    listActive: async function () {
      assertReady();
      var res = await client.from("offers").select("*").eq("active", true).order("sort_order", { ascending: true });
      throwIfError(res);
      return res.data || [];
    },
    create: async function (data, sortOrder) {
      assertReady();
      var res = await client.from("offers").insert(Object.assign({ sort_order: sortOrder || 0 }, data)).select().single();
      throwIfError(res);
      return res.data;
    },
    update: async function (id, patch) {
      assertReady();
      var res = await client.from("offers").update(patch).eq("id", id).select().single();
      throwIfError(res);
      return res.data;
    },
    remove: async function (id) {
      assertReady();
      throwIfError(await client.from("offers").delete().eq("id", id));
    }
  };

  /* ---------------- Opening hours ---------------- */
  var Hours = {
    list: async function () {
      assertReady();
      var res = await client.from("opening_hours").select("*").order("day_of_week", { ascending: true });
      throwIfError(res);
      return res.data || [];
    },
    update: async function (dayOfWeek, patch) {
      assertReady();
      var res = await client.from("opening_hours").update(patch).eq("day_of_week", dayOfWeek).select().single();
      throwIfError(res);
      return res.data;
    }
  };

  /* ---------------- Storage (real image uploads) ---------------- */
  var MAX_IMAGE_BYTES = 15 * 1024 * 1024;

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("تعذر قراءة الملف")); };
      reader.onload = function () { resolve(reader.result); };
      reader.readAsDataURL(file);
    });
  }
  function loadImageEl(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("تعذر فتح الصورة، تأكد أنها ملف صورة سليم")); };
      img.src = src;
    });
  }
  function dataURLtoBlob(dataUrl) {
    var parts = dataUrl.split(",");
    var mime = parts[0].match(/:(.*?);/)[1];
    var bin = atob(parts[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  async function resizeAndCompress(file, maxDim, quality) {
    var dataUrl = await readFileAsDataURL(file);
    var img = await loadImageEl(dataUrl);
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var scale = Math.min(1, maxDim / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, cw, ch);
    try { return canvas.toDataURL("image/jpeg", quality); }
    catch (e) { throw new Error("تعذر ضغط الصورة"); }
  }

  var Storage = {
    // Uploads a compressed copy of `file` under `folder/` and returns the
    // full public URL. Throws with a clear message on any failure.
    uploadImage: async function (file, folder) {
      assertReady();
      if (!file) throw new Error("لم يتم اختيار ملف");
      if (!file.type || file.type.indexOf("image/") !== 0) throw new Error("الملف المختار ليس صورة");
      if (file.size > MAX_IMAGE_BYTES) throw new Error("حجم الصورة كبير جدًا (الحد الأقصى 15 ميجابايت)");

      var maxDim = 1600, quality = 0.82;
      var dataUrl = await resizeAndCompress(file, maxDim, quality);
      var tries = 0;
      while (dataUrl.length > 900000 && tries < 5) {
        quality = Math.max(0.35, quality - 0.15);
        maxDim = Math.max(500, Math.round(maxDim * 0.82));
        dataUrl = await resizeAndCompress(file, maxDim, quality);
        tries++;
      }
      if (dataUrl.length > 4500000) throw new Error("تعذر ضغط الصورة لحجم مناسب للرفع");

      var blob = dataURLtoBlob(dataUrl);
      var ext = "jpg";
      var path = (folder || "misc") + "/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;

      var upRes = await client.storage.from(cfg.storageBucket).upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false
      });
      if (upRes.error) throw new Error("فشل رفع الصورة إلى Storage: " + upRes.error.message);

      var pub = client.storage.from(cfg.storageBucket).getPublicUrl(path);
      if (!pub || !pub.data || !pub.data.publicUrl) throw new Error("تم الرفع لكن تعذر الحصول على رابط الصورة");
      return pub.data.publicUrl;
    },

    // Deletes a previously-uploaded image given its full public URL.
    // Silently ignores URLs that aren't from our bucket (nothing to delete).
    deleteImageByUrl: async function (url) {
      if (!url || typeof url !== "string") return;
      var marker = "/storage/v1/object/public/" + cfg.storageBucket + "/";
      var idx = url.indexOf(marker);
      if (idx === -1) return;
      var path = url.slice(idx + marker.length);
      try { await client.storage.from(cfg.storageBucket).remove([path]); }
      catch (e) { /* already gone or unreachable — ignore */ }
    }
  };

  window.DB = {
    isConfigured: function () { return !placeholder; },
    Auth: Auth,
    Settings: Settings,
    Menu: Menu,
    Gallery: Gallery,
    Offers: Offers,
    Hours: Hours,
    Storage: Storage
  };
})();
