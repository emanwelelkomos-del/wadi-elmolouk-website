(function () {
"use strict";

/* =====================================================================
   In-memory "state" tree — same shape philosophy as the old prototype,
   but every field here is loaded FROM and saved back TO real Supabase
   tables (see js/supabaseClient.js). Nothing here uses window.storage.
   ===================================================================== */

var DAY_NAMES = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

var state = null;          // assembled after loading from Supabase
var session = null;        // Supabase auth session, or null
var view = "site";         // site | admin-login | admin
var activeSection = "home";
var activeMenuCat = null;
var activeGalleryFilter = "الكل";
var adminTab = "hero";
var lightboxItem = null;
var loginError = "";
var loadError = "";
var uploadingTargets = {};
var imageFieldHandlers = {}; // targetPath -> {folder, save: async function(newUrlOrEmpty){...}}

function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

/* ---------- Loading state from Supabase ---------- */
async function loadState(){
  if(!window.DB || !window.DB.isConfigured()){
    loadError = "لم يتم إعداد Supabase بعد. افتح ملف js/config.js وضع رابط ومفتاح مشروعك، ثم أعد تحميل الصفحة.";
    render();
    return;
  }
  try{
    session = await window.DB.Auth.getSession();
    window.DB.Auth.onChange(function(s){ session = s; if(view==="admin" && !s){ view="site"; } render(); });

    var settingsRow = await window.DB.Settings.get();
    var categories = await window.DB.Menu.listCategoriesWithItems();
    var galleryRows = await window.DB.Gallery.list();
    var offerRows = await window.DB.Offers.list();
    var hoursRows = await window.DB.Hours.list();

    state = assembleState(settingsRow, categories, galleryRows, offerRows, hoursRows);
    if(!activeMenuCat && state.menu.categories.length){ activeMenuCat = state.menu.categories[0].id; }
    render();
  }catch(e){
    console.error("load failed", e);
    loadError = "تعذر تحميل بيانات الموقع من Supabase: " + (e && e.message ? e.message : "خطأ غير معروف");
    render();
  }
}

function assembleState(settingsRow, categories, galleryRows, offerRows, hoursRows){
  var s = settingsRow || {};
  return {
    hero:{
      title: s.hero_title || "",
      tagline: s.hero_tagline || "",
      desc: s.hero_desc || "",
      coverImage: s.hero_cover_image || ""
    },
    rating:{ avg: s.rating_avg || "0", count: s.rating_count || "0" },
    whyUs: s.why_us || [],
    reviewThemes: s.review_themes || [],
    contact:{
      phones: s.phones || [],
      address: s.address || "",
      plusCode: s.plus_code || "",
      mapQuery: s.map_query || "",
      directionsUrl: s.directions_url || ""
    },
    hours: hoursRows || [],
    menu:{ categories: (categories||[]).map(function(c){
      return { id:c.id, name:c.name, icon:c.icon, note:c.note, items:(c.items||[]).map(function(it){
        return { id:it.id, name:it.name, desc:it.description, image:it.image_url, variants: it.variants||[], available: it.available };
      })};
    })},
    gallery: (galleryRows||[]).map(function(g){ return { id:g.id, url:g.image_url, caption:g.caption, category:g.category }; }),
    offers: (offerRows||[]).map(function(o){ return { id:o.id, title:o.title, description:o.description, image:o.image_url, active:o.active }; })
  };
}

function showToast(msg){
  var t = document.getElementById("save-toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function(){ t.classList.remove("show"); }, 1600);
}
function toastError(prefix, e){
  console.error(prefix, e);
  showToast(prefix + ": " + (e && e.message ? e.message : "خطأ غير معروف"));
}

function esc(str){
  if(str===undefined || str===null) return "";
  return String(str).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function imgSrc(v){ return v || ""; }
function primaryPhone(){ var phones=(state&&state.contact&&state.contact.phones)||[]; return phones[0]||""; }
function telHref(p){ return "tel:" + String(p||"").replace(/\s+/g,""); }

function getPath(obj, path){
  var parts = path.split(".");
  var cur = obj;
  for(var i=0;i<parts.length;i++){
    var key = parts[i];
    if(Array.isArray(cur)) key = parseInt(key,10);
    if(cur==null) return undefined;
    cur = cur[key];
  }
  return cur;
}
function setPath(obj, path, value){
  var parts = path.split(".");
  var cur = obj;
  for(var i=0;i<parts.length-1;i++){
    var key = parts[i];
    if(Array.isArray(cur)) key = parseInt(key,10);
    cur = cur[key];
  }
  var lastKey = parts[parts.length-1];
  if(Array.isArray(cur)) lastKey = parseInt(lastKey,10);
  cur[lastKey] = value;
}

/* =====================================================================
   Persistence: routes a changed dot-path to the right Supabase table.
   Called on blur/change for text inputs, and immediately after any
   add/remove action.
   ===================================================================== */
async function commitPath(path){
  try{
    var m;
    if(/^hero\.(title|tagline|desc)$/.test(path)){
      m = path.split(".")[1];
      var col = {title:"hero_title", tagline:"hero_tagline", desc:"hero_desc"}[m];
      var patch = {}; patch[col] = state.hero[m];
      await window.DB.Settings.update(patch);
    }
    else if(/^rating\.(avg|count)$/.test(path)){
      m = path.split(".")[1];
      var col2 = {avg:"rating_avg", count:"rating_count"}[m];
      var patch2 = {}; patch2[col2] = state.rating[m];
      await window.DB.Settings.update(patch2);
    }
    else if(/^whyUs\./.test(path)){
      await window.DB.Settings.update({ why_us: state.whyUs });
    }
    else if(/^reviewThemes\./.test(path)){
      await window.DB.Settings.update({ review_themes: state.reviewThemes });
    }
    else if(/^contact\.phones\./.test(path)){
      await window.DB.Settings.update({ phones: state.contact.phones });
    }
    else if(/^contact\.(address|plusCode|mapQuery|directionsUrl)$/.test(path)){
      m = path.split(".")[1];
      var colMap = {address:"address", plusCode:"plus_code", mapQuery:"map_query", directionsUrl:"directions_url"};
      var patch3 = {}; patch3[colMap[m]] = state.contact[m];
      await window.DB.Settings.update(patch3);
    }
    else if(/^hours\.(\d+)\.(open_time|close_time|note|closed)$/.test(path)){
      var hm = path.match(/^hours\.(\d+)\.(open_time|close_time|note|closed)$/);
      var day = parseInt(hm[1],10), field = hm[2];
      var hrow = state.hours[day];
      var patch4 = {}; patch4[field] = hrow[field];
      await window.DB.Hours.update(hrow.day_of_week, patch4);
    }
    else if(/^menu\.categories\.(\d+)\.(name|icon|note)$/.test(path)){
      var cm = path.match(/^menu\.categories\.(\d+)\.(name|icon|note)$/);
      var ci = parseInt(cm[1],10), cfield = cm[2];
      var cat = state.menu.categories[ci];
      var patch5 = {}; patch5[cfield] = cat[cfield];
      await window.DB.Menu.updateCategory(cat.id, patch5);
    }
    else if(/^menu\.categories\.(\d+)\.items\.(\d+)\.(name|desc|available)$/.test(path)){
      var im = path.match(/^menu\.categories\.(\d+)\.items\.(\d+)\.(name|desc|available)$/);
      var ci2 = parseInt(im[1],10), ii2 = parseInt(im[2],10), ifield = im[3];
      var item = state.menu.categories[ci2].items[ii2];
      var dbField = ifield==="desc" ? "description" : ifield;
      var patch6 = {}; patch6[dbField] = item[ifield];
      await window.DB.Menu.updateItem(item.id, patch6);
    }
    else if(/^menu\.categories\.(\d+)\.items\.(\d+)\.variants\./.test(path)){
      var vm = path.match(/^menu\.categories\.(\d+)\.items\.(\d+)\.variants\./);
      var ci3 = parseInt(vm[0].match(/categories\.(\d+)/)[1],10);
      var ii3 = parseInt(vm[0].match(/items\.(\d+)/)[1],10);
      var item2 = state.menu.categories[ci3].items[ii3];
      await window.DB.Menu.updateItem(item2.id, { variants: item2.variants });
    }
    else if(/^gallery\.(\d+)\.(caption|category)$/.test(path)){
      var gm = path.match(/^gallery\.(\d+)\.(caption|category)$/);
      var gi = parseInt(gm[1],10), gfield = gm[2];
      var g = state.gallery[gi];
      var patch7 = {}; patch7[gfield] = g[gfield];
      await window.DB.Gallery.update(g.id, patch7);
    }
    else if(/^offers\.(\d+)\.(title|description|active)$/.test(path)){
      var om = path.match(/^offers\.(\d+)\.(title|description|active)$/);
      var oi = parseInt(om[1],10), ofield = om[2];
      var o = state.offers[oi];
      var patch8 = {}; patch8[ofield] = o[ofield];
      await window.DB.Offers.update(o.id, patch8);
    }
    else{
      console.warn("commitPath: no rule for", path);
      return;
    }
    showToast("تم الحفظ");
  }catch(e){
    toastError("تعذر الحفظ", e);
  }
}

/* =====================================================================
   Image upload wiring
   ===================================================================== */
function registerImageField(targetPath, folder, saveFn){
  imageFieldHandlers[targetPath] = { folder: folder, save: saveFn };
}
async function handleImageUpload(target, file){
  var handler = imageFieldHandlers[target];
  if(!handler){ console.error("no image handler for", target); return; }
  uploadingTargets[target] = true; render();
  var oldVal = getPath(state, target);
  try{
    var url = await window.DB.Storage.uploadImage(file, handler.folder);
    setPath(state, target, url);
    await handler.save(url);
    uploadingTargets[target] = false;
    if(oldVal && oldVal !== url){ window.DB.Storage.deleteImageByUrl(oldVal); }
    showToast("تم رفع الصورة بنجاح");
  }catch(e){
    uploadingTargets[target] = false;
    toastError("تعذر رفع الصورة", e);
  }
  render();
}
async function handleImageRemove(target){
  var handler = imageFieldHandlers[target];
  if(!handler) return;
  var oldVal = getPath(state, target);
  setPath(state, target, "");
  try{
    await handler.save("");
    if(oldVal) window.DB.Storage.deleteImageByUrl(oldVal);
  }catch(e){
    toastError("تعذر حذف الصورة", e);
  }
  render();
}
function renderImageField(targetPath, currentValue, label, folder, saveFn){
  registerImageField(targetPath, folder, saveFn);
  var src = imgSrc(currentValue);
  var isUploading = !!uploadingTargets[targetPath];
  return ''+
    '<div class="field image-field">'+
      (label? '<label>'+esc(label)+'</label>' : '')+
      '<div class="image-uploader">'+
        (isUploading
          ? '<div class="image-placeholder">⏳ جاري الرفع…</div>'
          : (src
              ? '<img class="image-preview" src="'+esc(src)+'" alt="">'
              : '<div class="image-placeholder">🖼️ لا توجد صورة بعد</div>'))+
        '<div class="image-actions">'+
          '<label class="btn btn-outline btn-sm image-upload-btn">'+
            (src? '🔄 تغيير الصورة':'⬆️ رفع صورة')+
            '<input type="file" accept="image/*" class="image-file-input" data-target="'+esc(targetPath)+'" style="display:none;" '+(isUploading?"disabled":"")+'>'+
          '</label>'+
          (src && !isUploading? '<button type="button" class="icon-btn danger btn-sm" data-action="remove-image" data-target="'+esc(targetPath)+'">حذف الصورة</button>':'')+
        '</div>'+
      '</div>'+
    '</div>';
}

/* ---------- SVG decorative bits ---------- */
function heroPatternSVG(){
  var tri = '<path d="M0 40 L20 0 L40 40 Z" stroke="#C9A455" stroke-width="1" fill="none"/>';
  var row = "";
  for(var i=0;i<20;i++){ row += '<g transform="translate('+(i*40)+',0)">'+tri+'</g>'; }
  return '<svg class="hero-pattern" width="100%" height="120" viewBox="0 0 800 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'+row+'</svg>';
}

/* ---------- Render: public site ---------- */
function renderTopNav(){
  return ''+
  '<div class="topnav"><div class="wrap">'+
    '<div class="brand"><svg class="glyph" viewBox="0 0 24 24" fill="none"><path d="M12 2 L20 20 L4 20 Z" stroke="#E6CC93" stroke-width="1.6"/><circle cx="12" cy="14" r="2.2" fill="#E6CC93"/></svg>وادي الملوك</div>'+
    '<div class="navlinks">'+
      '<a href="#home" data-nav="home">الرئيسية</a>'+
      '<a href="#menu" data-nav="menu">المنيو</a>'+
      '<a href="#gallery" data-nav="gallery">المعرض</a>'+
      '<a href="#reviews" data-nav="reviews">الآراء</a>'+
      '<a href="#location" data-nav="location">الموقع</a>'+
    '</div>'+
    '<a class="nav-cta" href="'+esc(telHref(primaryPhone()))+'">📞 اطلب الآن</a>'+
  '</div></div>';
}

function renderHero(){
  var h = state.hero, r = state.rating;
  var coverSrc = imgSrc(h.coverImage);
  return ''+
  '<section class="hero" id="home">'+
    (coverSrc? ('<img class="hero-cover-img" src="'+esc(coverSrc)+'" alt="">'+'<div class="hero-cover-overlay"></div>') : heroPatternSVG())+
    '<div class="wrap hero-inner">'+
      '<div class="badge">⭐ '+esc(r.avg)+' — '+esc(r.count)+'+ تقييم على Google</div>'+
      '<h1>'+esc(h.title)+'</h1>'+
      '<div class="tagline">'+esc(h.tagline)+'</div>'+
      '<p class="desc">'+esc(h.desc)+'</p>'+
      '<div class="hero-actions">'+
        '<a class="btn btn-primary" href="#menu" data-nav="menu">🍽️ تصفح المنيو</a>'+
        '<a class="btn btn-outline" href="'+esc(telHref(primaryPhone()))+'">📞 اطلب الآن</a>'+
      '</div>'+
    '</div>'+
  '</section>';
}

function renderWhyUs(){
  var cards = (state.whyUs||[]).map(function(c){
    return '<div class="why-card"><span class="ic">'+esc(c.icon)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.desc)+'</p></div>';
  }).join("");
  return ''+
  '<section class="section">'+
    '<div class="wrap">'+
      '<div class="section-head"><h2>ليه وادي الملوك؟</h2></div>'+
      '<div class="grid-4">'+cards+'</div>'+
    '</div>'+
  '</section>';
}

function renderOffers(){
  var active = (state.offers||[]).filter(function(o){ return o.active; });
  if(!active.length) return "";
  var cards = active.map(function(o){
    var src = imgSrc(o.image);
    return ''+
    '<div class="why-card" style="padding:0; overflow:hidden;">'+
      (src? '<img src="'+esc(src)+'" alt="" style="width:100%; aspect-ratio:16/9; object-fit:cover;">':'')+
      '<div style="padding:18px 20px;">'+
        '<h3 style="margin:0 0 8px;">'+esc(o.title)+'</h3>'+
        (o.description? '<p style="margin:0; color:var(--cream-dim); font-size:0.92rem; line-height:1.6;">'+esc(o.description)+'</p>':'')+
      '</div>'+
    '</div>';
  }).join("");
  return ''+
  '<section class="section alt" id="offers">'+
    '<div class="wrap">'+
      '<div class="section-head"><h2>عروضنا الحالية</h2></div>'+
      '<div class="grid-4">'+cards+'</div>'+
    '</div>'+
  '</section>';
}

function formatPrice(it){
  var vs = it.variants || [];
  vs = vs.filter(function(v){ return v && (v.label || v.price); });
  if(vs.length===0) return '<span class="price tbd">السعر غير محدد بعد</span>';
  if(vs.length===1 && !vs[0].label){
    return vs[0].price ? '<span class="price">'+esc(vs[0].price)+' ج.م</span>' : '<span class="price tbd">السعر غير محدد بعد</span>';
  }
  var parts = vs.map(function(v){
    var p = v.price ? esc(v.price) : "—";
    return (v.label? '<b>'+esc(v.label)+'</b> ':'') + p;
  });
  return '<span class="price sizes">'+parts.join(' <span class="sep">·</span> ')+' <span class="unit">ج.م</span></span>';
}

function renderMenu(){
  var cats = state.menu.categories;
  if(!activeMenuCat && cats.length) activeMenuCat = cats[0].id;
  var tabs = cats.map(function(c){
    var cls = c.id===activeMenuCat ? "tab active" : "tab";
    return '<button class="'+cls+'" data-menu-tab="'+esc(c.id)+'">'+esc(c.icon)+' '+esc(c.name)+'</button>';
  }).join("");
  var cur = cats.find(function(c){return c.id===activeMenuCat;}) || cats[0];
  var items = (cur? cur.items:[]).map(function(it){
    var priceHtml = formatPrice(it);
    var thumbSrc = imgSrc(it.image);
    return ''+
    '<div class="menu-item'+(it.available===false? " unavailable":"")+'">'+
      '<div class="menu-thumb">'+(thumbSrc? '<img src="'+esc(thumbSrc)+'" alt="">' : (cur.icon||"🍽️"))+'</div>'+
      '<div class="menu-info">'+
        '<div class="name"><h4>'+esc(it.name)+'</h4>'+priceHtml+'</div>'+
        (it.desc? '<p>'+esc(it.desc)+'</p>':'')+
        (it.available===false? '<span class="tag-unavail">غير متاح حاليًا</span>':'')+
      '</div>'+
    '</div>';
  }).join("");
  if(!items) items = '<div class="empty-note">لا توجد أصناف في هذا القسم بعد. يمكن إضافتها من لوحة التحكم.</div>';
  return ''+
  '<section class="section alt" id="menu">'+
    '<div class="wrap">'+
      '<div class="section-head"><h2>المنيو</h2><p>تصفح أصنافنا حسب القسم</p></div>'+
      (cats.length? '<div class="tabs">'+tabs+'</div>' : '<div class="empty-note">لا توجد أقسام بعد.</div>')+
      (cur && cur.note ? '<p class="muted" style="text-align:center;margin:-10px 0 20px;">ℹ️ '+esc(cur.note)+'</p>' : '')+
      (cats.length? '<div class="menu-list">'+items+'</div>' : '')+
    '</div>'+
  '</section>';
}

function galleryCategories(){
  var set = {};
  state.gallery.forEach(function(g){ if(g.category) set[g.category]=true; });
  return ["الكل"].concat(Object.keys(set));
}

function renderGallery(){
  var cats = galleryCategories();
  var filters = cats.map(function(c){
    var cls = c===activeGalleryFilter ? "tab active" : "tab";
    return '<button class="'+cls+'" data-gallery-filter="'+esc(c)+'">'+esc(c)+'</button>';
  }).join("");
  var list = state.gallery.filter(function(g){ return activeGalleryFilter==="الكل" || g.category===activeGalleryFilter; });
  var tiles = list.map(function(g){
    var src = imgSrc(g.url);
    if(!src){ return '<div class="g-tile"><span class="g-empty">⏳</span></div>'; }
    return '<div class="g-tile" data-lightbox="'+esc(g.id)+'">'+
      '<img src="'+esc(src)+'" alt="'+esc(g.caption||"")+'" loading="lazy">'+
      (g.caption? '<span class="cap">'+esc(g.caption)+'</span>':'')+
    '</div>';
  }).join("");
  return ''+
  '<section class="section" id="gallery">'+
    '<div class="wrap">'+
      '<div class="section-head"><h2>المعرض</h2><p>لمحة من المكان والأطباق</p></div>'+
      (cats.length>1? '<div class="gallery-filters">'+filters+'</div>':'')+
      '<div class="g-grid">'+tiles+'</div>'+
      (list.length===0? '<p class="muted" style="text-align:center;margin-top:16px;">سيتم إضافة صور حقيقية للمطعم قريبًا عبر لوحة التحكم.</p>':'')+
    '</div>'+
  '</section>';
}

function renderReviews(){
  var r = state.rating;
  var cards = (state.reviewThemes||[]).map(function(rv){
    var label = rv.type==="positive" ? "نقطة إيجابية متكررة" : "ملاحظة تستحق المتابعة";
    return '<div class="review-card '+esc(rv.type)+'"><span class="kind">'+label+'</span><p>'+esc(rv.text)+'</p></div>';
  }).join("");
  if(!cards) cards = '<div class="empty-note">لا توجد ملاحظات مضافة بعد.</div>';
  return ''+
  '<section class="section alt" id="reviews">'+
    '<div class="wrap">'+
      '<div class="section-head"><h2>آراء عملائنا</h2></div>'+
      '<div class="rating-hero"><div class="num">'+esc(r.avg)+' / 5</div><div class="stars">★★★★★</div><div class="count">'+esc(r.count)+' مراجعة على Google</div></div>'+
      '<div class="review-cards">'+cards+'</div>'+
    '</div>'+
  '</section>';
}

function renderLocation(){
  var c = state.contact;
  var mapQ = encodeURIComponent(c.mapQuery || c.address || "");
  var dirUrl = c.directionsUrl || ("https://www.google.com/maps/dir/?api=1&destination="+mapQ);
  return ''+
  '<section class="section" id="location">'+
    '<div class="wrap">'+
      '<div class="section-head"><h2>زورنا في وادي الملوك</h2></div>'+
      '<div class="loc-grid">'+
        '<div class="map-frame"><iframe src="https://www.google.com/maps?q='+mapQ+'&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>'+
        '<div class="loc-info">'+
          '<h3>📍 العنوان</h3>'+
          '<p>'+esc(c.address)+'</p>'+
          (c.plusCode? '<p class="plus-code">الموقع مدرج أيضًا بالرمز '+esc(c.plusCode)+' في بعض المصادر.</p>':'')+
          '<a class="btn btn-primary" style="margin-top:16px;" target="_blank" rel="noopener" href="'+esc(dirUrl)+'">🧭 افتح الاتجاهات</a>'+
        '</div>'+
      '</div>'+
    '</div>'+
  '</section>';
}

function formatHoursSummary(hours){
  if(!hours || !hours.length) return "";
  var first = hours[0];
  var allSame = hours.every(function(h){ return h.open_time===first.open_time && h.close_time===first.close_time && h.closed===first.closed; });
  function fmt(h){ return h.closed ? "مغلق" : (h.open_time+" – "+h.close_time); }
  if(allSame) return "يوميًا: "+fmt(first);
  return hours.map(function(h){ return DAY_NAMES[h.day_of_week]+": "+fmt(h); }).join(" · ");
}

function renderContact(){
  var c = state.contact;
  var phones = c.phones || [];
  var telClean = function(p){ return p.replace(/\s+/g,""); };
  var phoneButtons = phones.map(function(p, i){
    var cls = i===0 ? "btn btn-primary" : "btn btn-outline";
    return '<a class="'+cls+'" href="tel:'+esc(telClean(p))+'" style="direction:ltr;">📞 '+esc(p)+'</a>';
  }).join("");
  return ''+
  '<section class="section alt" id="contact">'+
    '<div class="wrap">'+
      '<div class="contact-box">'+
        '<h2>جعان؟ إحنا جاهزين 😋</h2>'+
        (phones[0]? '<span class="phone">'+esc(phones[0])+'</span>' : '')+
        '<div class="hero-actions" style="margin-top:6px;">'+phoneButtons+'</div>'+
        '<div class="hours-line">🕐 '+esc(formatHoursSummary(state.hours))+'</div>'+
      '</div>'+
    '</div>'+
  '</section>';
}

function renderFooter(){
  return ''+
  '<footer>'+
    '<div class="wrap">'+
      '<div class="foot-links">'+
        '<a href="#home" data-nav="home">الرئيسية</a>'+
        '<a href="#menu" data-nav="menu">المنيو</a>'+
        '<a href="#location" data-nav="location">الموقع</a>'+
        '<button data-action="open-admin-login">لوحة تحكم المطعم</button>'+
      '</div>'+
      '<div class="copy">© '+new Date().getFullYear()+' مطعم وكافيه وادي الملوك — سمسطا، بني سويف</div>'+
    '</div>'+
  '</footer>';
}

function renderBottomNav(){
  function item(id, icon, label, extraHref){
    var active = activeSection===id ? " active":"";
    if(extraHref){ return '<a class="bn-item'+active+'" href="'+extraHref+'"><span class="ic">'+icon+'</span>'+label+'</a>'; }
    return '<a class="bn-item'+active+'" href="#'+id+'" data-nav="'+id+'"><span class="ic">'+icon+'</span>'+label+'</a>';
  }
  return ''+
  '<nav class="bottomnav">'+
    item("home","🏠","الرئيسية")+
    item("menu","📖","المنيو")+
    item("contact-call","📞","اتصال",telHref(primaryPhone()))+
    item("location","📍","الموقع")+
  '</nav>';
}

function renderLightbox(){
  if(!lightboxItem) return "";
  var g = state.gallery.find(function(x){return x.id===lightboxItem;});
  if(!g) return "";
  return ''+
  '<div class="lightbox" data-action="close-lightbox">'+
    '<button class="lb-close" data-action="close-lightbox">✕</button>'+
    '<img src="'+esc(imgSrc(g.url))+'" alt="'+esc(g.caption||"")+'">'+
    (g.caption? '<div class="lb-cap">'+esc(g.caption)+'</div>':'')+
  '</div>';
}

function renderSite(){
  return ''+
  renderTopNav()+
  renderHero()+
  renderWhyUs()+
  renderOffers()+
  renderMenu()+
  renderGallery()+
  renderReviews()+
  renderLocation()+
  renderContact()+
  renderFooter()+
  renderBottomNav()+
  renderLightbox()+
  '<div class="save-toast" id="save-toast"></div>';
}

/* ---------- Render: admin login (Supabase Auth email + password) ---------- */
function renderAdminLogin(){
  return ''+
  '<div class="modal-backdrop" data-action="close-admin-login">'+
    '<div class="modal" data-stop>'+
      '<h3>لوحة تحكم المطعم</h3>'+
      '<p>سجّل الدخول بحساب المدير الذي أنشأته في Supabase Authentication.</p>'+
      '<div class="err-msg">'+esc(loginError)+'</div>'+
      '<form id="admin-login-form">'+
        '<div class="field"><label>البريد الإلكتروني</label><input type="email" id="admin-email-input" autofocus required></div>'+
        '<div class="field"><label>كلمة المرور</label><input type="password" id="admin-pass-input" required></div>'+
        '<button class="btn btn-primary btn-block" type="submit">دخول</button>'+
      '</form>'+
    '</div>'+
  '</div>';
}

/* ---------- Render: admin panel ---------- */
function adminTabs(){
  var tabs = [
    ["hero","الرئيسية"],
    ["menu","المنيو"],
    ["gallery","المعرض"],
    ["offers","العروض"],
    ["hours","مواعيد العمل"],
    ["reviews","الآراء"],
    ["contact","معلومات التواصل"],
    ["security","الأمان"]
  ];
  return tabs.map(function(t){
    var cls = t[0]===adminTab ? "admin-tab active":"admin-tab";
    return '<button class="'+cls+'" data-admin-tab="'+t[0]+'">'+t[1]+'</button>';
  }).join("");
}

function renderAdminHero(){
  var h = state.hero, r = state.rating;
  return ''+
  '<div class="admin-card">'+
    '<div class="admin-card-head"><h4>نص الصفحة الرئيسية</h4></div>'+
    '<div class="field"><label>العنوان الرئيسي</label><input data-bind="hero.title" value="'+esc(h.title)+'"></div>'+
    '<div class="field"><label>الشعار الفرعي</label><input data-bind="hero.tagline" value="'+esc(h.tagline)+'"></div>'+
    '<div class="field"><label>الوصف</label><input data-bind="hero.desc" value="'+esc(h.desc)+'"></div>'+
    renderImageField("hero.coverImage", h.coverImage, "صورة غلاف الواجهة الرئيسية (اختياري)", "hero", async function(url){
      await window.DB.Settings.update({ hero_cover_image: url });
    })+
    '<div class="row-2">'+
      '<div class="field"><label>متوسط التقييم</label><input data-bind="rating.avg" value="'+esc(r.avg)+'"></div>'+
      '<div class="field"><label>عدد التقييمات</label><input data-bind="rating.count" value="'+esc(r.count)+'"></div>'+
    '</div>'+
  '</div>'+
  '<div class="admin-card">'+
    '<div class="admin-card-head"><h4>قسم "ليه وادي الملوك؟"</h4></div>'+
    (state.whyUs||[]).map(function(c,i){
      return '<div class="row-2" style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid var(--line);">'+
        '<div class="field"><label>الأيقونة والعنوان</label><div style="display:flex; gap:8px;"><input style="width:64px;" data-bind="whyUs.'+i+'.icon" value="'+esc(c.icon)+'"><input data-bind="whyUs.'+i+'.title" value="'+esc(c.title)+'"></div></div>'+
        '<div class="field"><label>الوصف</label><input data-bind="whyUs.'+i+'.desc" value="'+esc(c.desc)+'"></div>'+
      '</div>';
    }).join("")+
  '</div>';
}

function renderAdminMenu(){
  var cats = state.menu.categories;
  var catsHtml = cats.map(function(c, ci){
    var itemsHtml = c.items.map(function(it, ii){
      var variantsHtml = (it.variants||[]).map(function(v, vi){
        return '<div style="display:flex; gap:8px; margin-bottom:8px; align-items:center;">'+
          '<input style="width:80px;" placeholder="الحجم (اختياري)" data-bind="menu.categories.'+ci+'.items.'+ii+'.variants.'+vi+'.label" value="'+esc(v.label)+'">'+
          '<input style="width:100px;" placeholder="السعر" data-bind="menu.categories.'+ci+'.items.'+ii+'.variants.'+vi+'.price" value="'+esc(v.price)+'">'+
          '<button class="icon-btn danger" data-action="del-variant" data-cat="'+ci+'" data-item="'+ii+'" data-variant="'+vi+'">✕</button>'+
        '</div>';
      }).join("");
      return ''+
      '<div class="admin-card" style="background:rgba(0,0,0,0.15);">'+
        '<div class="admin-card-head"><h4>'+esc(it.name||"صنف جديد")+'</h4>'+
          '<button class="icon-btn danger" data-action="del-item" data-cat="'+ci+'" data-item="'+ii+'">حذف 🗑️</button></div>'+
        '<div class="field"><label>اسم الصنف</label><input data-bind="menu.categories.'+ci+'.items.'+ii+'.name" value="'+esc(it.name)+'"></div>'+
        '<div class="field"><label>الوصف (اختياري)</label><input data-bind="menu.categories.'+ci+'.items.'+ii+'.desc" value="'+esc(it.desc)+'"></div>'+
        '<div class="field"><label>الأسعار حسب الحجم</label>'+variantsHtml+
          '<button class="icon-btn" data-action="add-variant" data-cat="'+ci+'" data-item="'+ii+'">+ حجم/سعر جديد</button>'+
        '</div>'+
        renderImageField("menu.categories."+ci+".items."+ii+".image", it.image, "صورة الصنف (اختياري)", "menu", (function(itemRef){
          return async function(url){ await window.DB.Menu.updateItem(itemRef.id, { image_url: url }); };
        })(it))+
        '<label style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--cream-dim);">'+
          '<input type="checkbox" data-bind-check="menu.categories.'+ci+'.items.'+ii+'.available" '+(it.available!==false?"checked":"")+' style="width:auto;"> متاح حاليًا'+
        '</label>'+
      '</div>';
    }).join("");
    return ''+
    '<div class="admin-card">'+
      '<div class="admin-card-head">'+
        '<div style="display:flex; gap:8px; align-items:center;">'+
          '<input style="width:50px; background:var(--black); border:1px solid var(--line); color:var(--cream); border-radius:6px; padding:6px;" data-bind="menu.categories.'+ci+'.icon" value="'+esc(c.icon)+'">'+
          '<input style="background:var(--black); border:1px solid var(--line); color:var(--cream); border-radius:6px; padding:6px 10px;" data-bind="menu.categories.'+ci+'.name" value="'+esc(c.name)+'">'+
        '</div>'+
        '<div style="display:flex; gap:8px;">'+
          '<button class="icon-btn" data-action="add-item" data-cat="'+ci+'">+ صنف</button>'+
          '<button class="icon-btn danger" data-action="del-cat" data-cat="'+ci+'">حذف القسم</button>'+
        '</div>'+
      '</div>'+
      '<div class="field"><label>ملاحظة عامة للقسم (تظهر للزائر، اختياري)</label><input data-bind="menu.categories.'+ci+'.note" value="'+esc(c.note||"")+'" placeholder="مثال: إضافة شرقي +15 جنيه"></div>'+
      itemsHtml+
    '</div>';
  }).join("");
  return ''+
  '<div class="toolbar"><button class="btn btn-outline" data-action="add-cat">+ إضافة قسم جديد</button></div>'+
  catsHtml;
}

function renderAdminGallery(){
  var items = state.gallery.map(function(g, i){
    return ''+
    '<div class="admin-card">'+
      '<div class="admin-card-head"><h4>صورة #'+(i+1)+'</h4><button class="icon-btn danger" data-action="del-gallery" data-idx="'+i+'">حذف 🗑️</button></div>'+
      renderImageField("gallery."+i+".url", g.url, "صورة المعرض", "gallery", (function(gRef){
        return async function(url){ await window.DB.Gallery.update(gRef.id, { image_url: url }); };
      })(g))+
      '<div class="field"><label>التصنيف</label><input data-bind="gallery.'+i+'.category" value="'+esc(g.category||"")+'" placeholder="الأكل / المكان / المشروبات / الأجواء"></div>'+
      '<div class="field"><label>وصف مختصر</label><input data-bind="gallery.'+i+'.caption" value="'+esc(g.caption||"")+'"></div>'+
    '</div>';
  }).join("");
  return ''+
  '<p class="muted" style="margin-bottom:14px;">ارفع صور حقيقية للمطعم فقط — تجنب استخدام صور تجريبية غير حقيقية على أنها صور فعلية للمكان.</p>'+
  '<div class="toolbar"><button class="btn btn-outline" data-action="add-gallery">+ إضافة صورة</button></div>'+
  (items || '<div class="empty-note">لا توجد صور بعد.</div>');
}

function renderAdminOffers(){
  var items = state.offers.map(function(o, i){
    return ''+
    '<div class="admin-card">'+
      '<div class="admin-card-head"><h4>'+esc(o.title||"عرض جديد")+'</h4><button class="icon-btn danger" data-action="del-offer" data-idx="'+i+'">حذف 🗑️</button></div>'+
      '<div class="field"><label>عنوان العرض</label><input data-bind="offers.'+i+'.title" value="'+esc(o.title)+'"></div>'+
      '<div class="field"><label>الوصف</label><input data-bind="offers.'+i+'.description" value="'+esc(o.description||"")+'"></div>'+
      renderImageField("offers."+i+".image", o.image, "صورة العرض", "offers", (function(oRef){
        return async function(url){ await window.DB.Offers.update(oRef.id, { image_url: url }); };
      })(o))+
      '<label style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--cream-dim);">'+
        '<input type="checkbox" data-bind-check="offers.'+i+'.active" '+(o.active!==false?"checked":"")+' style="width:auto;"> مفعّل ويظهر في الموقع'+
      '</label>'+
    '</div>';
  }).join("");
  return ''+
  '<div class="toolbar"><button class="btn btn-outline" data-action="add-offer">+ إضافة عرض</button></div>'+
  (items || '<div class="empty-note">لا توجد عروض بعد.</div>');
}

function renderAdminHours(){
  var rows = state.hours.map(function(h, i){
    return ''+
    '<div class="row-2" style="align-items:end; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--line);">'+
      '<div class="field"><label>'+DAY_NAMES[h.day_of_week]+'</label>'+
        '<label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--cream-dim); margin-bottom:8px;">'+
          '<input type="checkbox" data-bind-check="hours.'+i+'.closed" '+(h.closed?"checked":"")+' style="width:auto;"> مغلق هذا اليوم'+
        '</label>'+
      '</div>'+
      '<div class="field" style="display:flex; gap:8px;">'+
        '<div style="flex:1;"><label>من</label><input type="time" data-bind="hours.'+i+'.open_time" value="'+esc(h.open_time)+'"></div>'+
        '<div style="flex:1;"><label>إلى</label><input type="time" data-bind="hours.'+i+'.close_time" value="'+esc(h.close_time)+'"></div>'+
      '</div>'+
    '</div>';
  }).join("");
  return '<div class="admin-card"><div class="admin-card-head"><h4>مواعيد العمل لكل يوم</h4></div>'+rows+'</div>';
}

function renderAdminReviews(){
  var items = (state.reviewThemes||[]).map(function(r, i){
    return ''+
    '<div class="admin-card">'+
      '<div class="admin-card-head"><h4>ملاحظة #'+(i+1)+'</h4><button class="icon-btn danger" data-action="del-review" data-idx="'+i+'">حذف 🗑️</button></div>'+
      '<div class="field"><label>النوع</label><select data-bind="reviewThemes.'+i+'.type"><option value="positive"'+(r.type==="positive"?" selected":"")+'>إيجابية</option><option value="mixed"'+(r.type==="mixed"?" selected":"")+'>تستحق المتابعة</option></select></div>'+
      '<div class="field"><label>النص</label><textarea data-bind="reviewThemes.'+i+'.text">'+esc(r.text)+'</textarea></div>'+
    '</div>';
  }).join("");
  return ''+
  '<p class="muted" style="margin-bottom:14px;">يفضّل عرض ملخص صادق للآراء (إيجابي وسلبي) بدل اقتباسات مختلقة.</p>'+
  '<div class="toolbar"><button class="btn btn-outline" data-action="add-review">+ إضافة ملاحظة</button></div>'+
  (items || '<div class="empty-note">لا توجد ملاحظات بعد.</div>');
}

function renderAdminContact(){
  var c = state.contact;
  var phonesHtml = (c.phones||[]).map(function(p,i){
    return '<div style="display:flex; gap:8px; margin-bottom:10px;">'+
      '<input style="flex:1;" data-bind="contact.phones.'+i+'" value="'+esc(p)+'">'+
      '<button class="icon-btn danger" data-action="del-phone" data-idx="'+i+'">حذف</button>'+
    '</div>';
  }).join("");
  return ''+
  '<div class="admin-card">'+
    '<div class="admin-card-head"><h4>أرقام الهاتف</h4><button class="icon-btn" data-action="add-phone">+ رقم</button></div>'+
    (phonesHtml || '<p class="muted">لا توجد أرقام مضافة.</p>')+
    '<p class="muted">أول رقم في القائمة هو الرقم الرئيسي الظاهر في زر "اطلب الآن".</p>'+
  '</div>'+
  '<div class="admin-card">'+
    '<div class="field"><label>العنوان</label><input data-bind="contact.address" value="'+esc(c.address)+'"></div>'+
    '<div class="field"><label>Plus Code (اختياري)</label><input data-bind="contact.plusCode" value="'+esc(c.plusCode||"")+'"></div>'+
    '<div class="field"><label>نص البحث على الخريطة (لعرض الخريطة المضمّنة)</label><input data-bind="contact.mapQuery" value="'+esc(c.mapQuery)+'"></div>'+
    '<div class="field"><label>رابط Google Maps المباشر (لزر "افتح الاتجاهات")</label><input data-bind="contact.directionsUrl" value="'+esc(c.directionsUrl||"")+'"></div>'+
  '</div>';
}

function renderAdminSecurity(){
  var email = session && session.user ? session.user.email : "";
  return ''+
  '<div class="admin-card">'+
    '<div class="admin-card-head"><h4>الجلسة الحالية</h4></div>'+
    '<p class="muted">مسجّل الدخول باسم: <b style="color:var(--cream);">'+esc(email)+'</b></p>'+
    '<button class="btn btn-outline" data-action="sign-out">تسجيل الخروج</button>'+
  '</div>'+
  '<div class="admin-card">'+
    '<div class="admin-card-head"><h4>تغيير كلمة المرور</h4></div>'+
    '<p class="muted">كلمة مرور المدير محفوظة في Supabase Authentication وليست في كود الموقع. لتغييرها: افتح Supabase Dashboard ← Authentication ← Users ← اختر الحساب ← Reset password، أو أرسل رابط إعادة تعيين لبريدك.</p>'+
  '</div>';
}

function renderAdmin(){
  var body = "";
  if(adminTab==="hero") body = renderAdminHero();
  else if(adminTab==="menu") body = renderAdminMenu();
  else if(adminTab==="gallery") body = renderAdminGallery();
  else if(adminTab==="offers") body = renderAdminOffers();
  else if(adminTab==="hours") body = renderAdminHours();
  else if(adminTab==="reviews") body = renderAdminReviews();
  else if(adminTab==="contact") body = renderAdminContact();
  else if(adminTab==="security") body = renderAdminSecurity();

  return ''+
  '<div class="admin-shell">'+
    '<div class="admin-top"><div class="wrap">'+
      '<div class="brand" style="color:#E6CC93;">لوحة تحكم — وادي الملوك</div>'+
      '<div><button class="btn btn-outline" data-action="exit-admin">↩ الخروج للموقع</button></div>'+
    '</div>'+
    '<div class="wrap"><div class="admin-tabs">'+adminTabs()+'</div></div>'+
    '</div>'+
    '<div class="wrap admin-panel">'+body+'</div>'+
  '</div>'+
  '<div class="save-toast" id="save-toast"></div>';
}

/* ---------- Master render ---------- */
function render(){
  var app = document.getElementById("app");
  imageFieldHandlers = {};

  if(loadError && !state){
    app.innerHTML = '<div class="loading-screen" style="flex-direction:column; gap:14px; text-align:center; padding:20px;">'+
      '<div>⚠️ '+esc(loadError)+'</div>'+
      '</div>';
    return;
  }
  if(!state){ app.innerHTML = '<div class="loading-screen">جارِ تحميل الموقع…</div>'; return; }

  if(view==="admin" && !session){ view = "site"; }

  if(view==="admin"){
    app.innerHTML = renderAdmin();
  }else{
    app.innerHTML = renderSite() + (view==="admin-login" ? renderAdminLogin() : "");
  }
  attachEvents();
}

/* ---------- Events ---------- */
function attachEvents(){
  var app = document.getElementById("app");

  app.querySelectorAll("[data-nav]").forEach(function(el){
    el.addEventListener("click", function(){ activeSection = el.getAttribute("data-nav"); });
  });

  app.querySelectorAll("[data-menu-tab]").forEach(function(el){
    el.addEventListener("click", function(){ activeMenuCat = el.getAttribute("data-menu-tab"); render(); });
  });

  app.querySelectorAll("[data-gallery-filter]").forEach(function(el){
    el.addEventListener("click", function(){ activeGalleryFilter = el.getAttribute("data-gallery-filter"); render(); });
  });

  app.querySelectorAll("[data-lightbox]").forEach(function(el){
    el.addEventListener("click", function(){ lightboxItem = el.getAttribute("data-lightbox"); render(); });
  });
  app.querySelectorAll("[data-action='close-lightbox']").forEach(function(el){
    el.addEventListener("click", function(e){
      if(e.target.hasAttribute("data-stop")) return;
      lightboxItem = null; render();
    });
  });

  var openLoginBtn = app.querySelector("[data-action='open-admin-login']");
  if(openLoginBtn){
    openLoginBtn.addEventListener("click", function(){
      if(session){ view = "admin"; adminTab = "hero"; }
      else{ view = "admin-login"; loginError = ""; }
      render();
    });
  }
  app.querySelectorAll("[data-action='close-admin-login']").forEach(function(el){
    el.addEventListener("click", function(e){
      if(e.target.closest("[data-stop]")) return;
      view = "site"; render();
    });
  });
  var stopEl = app.querySelector(".modal[data-stop]");
  if(stopEl){ stopEl.addEventListener("click", function(e){ e.stopPropagation(); }); }

  var loginForm = document.getElementById("admin-login-form");
  if(loginForm){
    loginForm.addEventListener("submit", async function(e){
      e.preventDefault();
      var email = document.getElementById("admin-email-input").value.trim();
      var pass = document.getElementById("admin-pass-input").value;
      loginError = "";
      try{
        session = await window.DB.Auth.signIn(email, pass);
        view = "admin"; adminTab = "hero";
      }catch(err){
        loginError = "بيانات الدخول غير صحيحة، أو الحساب غير موجود في Supabase Authentication.";
      }
      render();
    });
  }

  var exitBtn = app.querySelector("[data-action='exit-admin']");
  if(exitBtn){ exitBtn.addEventListener("click", function(){ view="site"; render(); }); }

  var signOutBtn = app.querySelector("[data-action='sign-out']");
  if(signOutBtn){
    signOutBtn.addEventListener("click", async function(){
      await window.DB.Auth.signOut();
      session = null; view = "site"; render();
    });
  }

  app.querySelectorAll("[data-admin-tab]").forEach(function(el){
    el.addEventListener("click", function(){ adminTab = el.getAttribute("data-admin-tab"); render(); });
  });

  // text/textarea/select bindings -> local update on input, commit on blur/change
  app.querySelectorAll("[data-bind]").forEach(function(el){
    var path = el.getAttribute("data-bind");
    var evt = (el.tagName==="SELECT") ? "change" : "input";
    el.addEventListener(evt, function(){ setPath(state, path, el.value); });
    el.addEventListener("blur", function(){ commitPath(path); });
    if(el.tagName==="SELECT"){ el.addEventListener("change", function(){ commitPath(path); }); }
  });
  app.querySelectorAll("[data-bind-check]").forEach(function(el){
    var path = el.getAttribute("data-bind-check");
    el.addEventListener("change", function(){ setPath(state, path, el.checked); commitPath(path); });
  });

  // menu category / item / variant add-remove
  var addCatBtn = app.querySelector("[data-action='add-cat']");
  if(addCatBtn){
    addCatBtn.addEventListener("click", async function(){
      try{
        var row = await window.DB.Menu.createCategory({ name:"قسم جديد", icon:"🍽️", note:"" }, state.menu.categories.length);
        state.menu.categories.push({ id:row.id, name:row.name, icon:row.icon, note:row.note, items:[] });
        render();
      }catch(err){ toastError("تعذر إضافة القسم", err); }
    });
  }
  app.querySelectorAll("[data-action='del-cat']").forEach(function(el){
    el.addEventListener("click", async function(){
      var ci = parseInt(el.getAttribute("data-cat"),10);
      if(!confirm("هل تريد حذف هذا القسم وكل أصنافه؟")) return;
      try{
        await window.DB.Menu.deleteCategory(state.menu.categories[ci].id);
        state.menu.categories.splice(ci,1);
        if(state.menu.categories.length) activeMenuCat = state.menu.categories[0].id;
        render();
      }catch(err){ toastError("تعذر حذف القسم", err); }
    });
  });
  app.querySelectorAll("[data-action='add-item']").forEach(function(el){
    el.addEventListener("click", async function(){
      var ci = parseInt(el.getAttribute("data-cat"),10);
      var cat = state.menu.categories[ci];
      try{
        var row = await window.DB.Menu.createItem(cat.id, { name:"صنف جديد", description:"", variants:[{label:"",price:""}], available:true }, cat.items.length);
        cat.items.push({ id:row.id, name:row.name, desc:row.description, image:row.image_url, variants:row.variants, available:row.available });
        render();
      }catch(err){ toastError("تعذر إضافة الصنف", err); }
    });
  });
  app.querySelectorAll("[data-action='del-item']").forEach(function(el){
    el.addEventListener("click", async function(){
      var ci = parseInt(el.getAttribute("data-cat"),10), ii = parseInt(el.getAttribute("data-item"),10);
      var it = state.menu.categories[ci].items[ii];
      try{
        await window.DB.Menu.deleteItem(it.id);
        state.menu.categories[ci].items.splice(ii,1);
        render();
      }catch(err){ toastError("تعذر حذف الصنف", err); }
    });
  });
  app.querySelectorAll("[data-action='add-variant']").forEach(function(el){
    el.addEventListener("click", async function(){
      var ci = parseInt(el.getAttribute("data-cat"),10), ii = parseInt(el.getAttribute("data-item"),10);
      var it = state.menu.categories[ci].items[ii];
      it.variants.push({label:"", price:""});
      try{ await window.DB.Menu.updateItem(it.id, { variants: it.variants }); render(); }
      catch(err){ toastError("تعذر الإضافة", err); }
    });
  });
  app.querySelectorAll("[data-action='del-variant']").forEach(function(el){
    el.addEventListener("click", async function(){
      var ci = parseInt(el.getAttribute("data-cat"),10), ii = parseInt(el.getAttribute("data-item"),10), vi = parseInt(el.getAttribute("data-variant"),10);
      var it = state.menu.categories[ci].items[ii];
      it.variants.splice(vi,1);
      try{ await window.DB.Menu.updateItem(it.id, { variants: it.variants }); render(); }
      catch(err){ toastError("تعذر الحذف", err); }
    });
  });

  // phones
  var addPhoneBtn = app.querySelector("[data-action='add-phone']");
  if(addPhoneBtn){
    addPhoneBtn.addEventListener("click", async function(){
      state.contact.phones.push("");
      try{ await window.DB.Settings.update({ phones: state.contact.phones }); render(); }
      catch(err){ toastError("تعذر الإضافة", err); }
    });
  }
  app.querySelectorAll("[data-action='del-phone']").forEach(function(el){
    el.addEventListener("click", async function(){
      var idx = parseInt(el.getAttribute("data-idx"),10);
      state.contact.phones.splice(idx,1);
      try{ await window.DB.Settings.update({ phones: state.contact.phones }); render(); }
      catch(err){ toastError("تعذر الحذف", err); }
    });
  });

  // gallery
  var addGalleryBtn = app.querySelector("[data-action='add-gallery']");
  if(addGalleryBtn){
    addGalleryBtn.addEventListener("click", async function(){
      try{
        var row = await window.DB.Gallery.create({ image_url:"", caption:"", category:"" }, state.gallery.length);
        state.gallery.push({ id:row.id, url:row.image_url, caption:row.caption, category:row.category });
        render();
      }catch(err){ toastError("تعذر إضافة الصورة", err); }
    });
  }
  app.querySelectorAll("[data-action='del-gallery']").forEach(function(el){
    el.addEventListener("click", async function(){
      var idx = parseInt(el.getAttribute("data-idx"),10);
      var g = state.gallery[idx];
      try{
        await window.DB.Gallery.remove(g.id);
        if(g.url) window.DB.Storage.deleteImageByUrl(g.url);
        state.gallery.splice(idx,1);
        render();
      }catch(err){ toastError("تعذر الحذف", err); }
    });
  });

  // offers
  var addOfferBtn = app.querySelector("[data-action='add-offer']");
  if(addOfferBtn){
    addOfferBtn.addEventListener("click", async function(){
      try{
        var row = await window.DB.Offers.create({ title:"عرض جديد", description:"", image_url:"", active:true }, state.offers.length);
        state.offers.push({ id:row.id, title:row.title, description:row.description, image:row.image_url, active:row.active });
        render();
      }catch(err){ toastError("تعذر إضافة العرض", err); }
    });
  }
  app.querySelectorAll("[data-action='del-offer']").forEach(function(el){
    el.addEventListener("click", async function(){
      var idx = parseInt(el.getAttribute("data-idx"),10);
      var o = state.offers[idx];
      try{
        await window.DB.Offers.remove(o.id);
        if(o.image) window.DB.Storage.deleteImageByUrl(o.image);
        state.offers.splice(idx,1);
        render();
      }catch(err){ toastError("تعذر الحذف", err); }
    });
  });

  // reviews
  var addReviewBtn = app.querySelector("[data-action='add-review']");
  if(addReviewBtn){
    addReviewBtn.addEventListener("click", async function(){
      state.reviewThemes.push({ id:"r_"+Math.random().toString(36).slice(2,8), type:"positive", text:"" });
      try{ await window.DB.Settings.update({ review_themes: state.reviewThemes }); render(); }
      catch(err){ toastError("تعذر الإضافة", err); }
    });
  }
  app.querySelectorAll("[data-action='del-review']").forEach(function(el){
    el.addEventListener("click", async function(){
      var idx = parseInt(el.getAttribute("data-idx"),10);
      state.reviewThemes.splice(idx,1);
      try{ await window.DB.Settings.update({ review_themes: state.reviewThemes }); render(); }
      catch(err){ toastError("تعذر الحذف", err); }
    });
  });

  // image upload fields
  app.querySelectorAll(".image-file-input").forEach(function(el){
    el.addEventListener("change", function(){
      var target = el.getAttribute("data-target");
      var file = el.files && el.files[0];
      el.value = "";
      if(!file) return;
      handleImageUpload(target, file);
    });
  });
  app.querySelectorAll("[data-action='remove-image']").forEach(function(el){
    el.addEventListener("click", function(){
      handleImageRemove(el.getAttribute("data-target"));
    });
  });
}

document.addEventListener("DOMContentLoaded", loadState);
})();
