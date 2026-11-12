var SETTINGS_DEFAULT = { enabled: true, whitelist: [] };

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
var techlistEl = document.getElementById("techlist");
var techcountEl = document.getElementById("techcount");

var activeTabId = null;
var lastChecks = null;
var lastEnabled = true;
var securityCounts = {};
var autoHandleMap = __ADG_normalizeAuto(null);
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
  autoHandleMap = __ADG_normalizeAuto(cfg.autoHandle);
  whitelist = Array.isArray(cfg.whitelist) ? cfg.whitelist : [];
  renderWhitelist();
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
  if (changes.enabled || changes.autoHandle || changes.whitelist) {
    chrome.storage.local.get(SETTINGS_DEFAULT, function (cfg) {
      renderSettings(cfg);
      if (changes.enabled || changes.whitelist) refreshTab();
      else if (changes.autoHandle) renderChecks(lastChecks, lastEnabled);
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
    renderWhitelist();
    chrome.runtime.sendMessage({ type: "adg:getTabData", tabId: tab.id }, function (data) {
      if (chrome.runtime.lastError || !data) {
        renderTabData(null);
        return;
      }
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
  wltoggleEl.textContent = isWhitelisted ? "Batalkan whitelist" : "Whitelist domain ini";
  wltoggleEl.classList.toggle("on", isWhitelisted);
  wltoggleEl.title = isWhitelisted
    ? "Aktifkan kembali proteksi untuk " + host
    : "Kecualikan " + baseDomain(host) + " dari proteksi";
  netEl.textContent = !settingsEnabled ? "Off" : isWhitelisted ? "Whitelisted" : "Active";
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
  var on = isEnabled !== false;
  var reachable = !!checks;
  lastChecks = checks;
  lastEnabled = on;

  activateEl.hidden = on;
  reloadEl.hidden = !(!reachable && on);
  noteEl.hidden = reachable || !on;

  checklistEl.textContent = "";

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

    li.appendChild(makeAutoToggle(key, autoHandleMap[key] !== false));

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

function makeAutoToggle(kind, checked) {
  var label = document.createElement("label");
  label.className = "mini";
  label.title = "Tangani otomatis untuk item ini";

  var input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", function () {
    autoHandleMap[kind] = input.checked;
    chrome.runtime.sendMessage({ type: "adg:setAutoHandleItem", kind: kind, value: input.checked });
  });

  var track = document.createElement("span");
  track.className = "track";

  label.appendChild(input);
  label.appendChild(track);
  return label;
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
