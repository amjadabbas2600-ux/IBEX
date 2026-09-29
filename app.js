import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, getDocs, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzP9QP_m8TNaEd14DzLNaSsVwqbpbMBMk",
  authDomain: "ibex-aa90e.firebaseapp.com",
  projectId: "ibex-aa90e",
  storageBucket: "ibex-aa90e.firebasestorage.app",
  messagingSenderId: "700583459757",
  appId: "1:700583459757:web:1b6cb04f4267b8e0807f24",
  measurementId: "G-DYYLJWNSEP"
};

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch {}
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const I18N = {
  ar: {
    nav_home: "الرئيسية", nav_apps: "التطبيقات", nav_admin: "لوحة الإدارة",
    logout: "خروج", login: "دخول", hero_eyebrow: "متجر تطبيقات الشركة",
    hero_title: "حمّل تطبيقات IBEX الرسمية بأمان",
    hero_lead: "سجّل دخولك، تصفح التطبيقات، حمّل ملف APK، وقيّم تجربتك.",
    browse: "تصفح التطبيقات", create_account: "إنشاء حساب",
    apps: "تطبيق", downloads: "تحميل", email: "البريد الإلكتروني",
    password: "كلمة المرور", need_account: "ليس لديك حساب؟ إنشاء حساب",
    have_account: "لديك حساب؟ تسجيل الدخول", signup: "إنشاء حساب",
    apps_title: "تطبيقات IBEX", back: "رجوع", admin_title: "لوحة الإدارة",
    upload_app: "رفع تطبيق جديد", app_name_ar: "اسم التطبيق (عربي)",
    app_name_en: "App name (English)", desc_ar: "الوصف بالعربي",
    desc_en: "Description in English", version: "الإصدار", category: "التصنيف",
    icon: "أيقونة التطبيق", apk: "ملف APK", publish: "نشر التطبيق",
    stats: "الإحصائيات", manage: "إدارة التطبيقات", download: "تحميل APK",
    rate: "تقييمك", save_rate: "حفظ التقييم", need_login: "يجب تسجيل الدخول أولاً",
    published: "تم نشر التطبيق", deleted: "تم الحذف", rated: "شكراً لتقييمك",
    downloaded: "بدأ التحميل", error: "حدث خطأ"
  },
  en: {
    nav_home: "Home", nav_apps: "Apps", nav_admin: "Admin",
    logout: "Sign out", login: "Sign in", hero_eyebrow: "Official company store",
    hero_title: "Download official IBEX Android apps",
    hero_lead: "Sign in, browse apps, download APK files, and rate your experience.",
    browse: "Browse apps", create_account: "Create account",
    apps: "Apps", downloads: "Downloads", email: "Email",
    password: "Password", need_account: "No account? Create one",
    have_account: "Have an account? Sign in", signup: "Create account",
    apps_title: "IBEX Apps", back: "Back", admin_title: "Admin dashboard",
    upload_app: "Publish a new app", app_name_ar: "App name (Arabic)",
    app_name_en: "App name (English)", desc_ar: "Arabic description",
    desc_en: "English description", version: "Version", category: "Category",
    icon: "App icon", apk: "APK file", publish: "Publish app",
    stats: "Statistics", manage: "Manage apps", download: "Download APK",
    rate: "Your rating", save_rate: "Save rating", need_login: "Please sign in first",
    published: "App published", deleted: "Deleted", rated: "Thanks for rating",
    downloaded: "Download started", error: "Something went wrong"
  }
};

let lang = localStorage.getItem("ibex_lang") || "ar";
let user = null;
let profile = null;
let appsCache = [];
let signupMode = false;
let currentAppId = null;

window.toggleLang = () => {
  lang = lang === "ar" ? "en" : "ar";
  localStorage.setItem("ibex_lang", lang);
  applyLang();
};

function t(key) { return I18N[lang][key] || key; }

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.getElementById("langBtn").textContent = lang === "ar" ? "EN" : "عربي";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.getElementById("search")?.setAttribute("placeholder", lang === "ar" ? "بحث..." : "Search...");
  renderApps();
  if (currentAppId) openApp(currentAppId);
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2800);
}

window.go = (name) => {
  if ((name === "apps" || name === "admin" || name === "app") && !user) {
    toast(t("need_login"));
    name = "auth";
  }
  if (name === "admin" && profile?.role !== "admin") {
    toast(lang === "ar" ? "هذه الصفحة للمدير فقط" : "Admins only");
    name = "apps";
  }
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("view-" + name).classList.remove("hidden");
  document.querySelectorAll(".nav .link").forEach(b => b.classList.toggle("active", b.dataset.view === name));
};

