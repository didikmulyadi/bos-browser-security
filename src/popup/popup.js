var SETTINGS_DEFAULT = { enabled: true, whitelist: [], siteConfig: {}, youtubeAds: true };

var CHECKS = [
  ["secret_exfil", "Exfiltrasi cookie/token", "Cookie, token, atau localStorage dikirim ke domain lain"],
  ["sensitive_post", "Data sensitif ke pihak ketiga", "Password, email, atau OTP dikirim lintas situs"],
  ["ip_endpoint", "Data ke alamat IP mentah", "Request berisi data menuju alamat IP langsung"],
  ["cross_domain_cookie", "Cookie lintas domain", "Ada upaya menulis cookie untuk domain lain"],
  ["document_domain", "Perubahan document.domain", "Melebarkan akses ke subdomain lain"],
  ["clipboard_read", "Akses clipboard", "Membaca isi clipboard pengguna"],
  ["credential_access", "Akses kredensial", "Memanggil API kredensial/password manager"],
  ["key_listener", "Pemantau keyboard", "Hanya tombol panah (↑ ↓ ← →) yang diteruskan ke listener"],
  ["obfuscated_script", "Script obfuscated", "Analisis obfuscation; sedang/tinggi diblokir"],
  ["dynamic_script", "Script lintas situs", "Script dari data:/blob:/IP mentah diblokir"],
  ["hidden_iframe", "Iframe tersembunyi/overlay", "Iframe pihak ketiga tersembunyi atau menutupi halaman"],
  ["media_capture", "Akses kamera/mikrofon", "getUserMedia / getDisplayMedia"],
  ["geolocation", "Akses lokasi", "navigator.geolocation"],
  ["payment_request", "Payment Request", "Meminta data pembayaran"],
  ["postmessage_leak", "Kirim data via postMessage", "postMessage ke * / pihak ketiga dengan data sensitif"],
  ["canvas_fingerprint", "Fingerprint canvas", "Membaca canvas untuk fingerprinting"],
  ["cookie_banner", "Banner cookie otomatis", "OneTrust otomatis ditolak & disembunyikan"]
];

var SEC_INFO = {
  secret_exfil: {
    title: "Exfiltrasi cookie/token",
    desc: "Data sensitif (cookie, token, atau localStorage) dikirim ke domain lain. Bisa berarti pencurian sesi login."
  },
  sensitive_post: {
    title: "Data sensitif ke pihak ketiga",
    desc: "Password, email, atau OTP dikirim ke domain pihak ketiga."
  },
  ip_endpoint: {
    title: "Data ke alamat IP mentah",
    desc: "Data dikirim langsung ke alamat IP tanpa nama domain."
  },
  cross_domain_cookie: {
    title: "Cookie lintas domain",
    desc: "Script mencoba menulis cookie untuk domain lain, indikasi upaya ambil alih sesi."
  },
  document_domain: {
    title: "Perubahan document.domain",
    desc: "Memperluas akses JavaScript ke subdomain lain."
  },
  clipboard_read: {
    title: "Akses clipboard",
    desc: "Membaca isi clipboard pengguna."
  },
  credential_access: {
    title: "Akses kredensial",
    desc: "Memanggil API kredensial atau password manager."
  },
  key_listener: {
    title: "Pemantau keyboard",
    desc: "Memasang listener ketikan di halaman. Mode ketat: hanya tombol panah (↑ ↓ ← →) yang diteruskan, tombol lain diblokir dari listener."
  },
  obfuscated_script: {
    title: "Script obfuscated",
    desc: "Script inline ter-obfuscate. Dianalisis: jika ada indikasi kuat (escape/decoder + akses cookie/jaringan) maka sedang/tinggi dan diblokir otomatis."
  },
  dynamic_script: {
    title: "Script lintas situs",
    desc: "Script dimuat dari data:, blob:, atau alamat IP mentah — cara umum menyembunyikan malware."
  },
  hidden_iframe: {
    title: "Iframe tersembunyi/overlay",
    desc: "Iframe pihak ketiga disembunyikan atau menutupi halaman, potensi clickjacking atau pelacakan."
  },
  media_capture: {
    title: "Akses kamera/mikrofon",
    desc: "Meminta akses kamera, mikrofon, atau rekam layar."
  },
  geolocation: {
    title: "Akses lokasi",
    desc: "Meminta lokasi pengguna melalui navigator.geolocation."
  },
  payment_request: {
    title: "Payment Request",
    desc: "Meminta data pembayaran melalui Payment Request API."
  },
  postmessage_leak: {
    title: "Kirim data via postMessage",
    desc: "Mengirim data sensitif ke origin * atau domain pihak ketiga."
  },
  canvas_fingerprint: {
    title: "Fingerprint canvas",
    desc: "Membaca isi canvas, sering dipakai untuk fingerprinting pelacakan."
  },
  cookie_banner: {
    title: "Banner cookie otomatis",
    desc: "Banner persetujuan cookie (OneTrust) otomatis ditolak dan disembunyikan."
  }
};

var TECH_ICONS = {
  react: { bg: "#61DAFB", fg: "#0B101A", label: "R" },
  "react dom": { bg: "#61DAFB", fg: "#0B101A", label: "R" },
  "vue.js": { bg: "#41B883", label: "V" },
  angular: { bg: "#DD0031", label: "A" },
  angularjs: { bg: "#DD0031", label: "A" },
  svelte: { bg: "#FF3E00", label: "S" },
  sveltekit: { bg: "#FF3E00", label: "S" },
  "next.js": { bg: "#000000", label: "N" },
  nuxt: { bg: "#00DC82", fg: "#0B101A", label: "N" },
  astro: { bg: "#FF5D01", label: "A" },
  remix: { bg: "#121212", label: "R" },
  gatsby: { bg: "#663399", label: "G" },
  preact: { bg: "#673AB8", label: "P" },
  "ember.js": { bg: "#E04E39", label: "E" },
  "backbone.js": { bg: "#0071B5", label: "B" },
  jquery: { bg: "#0769AD", label: "JQ" },
  "jquery ui": { bg: "#0769AD", label: "JU" },
  bootstrap: { bg: "#7952B3", label: "B" },
  "tailwind css": { bg: "#06B6D4", fg: "#0B101A", label: "T" },
  bulma: { bg: "#00D1B2", fg: "#0B101A", label: "B" },
  foundation: { bg: "#1779BA", label: "F" },
  "material ui": { bg: "#007FFF", label: "M" },
  "ant design": { bg: "#1677FF", label: "A" },
  "chakra ui": { bg: "#319795", label: "C" },
  vuetify: { bg: "#1867C0", label: "V" },
  "element ui": { bg: "#409EFF", label: "E" },
  wordpress: { bg: "#21759B", label: "W" },
  woocommerce: { bg: "#96588A", label: "W" },
  elementor: { bg: "#92003B", label: "E" },
  shopify: { bg: "#96BF48", fg: "#0B101A", label: "S" },
  drupal: { bg: "#0678BE", label: "D" },
  joomla: { bg: "#5091CD", label: "J" },
  magento: { bg: "#EE672F", label: "M" },
  prestashop: { bg: "#DF0067", label: "P" },
  opencart: { bg: "#1E9CD7", label: "O" },
  webflow: { bg: "#4353FF", label: "W" },
  wix: { bg: "#000000", label: "W" },
  squarespace: { bg: "#000000", label: "S" },
  framer: { bg: "#0055FF", label: "F" },
  ghost: { bg: "#15171A", label: "G" },
  typo3: { bg: "#FF8700", label: "T" },
  "google analytics": { bg: "#E37400", label: "GA" },
  "google tag manager": { bg: "#4285F4", label: "GT" },
  "facebook pixel": { bg: "#1877F2", label: "F" },
  hotjar: { bg: "#FF3C00", label: "H" },
  "microsoft clarity": { bg: "#0078D4", label: "C" },
  segment: { bg: "#52BD94", label: "S" },
  mixpanel: { bg: "#7856FF", label: "M" },
  amplitude: { bg: "#1E61F0", label: "A" },
  matomo: { bg: "#3152A0", label: "M" },
  plausible: { bg: "#5850EC", label: "P" },
  hubspot: { bg: "#FF7A59", label: "H" },
  intercom: { bg: "#1F8DED", label: "I" },
  crisp: { bg: "#1972F5", label: "C" },
  "tawk.to": { bg: "#03A84E", label: "T" },
  zendesk: { bg: "#03363D", label: "Z" },
  "stripe.js": { bg: "#635BFF", label: "S" },
  paypal: { bg: "#00457C", label: "P" },
  klarna: { bg: "#FFB3C7", fg: "#0B101A", label: "K" },
  braintree: { bg: "#000000", label: "B" },
  midtrans: { bg: "#002B5B", label: "M" },
  xendit: { bg: "#4573FF", label: "X" },
  cloudflare: { bg: "#F38020", label: "CF" },
  "amazon cloudfront": { bg: "#FF9900", fg: "#0B101A", label: "CF" },
  fastly: { bg: "#FF282D", label: "F" },
  akamai: { bg: "#009BDE", label: "A" },
  vercel: { bg: "#000000", label: "V" },
  netlify: { bg: "#00C7B7", fg: "#0B101A", label: "N" },
  "github pages": { bg: "#181717", label: "GH" },
  "firebase hosting": { bg: "#FFCA28", fg: "#0B101A", label: "F" },
  jsdelivr: { bg: "#F3B03A", fg: "#0B101A", label: "J" },
  cdnjs: { bg: "#F3B03A", fg: "#0B101A", label: "C" },
  unpkg: { bg: "#000000", label: "U" },
  "bunny cdn": { bg: "#FF6600", label: "B" },
  nginx: { bg: "#009639", label: "N" },
  "apache http server": { bg: "#D22128", label: "A" },
  litespeed: { bg: "#0D5EBA", label: "L" },
  "microsoft iis": { bg: "#0078D4", label: "I" },
  gunicorn: { bg: "#499848", label: "G" },
  openresty: { bg: "#00A6A6", label: "O" },
  envoy: { bg: "#AC6199", label: "E" },
  kestrel: { bg: "#512BD4", label: "K" },
  php: { bg: "#777BB4", label: "P" },
  express: { bg: "#000000", label: "E" },
  "asp.net": { bg: "#512BD4", label: "N" },
  "asp.net mvc": { bg: "#512BD4", label: "N" },
  django: { bg: "#092E20", label: "D" },
  "ruby on rails": { bg: "#CC0000", label: "R" },
  laravel: { bg: "#FF2D20", label: "L" },
  codeigniter: { bg: "#DD4814", label: "C" },
  java: { bg: "#007396", label: "J" },
  ".net": { bg: "#512BD4", label: "N" },
  "node.js": { bg: "#339933", label: "N" },
  javascript: { bg: "#F7DF1E", fg: "#0B101A", label: "JS" },
  typescript: { bg: "#3178C6", label: "TS" },
  webpack: { bg: "#8DD6F9", fg: "#0B101A", label: "W" },
  vite: { bg: "#646CFF", label: "V" },
  lodash: { bg: "#3492FF", label: "L" },
  "underscore.js": { bg: "#1F4E79", label: "U" },
  "moment.js": { bg: "#000000", label: "M" },
  "day.js": { bg: "#FF5F00", label: "D" },
  axios: { bg: "#5A29E4", label: "A" },
  "socket.io": { bg: "#010101", label: "S" },
  "d3.js": { bg: "#F9A03C", fg: "#0B101A", label: "D3" },
  "three.js": { bg: "#000000", label: "3" },
  "chart.js": { bg: "#FF6384", label: "C" },
  highcharts: { bg: "#1D1D1B", label: "H" },
  "apache echarts": { bg: "#AA344D", label: "E" },
  apexcharts: { bg: "#2C3E50", label: "A" },
  gsap: { bg: "#88CE02", fg: "#0B101A", label: "G" },
  swiper: { bg: "#6332F6", label: "S" },
  leaflet: { bg: "#199900", label: "L" },
  "mapbox gl js": { bg: "#4264FB", label: "M" },
  "pdf.js": { bg: "#FF3B30", label: "P" },
  "monaco editor": { bg: "#007ACC", label: "M" },
  codemirror: { bg: "#5B7F95", label: "C" },
  quill: { bg: "#06B6D4", fg: "#0B101A", label: "Q" },
  tinymce: { bg: "#D3A600", fg: "#0B101A", label: "T" },
  ckeditor: { bg: "#0287D0", label: "C" },
  "prism.js": { bg: "#6B7280", label: "P" },
  "highlight.js": { bg: "#6B7280", label: "H" },
  dompurify: { bg: "#2C3E50", label: "D" },
  "crypto-js": { bg: "#F7931A", label: "C" },
  sentry: { bg: "#362D59", label: "S" }
};