window.toggleAuthMode = () => {
  signupMode = !signupMode;
  document.getElementById("authTitle").textContent = signupMode ? t("signup") : t("login");
  document.getElementById("authSubmit").textContent = signupMode ? t("signup") : t("login");
  document.getElementById("toggleAuthMode").textContent = signupMode ? t("have_account") : t("need_account");
};

window.handleAuth = async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  try {
    if (signupMode) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email, role: "user", createdAt: serverTimestamp()
      });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    toast(err.message);
  }
};

window.logout = () => signOut(auth);

async function loadProfile(u) {
  const snap = await getDoc(doc(db, "users", u.uid));
  if (snap.exists()) profile = { id: u.uid, ...snap.data() };
  else {
    profile = { id: u.uid, email: u.email, role: "user" };
    await setDoc(doc(db, "users", u.uid), { email: u.email, role: "user", createdAt: serverTimestamp() });
  }
}

onAuthStateChanged(auth, async (u) => {
  user = u;
  document.getElementById("loginBtn").classList.toggle("hidden", !!u);
  document.getElementById("logoutBtn").classList.toggle("hidden", !u);
  if (u) {
    await loadProfile(u);
    document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", profile.role !== "admin"));
    await loadApps();
    go("apps");
  } else {
    profile = null;
    document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
    go("home");
  }
});

async function loadApps() {
  const snap = await getDocs(query(collection(db, "apps"), orderBy("createdAt", "desc")));
  appsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  document.getElementById("statApps").textContent = appsCache.length;
  const totalDl = appsCache.reduce((s, a) => s + (a.downloads || 0), 0);
  document.getElementById("statDownloads").textContent = totalDl;
  renderApps();
  renderAdmin();
}

window.renderApps = function () {
  const q = (document.getElementById("search")?.value || "").toLowerCase();
  const grid = document.getElementById("appsGrid");
  const list = appsCache.filter(a => {
    const name = ((lang === "ar" ? a.nameAr : a.nameEn) || "") + " " + (a.category || "");
    return name.toLowerCase().includes(q);
  });
  grid.innerHTML = list.map(a => `
    <article class="app-card" onclick="openApp('${a.id}')">
      <img src="${a.iconUrl || 'assets/logo-mark.png'}" alt="" />
      <h3>${lang === "ar" ? a.nameAr : a.nameEn}</h3>
      <p class="muted">${a.category || ""} · v${a.version || "1.0"}</p>
      <div class="stars">${stars(a.avgRating)} <small>(${a.ratingCount || 0})</small></div>
      <p class="muted">${a.downloads || 0} ${t("downloads")}</p>
    </article>
  `).join("") || `<p class="muted">${lang === "ar" ? "لا توجد تطبيقات بعد" : "No apps yet"}</p>`;
};

window.openApp = async (id) => {
  currentAppId = id;
  const a = appsCache.find(x => x.id === id);
  if (!a) return;
  go("app");
  let myRating = 0;
  if (user) {
    const r = await getDoc(doc(db, "apps", id, "ratings", user.uid));
    if (r.exists()) myRating = r.data().stars;
  }
  document.getElementById("appDetail").innerHTML = `
    <div class="detail-top">
      <img src="${a.iconUrl || 'assets/logo-mark.png'}" alt="" />
      <div>
        <h2>${lang === "ar" ? a.nameAr : a.nameEn}</h2>
        <p class="muted">${a.category || ""} · v${a.version}</p>
        <div class="stars">${stars(a.avgRating)} (${a.ratingCount || 0})</div>
      </div>
    </div>
    <p>${lang === "ar" ? a.descAr : a.descEn}</p>
    <button class="btn" onclick="downloadApp('${a.id}')">${t("download")}</button>
    <p>${a.downloads || 0} ${t("downloads")}</p>
    <h3>${t("rate")}</h3>
    <div id="rateBox">${[1,2,3,4,5].map(n => `<button class="chip" onclick="setRate(${n})">${n <= myRating ? "★" : "☆"} ${n}</button>`).join("")}</div>
    <button class="btn ghost" onclick="saveRate('${a.id}')">${t("save_rate")}</button>
  `;
  window._pendingRate = myRating;
};