var CATEGORY_COLORS = {
  "JavaScript framework": "#3B82F6",
  "JavaScript library": "#8B5CF6",
  "UI library": "#EC4899",
  "CSS framework": "#06B6D4",
  CMS: "#21759B",
  "E-commerce": "#96BF48",
  Analytics: "#F59E0B",
  Payments: "#635BFF",
  CDN: "#F38020",
  "Web server": "#009639",
  Hosting: "#181717",
  "Build tool": "#646CFF",
  "Programming language": "#64748B",
  Security: "#DC2626",
  Support: "#0EA5E9",
  Marketing: "#FF7A59",
  Visualization: "#F97316",
  Animation: "#22C55E",
  Maps: "#10B981",
  Document: "#EF4444",
  Monitoring: "#7C3AED",
  Realtime: "#0EA5E9",
  "Font/Icon": "#6B7280",
  Runtime: "#339933",
  Lainnya: "#667085"
};

var toggle = document.getElementById("enabled");
var popupsEl = document.getElementById("popups");
var redirectsEl = document.getElementById("redirects");
var statusEl = document.getElementById("status");
var netEl = document.getElementById("netcount");
var checklistEl = document.getElementById("checklist");
var checksumEl = document.getElementById("checksum");
var activateEl = document.getElementById("activate");
var reloadEl = document.getElementById("reloadpage");
var noteEl = document.getElementById("checknote");
var alertlistEl = document.getElementById("alertlist");
var wldomainEl = document.getElementById("wldomain");
var wltoggleEl = document.getElementById("wltoggle");
var ytadsEl = document.getElementById("ytads");
var techlistEl = document.getElementById("techlist");
var techcountEl = document.getElementById("techcount");

var activeTabId = null;
var lastChecks = null;
var lastEnabled = true;
var securityCounts = {};
var autoHandleMap = __ADG_normalizeAuto(null);
var shieldButtons = {};
var siteConfig = {};
var globalAutoHandle = null;
var currentHost = "";
var whitelist = [];
var settingsEnabled = true;

function renderSettings(cfg) {
  var isOn = cfg.enabled !== false;
  settingsEnabled = isOn;
  toggle.checked = isOn;
  statusEl.textContent = isOn ? "Protection on" : "Protection off";
  statusEl.classList.toggle("off", !isOn);
  netEl.textContent = isOn ? "Active" : "Off";
  globalAutoHandle = cfg.autoHandle;
  siteConfig = cfg.siteConfig && typeof cfg.siteConfig === "object" ? cfg.siteConfig : {};
  autoHandleMap = effectiveAutoHandle(currentHost);
  whitelist = Array.isArray(cfg.whitelist) ? cfg.whitelist : [];
  ytadsEl.checked = cfg.youtubeAds !== false;
  renderWhitelist();
}

function effectiveAutoHandle(host) {
  var merged = {};
  var baseMap = __ADG_normalizeAuto(globalAutoHandle);
  for (var key in baseMap) merged[key] = baseMap[key];
  if (host) {
    var base = baseDomain(host);
    var site = siteConfig[base];
    var overrides = site && site.autoHandle;
    if (overrides) {
      for (var overrideKey in overrides) merged[overrideKey] = overrides[overrideKey];
    }
  }
  return merged;
}

function saveSiteAutoHandle(kind, value) {
  if (!currentHost) return;
  var base = baseDomain(currentHost);
  var site = siteConfig[base] || {};
  var overrides = site.autoHandle || {};
  overrides[kind] = value;
  site.autoHandle = overrides;
  siteConfig[base] = site;
  chrome.storage.local.set({ siteConfig: siteConfig });
}

function renderTabData(data) {
  var stats = (data && data.stats) || { popups: 0, redirects: 0 };
  var security = (data && data.security) || { events: [], counts: {} };

  securityCounts = security.counts || {};
  popupsEl.textContent = stats.popups || 0;
  redirectsEl.textContent = stats.redirects || 0;
  renderAlerts(security.events);
  renderTech(data && data.tech, !!(data && data.checks));

  if (data && data.checks) {
    renderChecks(data.checks, data.checksEnabled !== false);
  } else {
    queryChecksDirect(toggle.checked);
  }
}