window.setRate = (n) => {
  window._pendingRate = n;
  document.getElementById("rateBox").innerHTML = [1,2,3,4,5].map(i =>
    `<button class="chip" onclick="setRate(${i})">${i <= n ? "★" : "☆"} ${i}</button>`
  ).join("");
};

window.saveRate = async (id) => {
  if (!user) return toast(t("need_login"));
  const starsN = window._pendingRate || 0;
  if (!starsN) return;
  try {
    await setDoc(doc(db, "apps", id, "ratings", user.uid), {
      stars: starsN, uid: user.uid, at: serverTimestamp()
    });
    const ratings = await getDocs(collection(db, "apps", id, "ratings"));
    let sum = 0;
    ratings.forEach(d => sum += d.data().stars || 0);
    const count = ratings.size;
    await updateDoc(doc(db, "apps", id), { avgRating: sum / count, ratingCount: count });
    toast(t("rated"));
    await loadApps();
    openApp(id);
  } catch (e) { toast(e.message); }
};

window.downloadApp = async (id) => {
  if (!user) return toast(t("need_login"));
  const a = appsCache.find(x => x.id === id);
  if (!a?.apkUrl) return toast(t("error"));
  try {
    await addDoc(collection(db, "downloads"), {
      appId: id, uid: user.uid, at: serverTimestamp()
    });
    await updateDoc(doc(db, "apps", id), { downloads: increment(1) });
    toast(t("downloaded"));
    window.location.href = a.apkUrl;
    await loadApps();
  } catch (e) { toast(e.message); }
};

window.uploadApp = async (e) => {
  e.preventDefault();
  if (profile?.role !== "admin") return toast("Admins only");
  const apk = document.getElementById("apkFile").files[0];
  const icon = document.getElementById("iconFile").files[0];
  if (!apk) return;
  try {
    const id = crypto.randomUUID();
    const apkRef = ref(storage, `apps/${id}/${apk.name}`);
    await uploadBytes(apkRef, apk);
    const apkUrl = await getDownloadURL(apkRef);
    let iconUrl = "";
    if (icon) {
      const iconRef = ref(storage, `apps/${id}/icon-${icon.name}`);
      await uploadBytes(iconRef, icon);
      iconUrl = await getDownloadURL(iconRef);
    }
    await setDoc(doc(db, "apps", id), {
      nameAr: document.getElementById("nameAr").value,
      nameEn: document.getElementById("nameEn").value,
      descAr: document.getElementById("descAr").value,
      descEn: document.getElementById("descEn").value,
      version: document.getElementById("version").value,
      category: document.getElementById("category").value,
      apkUrl, iconUrl, downloads: 0, avgRating: 0, ratingCount: 0,
      createdAt: serverTimestamp()
    });
    document.getElementById("uploadForm").reset();
    toast(t("published"));
    await loadApps();
  } catch (err) { toast(err.message); }
};

window.deleteApp = async (id) => {
  if (!confirm(lang === "ar" ? "حذف التطبيق؟" : "Delete this app?")) return;
  await deleteDoc(doc(db, "apps", id));
  toast(t("deleted"));
  await loadApps();
};

function renderAdmin() {
  const box = document.getElementById("adminStats");
  const totalDl = appsCache.reduce((s, a) => s + (a.downloads || 0), 0);
  const avg = appsCache.length ? (appsCache.reduce((s,a)=>s+(a.avgRating||0),0)/appsCache.length).toFixed(1) : "0";
  box.innerHTML = `
    <div class="stat-box"><b>${appsCache.length}</b><div class="muted">${t("apps")}</div></div>
    <div class="stat-box"><b>${totalDl}</b><div class="muted">${t("downloads")}</div></div>
    <div class="stat-box"><b>${avg}</b><div class="muted">★</div></div>
  `;
  document.getElementById("adminList").innerHTML = appsCache.map(a => `
    <div class="app-card" style="margin-bottom:8px">
      <strong>${a.nameAr} / ${a.nameEn}</strong>
      <p class="muted">v${a.version} · ${a.downloads||0} ${t("downloads")} · ${stars(a.avgRating)}</p>
      <button class="btn danger" onclick="deleteApp('${a.id}')">${lang==="ar"?"حذف":"Delete"}</button>
    </div>
  `).join("");
}

function stars(n=0) {
  const r = Math.round(n || 0);
  return "★★★★★".slice(0,r) + "☆☆☆☆☆".slice(r);
}

applyLang();
go("home");
loadApps().catch(() => {});