chrome.storage.local.get(SETTINGS_DEFAULT, function (cfg) {
  renderSettings(cfg);
  refreshTab();
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== "local") return;
  if (changes.enabled || changes.autoHandle || changes.whitelist || changes.siteConfig || changes.youtubeAds) {
    chrome.storage.local.get(SETTINGS_DEFAULT, function (cfg) {
      renderSettings(cfg);
      if (changes.enabled || changes.whitelist) {
        refreshTab();
      } else if (changes.autoHandle || changes.siteConfig) {
        autoHandleMap = effectiveAutoHandle(currentHost);
        syncShieldStates();
      }
    });
  }
});

try {
  chrome.storage.session.onChanged.addListener(function (changes) {
    if (activeTabId == null) return;
    if (
      changes["stats_" + activeTabId] ||
      changes["security_" + activeTabId] ||
      changes["checks_" + activeTabId]
    ) {
      refreshTab();
    }
  });
} catch (e) {}

toggle.addEventListener("change", function () {
  chrome.runtime.sendMessage({ type: "adg:setEnabled", enabled: toggle.checked });
  setTimeout(refreshTab, 250);
});

activateEl.addEventListener("click", function () {
  toggle.checked = true;
  chrome.runtime.sendMessage({ type: "adg:setEnabled", enabled: true });
  setTimeout(refreshTab, 250);
});

reloadEl.addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0];
    if (tab && tab.id != null) chrome.tabs.reload(tab.id);
    window.close();
  });
});

document.getElementById("reset").addEventListener("click", function () {
  chrome.runtime.sendMessage({ type: "adg:resetStats", tabId: activeTabId }, function () {
    refreshTab();
  });
});

ytadsEl.addEventListener("change", function () {
  chrome.storage.local.set({ youtubeAds: ytadsEl.checked });
});

document.getElementById("clearalerts").addEventListener("click", function () {
  chrome.runtime.sendMessage({ type: "adg:clearSecurity", tabId: activeTabId }, function () {
    refreshTab();
  });
});

function refreshTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0];
    if (!tab || tab.id == null) {
      activeTabId = null;
      currentHost = "";
      renderWhitelist();
      renderTabData(null);
      return;
    }

    activeTabId = tab.id;
    currentHost = hostFromUrl(tab.url || "");
    autoHandleMap = effectiveAutoHandle(currentHost);
    renderWhitelist();
    chrome.runtime.sendMessage({ type: "adg:getTabData", tabId: tab.id }, function (data) {
      if (chrome.runtime.lastError || !data) return;
      renderTabData(data);
    });
  });
}

function hostFromUrl(url) {
  try {
    var parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.hostname.toLowerCase();
  } catch (e) {
    return "";
  }
}

function baseDomain(host) {
  if (!host) return "";
  host = host.toLowerCase().replace(/^www\./, "");
  var multi = [
    "co.uk",
    "co.id",
    "co.jp",
    "com.au",
    "com.br",
    "co.in",
    "co.kr",
    "com.tr",
    "com.cn",
    "com.mx",
    "co.nz",
    "co.za",
    "com.sg",
    "com.hk"
  ];
  var parts = host.split(".");
  if (parts.length <= 2) return host;
  var lastTwo = parts.slice(-2).join(".");
  if (multi.indexOf(lastTwo) !== -1 && parts.length >= 3) return parts.slice(-3).join(".");
  return lastTwo;
}

function hostWhitelisted(host, list) {
  if (!host) return false;
  for (var i = 0; i < list.length; i++) {
    var domain = list[i];
    if (host === domain || host.endsWith("." + domain)) return true;
  }
  return false;
}

function renderWhitelist() {
  var host = currentHost;
  wldomainEl.textContent = host || "\u2014";

  if (!host) {
    wltoggleEl.hidden = true;
    netEl.textContent = settingsEnabled ? "Active" : "Off";
    return;
  }

  var isWhitelisted = hostWhitelisted(host, whitelist);
  wltoggleEl.hidden = false;
  wltoggleEl.textContent = isWhitelisted ? "Aktifkan proteksi situs ini" : "Jeda proteksi situs ini";
  wltoggleEl.classList.toggle("on", isWhitelisted);
  wltoggleEl.title = isWhitelisted
    ? "Aktifkan kembali proteksi untuk " + host
    : "Jeda proteksi untuk " + baseDomain(host);
  netEl.textContent = !settingsEnabled ? "Off" : isWhitelisted ? "Paused" : "Active";
}

wltoggleEl.addEventListener("click", function () {
  if (!currentHost) return;

  var list = whitelist.slice();
  var removed = false;
  for (var i = list.length - 1; i >= 0; i--) {
    var domain = list[i];
    if (currentHost === domain || currentHost.endsWith("." + domain)) {
      list.splice(i, 1);
      removed = true;
    }
  }
  if (!removed) list.push(baseDomain(currentHost));

  whitelist = list;
  chrome.storage.local.set({ whitelist: list }, function () {
    renderWhitelist();
    setTimeout(refreshTab, 200);
  });
});

function queryChecksDirect(fallbackEnabled) {
  if (activeTabId == null) {
    renderChecks(null, fallbackEnabled);
    return;
  }
  chrome.tabs.sendMessage(activeTabId, { type: "adg:getChecks" }, { frameId: 0 }, function (resp) {
    if (chrome.runtime.lastError || !resp) {
      renderChecks(null, fallbackEnabled);
      return;
    }
    renderChecks(resp.checks, resp.enabled !== false);
  });
}

function renderChecks(checks, isEnabled) {
  var on = isEnabled !== false && settingsEnabled !== false;
  var reachable = !!checks;
  lastChecks = checks;
  lastEnabled = on;

  activateEl.hidden = on;
  reloadEl.hidden = !(!reachable && on);
  noteEl.hidden = reachable || !on;

  checklistEl.textContent = "";
  shieldButtons = {};

  var activeCount = 0;
  for (var i = 0; i < CHECKS.length; i++) {
    var key = CHECKS[i][0];
    var label = CHECKS[i][1];
    var hint = CHECKS[i][2];

    var proved = !!(checks && checks[key]);
    var active = proved && on;
    if (active) activeCount += 1;

    var li = document.createElement("li");
    li.title = hint;

    var dot = document.createElement("span");
    dot.className = "dot " + (active ? "on" : proved ? "off" : "idle");

    var name = document.createElement("span");
    name.className = "chk-label";
    name.textContent = label;

    var state = document.createElement("span");
    state.className = "chk-status " + (active ? "on" : proved ? "off" : "");
    if (!reachable) state.textContent = "Menunggu";
    else if (proved) state.textContent = on ? "Aktif" : "Nonaktif";
    else state.textContent = "Tidak aktif";

    li.appendChild(dot);
    li.appendChild(name);
    li.appendChild(state);

    var count = securityCounts[key] || 0;
    if (count > 0) {
      var chip = document.createElement("span");
      chip.className = "chk-count";
      chip.textContent = String(count);
      chip.title = count + " peringatan terdeteksi";
      li.appendChild(chip);
    }

    var preference = autoHandleMap[key] !== false;
    var shield = makeAutoShield(key, on && preference, on);
    shieldButtons[key] = shield;
    li.appendChild(shield);

    checklistEl.appendChild(li);
  }

  var totalAlerts = 0;
  for (var k in securityCounts) {
    if (Object.prototype.hasOwnProperty.call(securityCounts, k)) totalAlerts += securityCounts[k];
  }

  if (!reachable) {
    checksumEl.textContent = "menunggu muat ulang";
    checksumEl.classList.add("off");
    return;
  }

  var summary = activeCount + "/" + CHECKS.length + " aktif";
  if (totalAlerts) summary += " \u00b7 " + totalAlerts + " alert";
  checksumEl.textContent = summary;
  checksumEl.classList.toggle("off", activeCount === 0);
}

function shieldSvg(active) {
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");

  var body = document.createElementNS(ns, "path");
  body.setAttribute("d", "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z");

  if (active) {
    body.setAttribute("fill", "currentColor");
    body.setAttribute("stroke", "none");

    var check = document.createElementNS(ns, "path");
    check.setAttribute("d", "M8.5 12.5l2.5 2.5 4.5-5");
    check.setAttribute("fill", "none");
    check.setAttribute("stroke", "#ffffff");
    check.setAttribute("stroke-width", "2");
    check.setAttribute("stroke-linecap", "round");
    check.setAttribute("stroke-linejoin", "round");

    svg.appendChild(body);
    svg.appendChild(check);
  } else {
    body.setAttribute("fill", "none");
    body.setAttribute("stroke", "currentColor");
    body.setAttribute("stroke-width", "1.8");
    svg.appendChild(body);
  }

  return svg;
}

function applyShieldState(button, active, interactive) {
  var wasOn = button.classList.contains("on");
  button.classList.toggle("on", active);
  button.disabled = !interactive;
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.title = interactive
    ? "Tangani otomatis: " + (active ? "aktif" : "mati")
    : "Proteksi nonaktif";
  if (wasOn !== active) {
    button.replaceChildren(shieldSvg(active));
  }
}

function makeAutoShield(kind, active, interactive) {
  var button = document.createElement("button");
  button.type = "button";
  button.className = "auto-shield";
  button.setAttribute("aria-label", "Tangani otomatis untuk item ini");
  applyShieldState(button, active, interactive);

  button.addEventListener("click", function () {
    if (!interactive) return;
    var next = !(autoHandleMap[kind] !== false);
    autoHandleMap[kind] = next;
    applyShieldState(button, next, true);
    saveSiteAutoHandle(kind, next);
  });

  return button;
}

function syncShieldStates() {
  var interactive = lastEnabled !== false;
  var keys = Object.keys(shieldButtons);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var preference = autoHandleMap[key] !== false;
    applyShieldState(shieldButtons[key], interactive && preference, interactive);
  }
}

function techInitials(name) {
  var words = String(name || "")
    .replace(/[^A-Za-z0-9. ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  var label = "";
  for (var i = 0; i < words.length && label.length < 2; i++) {
    label += words[i].charAt(0);
  }
  if (!label) label = String(name || "?").slice(0, 2);
  return label.toUpperCase().slice(0, 2);
}

function hexLuminance(hex) {
  var value = String(hex || "").replace("#", "");
  if (value.length !== 6) return 0.5;
  var r = parseInt(value.slice(0, 2), 16) / 255;
  var g = parseInt(value.slice(2, 4), 16) / 255;
  var b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function createTechIcon(name, category) {
  var key = String(name || "").toLowerCase();
  var brand = typeof __ADG_TECH_ICONS !== "undefined" ? __ADG_TECH_ICONS[key] : null;
  var ns = "http://www.w3.org/2000/svg";

  if (brand && brand.d) {
    var brandSvg = document.createElementNS(ns, "svg");
    brandSvg.setAttribute("viewBox", "0 0 24 24");
    brandSvg.setAttribute("class", "tech-icon");
    brandSvg.setAttribute("aria-hidden", "true");

    var brandPath = document.createElementNS(ns, "path");
    brandPath.setAttribute("d", brand.d);

    var luminance = hexLuminance(brand.color);
    if (luminance < 0.3 || luminance > 0.82) {
      brandPath.setAttribute("fill", "currentColor");
      brandSvg.style.color = "var(--text)";
    } else {
      brandPath.setAttribute("fill", brand.color);
    }

    brandSvg.appendChild(brandPath);
    return brandSvg;
  }

  var info = TECH_ICONS[key];
  if (!info) {
    info = {
      bg: CATEGORY_COLORS[category] || CATEGORY_COLORS.Lainnya,
      fg: "#FFFFFF",
      label: techInitials(name)
    };
  }

  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("class", "tech-icon");
  svg.setAttribute("aria-hidden", "true");

  var rect = document.createElementNS(ns, "rect");
  rect.setAttribute("width", "32");
  rect.setAttribute("height", "32");
  rect.setAttribute("rx", "8");
  rect.setAttribute("fill", info.bg);

  var text = document.createElementNS(ns, "text");
  text.setAttribute("x", "16");
  text.setAttribute("y", "21.5");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-family", "Segoe UI, Arial, sans-serif");
  text.setAttribute("font-size", info.label.length > 1 ? "11" : "14");
  text.setAttribute("font-weight", "700");
  text.setAttribute("fill", info.fg || "#FFFFFF");
  text.textContent = info.label;

  svg.appendChild(rect);
  svg.appendChild(text);
  return svg;
}

function renderTech(techs, reachable) {
  techlistEl.textContent = "";
  var list = (techs || []).slice().sort(function (a, b) {
    var cat = (a.category || "").localeCompare(b.category || "");
    if (cat !== 0) return cat;
    return (a.name || "").localeCompare(b.name || "");
  });

  techcountEl.textContent = String(list.length);

  if (!list.length) {
    var empty = document.createElement("li");
    empty.className = "tech-empty";
    empty.textContent = reachable
      ? "Belum ada teknologi terdeteksi."
      : "Muat ulang halaman agar profiler berjalan.";
    techlistEl.appendChild(empty);
    return;
  }

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var li = document.createElement("li");
    li.title = (item.category ? item.category + " \u00b7 " : "") + (item.name || "");

    li.appendChild(createTechIcon(item.name, item.category));

    var name = document.createElement("span");
    name.className = "tech-name";
    name.textContent = item.name || "Unknown";
    li.appendChild(name);

    if (item.version) {
      var version = document.createElement("span");
      version.className = "tech-ver";
      version.textContent = item.version;
      li.appendChild(version);
    }

    techlistEl.appendChild(li);
  }
}

function renderAlerts(events) {
  alertlistEl.textContent = "";
  var list = events || [];
  if (!list.length) {
    var empty = document.createElement("li");
    empty.className = "alert-empty";
    empty.textContent = "Belum ada peringatan.";
    alertlistEl.appendChild(empty);
    return;
  }

  var groups = [
    { key: "high", label: "Tinggi", items: [] },
    { key: "medium", label: "Sedang", items: [] },
    { key: "low", label: "Rendah", items: [] }
  ];
  var index = { high: 0, medium: 1, low: 2 };

  for (var i = 0; i < list.length; i++) {
    var ev = list[i];
    var sev = ev.severity === "high" || ev.severity === "medium" ? ev.severity : "low";
    groups[index[sev]].items.push(ev);
  }

  var shown = 0;
  for (var g = 0; g < groups.length; g++) {
    var group = groups[g];
    if (!group.items.length) continue;

    var head = document.createElement("li");
    head.className = "group-head";
    var headLabel = document.createElement("span");
    headLabel.textContent = group.label;
    var headCount = document.createElement("span");
    headCount.className = "group-count";
    headCount.textContent = String(group.items.length);
    head.appendChild(headLabel);
    head.appendChild(headCount);
    alertlistEl.appendChild(head);

    for (var j = 0; j < group.items.length && shown < 20; j++, shown++) {
      alertlistEl.appendChild(buildAlertItem(group.items[j], group.key));
    }
  }
}

function buildAlertItem(ev, sev) {
  var info = SEC_INFO[ev.kind] || {
    title: ev.kind || "Aktivitas mencurigakan",
    desc: "Aktivitas mencurigakan terdeteksi."
  };

  var li = document.createElement("li");

  var details = document.createElement("details");
  details.className = "alert alert-" + sev;

  var summary = document.createElement("summary");
  var title = document.createElement("span");
  title.className = "alert-title";
  title.textContent = info.title;
  summary.appendChild(title);
  details.appendChild(summary);

  var body = document.createElement("div");
  body.className = "alert-body";

  var desc = document.createElement("div");
  desc.className = "alert-desc";
  desc.textContent = info.desc;

  var timeText = ev.time ? new Date(ev.time).toLocaleTimeString() : "";
  var meta = document.createElement("div");
  meta.className = "alert-meta";
  meta.textContent =
    (ev.host || "halaman ini") +
    (ev.detail ? " \u00b7 " + ev.detail : "") +
    (timeText ? " \u00b7 " + timeText : "");

  var action = document.createElement("div");
  action.className = "alert-action " + (ev.handled ? "handled" : "monitor");
  if (ev.handled) action.textContent = "Ditangani otomatis";
  else if (sev === "low") action.textContent = "Dipantau saja (tidak diblokir)";
  else action.textContent = "Dipantau (tangani otomatis mati)";

  body.appendChild(desc);
  body.appendChild(meta);
  body.appendChild(action);
  details.appendChild(body);
  li.appendChild(details);
  return li;
}
