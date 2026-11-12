importScripts("shared/patterns.js", "shared/checks.js");

var P = self.__ADG_PATTERNS;
var RULESET_ID = "ads";
var WL_RULE_BASE = 10000;
var RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "other"
];
var SETTINGS_DEFAULT = { enabled: true, whitelist: [] };

function storageGet(area, keys) {
  return new Promise(function (resolve) {
    chrome.storage[area].get(keys, function (data) {
      resolve(data || {});
    });
  });
}

function storageSet(area, obj) {
  return new Promise(function (resolve) {
    chrome.storage[area].set(obj, function () {
      resolve();
    });
  });
}

function storageRemove(area, keys) {
  return new Promise(function (resolve) {
    chrome.storage[area].remove(keys, function () {
      resolve();
    });
  });
}

function statsKey(tabId) {
  return "stats_" + tabId;
}

function securityKey(tabId) {
  return "security_" + tabId;
}

function checksKey(tabId) {
  return "checks_" + tabId;
}

function techKey(tabId) {
  return "tech_" + tabId;
}

function headerTechKey(tabId) {
  return "headertech_" + tabId;
}

function emptyStats() {
  return { popups: 0, redirects: 0 };
}

function emptySecurity() {
  return { events: [], counts: {} };
}

var clearPromises = {};

function queueClear(tabId) {
  if (tabId == null) return;
  var promise = clearTabData(tabId);
  clearPromises[tabId] = promise;
  promise.then(function () {
    if (clearPromises[tabId] === promise) delete clearPromises[tabId];
  });
}

async function waitClear(tabId) {
  var promise = clearPromises[tabId];
  if (promise) {
    try {
      await promise;
    } catch (e) {}
  }
}

function getCfg() {
  return new Promise(function (resolve) {
    chrome.storage.local.get(SETTINGS_DEFAULT, function (cfg) {
      cfg.autoHandle = self.__ADG_normalizeAuto(cfg.autoHandle);
      cfg.whitelist = Array.isArray(cfg.whitelist) ? cfg.whitelist : [];
      resolve(cfg);
    });
  });
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (e) {
    return "";
  }
}

function hostWhitelisted(host, whitelist) {
  if (!host) return false;
  for (var i = 0; i < whitelist.length; i++) {
    var domain = whitelist[i];
    if (host === domain || host.endsWith("." + domain)) return true;
  }
  return false;
}

async function rebuildWhitelistRules() {
  try {
    var cfg = await getCfg();
    var existing = await chrome.declarativeNetRequest.getDynamicRules();
    var removeRuleIds = existing.map(function (rule) {
      return rule.id;
    });
    var addRules = [];
    var seen = {};
    for (var i = 0; i < cfg.whitelist.length; i++) {
      var domain = cfg.whitelist[i];
      if (!domain || seen[domain]) continue;
      seen[domain] = true;
      addRules.push({
        id: WL_RULE_BASE + addRules.length,
        priority: 100,
        action: { type: "allow" },
        condition: { initiatorDomains: [domain], resourceTypes: RESOURCE_TYPES }
      });
    }
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeRuleIds,
      addRules: addRules
    });
  } catch (e) {}
}

function updateBadge(tabId, security) {
  if (tabId == null) return;
  var counts = (security && security.counts) || {};
  var total = 0;
  for (var key in counts) {
    if (Object.prototype.hasOwnProperty.call(counts, key)) total += counts[key];
  }
  var text = total ? (total > 99 ? "99+" : String(total)) : "";
  try {
    chrome.action.setBadgeText({ tabId: tabId, text: text });
    if (text) chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#f04438" });
  } catch (e) {}
}

async function recordBlocked(tabId, kind) {
  if (tabId == null) return;
  await waitClear(tabId);
  var key = statsKey(tabId);
  var data = await storageGet("session", key);
  var stats = data[key] || emptyStats();
  if (kind === "popup") stats.popups = (stats.popups || 0) + 1;
  else stats.redirects = (stats.redirects || 0) + 1;
  var payload = {};
  payload[key] = stats;
  await storageSet("session", payload);
}

async function recordSecurity(tabId, event) {
  if (tabId == null) return;
  await waitClear(tabId);
  var key = securityKey(tabId);
  var data = await storageGet("session", key);
  var security = data[key] || emptySecurity();
  var kind = event.kind || "unknown";
  security.counts[kind] = (security.counts[kind] || 0) + 1;
  security.events.unshift({
    kind: kind,
    severity: event.severity || "low",
    host: event.host || "",
    detail: event.detail || "",
    handled: !!event.handled,
    time: Date.now()
  });
  if (security.events.length > 50) security.events.length = 50;
  var payload = {};
  payload[key] = security;
  await storageSet("session", payload);
  updateBadge(tabId, security);
}

async function clearTabData(tabId) {
  if (tabId == null) return;
  await storageRemove("session", [statsKey(tabId), securityKey(tabId), checksKey(tabId), techKey(tabId)]);
  try {
    chrome.action.setBadgeText({ tabId: tabId, text: "" });
  } catch (e) {}
}

async function storeChecks(tabId, entry) {
  await waitClear(tabId);
  var payload = {};
  payload[checksKey(tabId)] = entry;
  await storageSet("session", payload);
}

async function storeTech(tabId, techs) {
  await waitClear(tabId);
  var payload = {};
  payload[techKey(tabId)] = techs.slice(0, 200);
  await storageSet("session", payload);
}

function mergeTechLists(contentTech, headerTech) {
  var map = {};
  var order = [];

  function put(item) {
    if (!item || !item.name) return;
    var key = item.name.toLowerCase();
    if (!map[key]) {
      map[key] = {
        name: item.name,
        category: item.category || "Lainnya",
        version: item.version || ""
      };
      order.push(key);
      return;
    }
    if (!map[key].version && item.version) map[key].version = item.version;
    if ((!map[key].category || map[key].category === "Lainnya") && item.category) {
      map[key].category = item.category;
    }
  }

  (contentTech || []).forEach(put);
  (headerTech || []).forEach(put);
  return order.map(function (key) {
    return map[key];
  });
}

function headerCleanVersion(value) {
  if (value == null) return "";
  var text = String(value).trim();
  if (!/^\d+(\.\d+){0,3}([-.][0-9a-z.]+)?$/i.test(text)) return "";
  return text;
}

var HEADER_RULES = [
  { header: "server", re: /nginx(?:\/([\d.]+))?/i, name: "Nginx", category: "Web server", version: true },
  { header: "server", re: /apache(?:\/([\d.]+))?/i, name: "Apache HTTP Server", category: "Web server", version: true },
  { header: "server", re: /litespeed/i, name: "LiteSpeed", category: "Web server" },
  { header: "server", re: /microsoft-iis(?:\/([\d.]+))?/i, name: "Microsoft IIS", category: "Web server", version: true },
  { header: "server", re: /cloudflare/i, name: "Cloudflare", category: "CDN" },
  { header: "server", re: /gunicorn(?:\/([\d.]+))?/i, name: "Gunicorn", category: "Web server", version: true },
  { header: "server", re: /uvicorn/i, name: "Uvicorn", category: "Web server" },
  { header: "server", re: /caddy/i, name: "Caddy", category: "Web server" },
  { header: "server", re: /openresty(?:\/([\d.]+))?/i, name: "OpenResty", category: "Web server", version: true },
  { header: "server", re: /envoy/i, name: "Envoy", category: "Proxy" },
  { header: "server", re: /kestrel/i, name: "Kestrel", category: "Web server" },
  { header: "server", re: /github\.com/i, name: "GitHub Pages", category: "Hosting" },
  { header: "server", re: /vercel/i, name: "Vercel", category: "Hosting" },
  { header: "server", re: /netlify/i, name: "Netlify", category: "Hosting" },
  { header: "server", re: /firebase/i, name: "Firebase Hosting", category: "Hosting" },
  { header: "server", re: /amazons3/i, name: "Amazon S3", category: "Hosting" },
  { header: "x-powered-by", re: /PHP(?:\/([\d.]+))?/i, name: "PHP", category: "Programming language", version: true },
  { header: "x-powered-by", re: /express/i, name: "Express", category: "Web framework" },
  { header: "x-powered-by", re: /ASP\.NET/i, name: "ASP.NET", category: "Web framework" },
  { header: "x-powered-by", re: /Next\.js/i, name: "Next.js", category: "JavaScript framework" },
  { header: "x-powered-by", re: /Nuxt/i, name: "Nuxt", category: "JavaScript framework" },
  { header: "x-powered-by", re: /Django/i, name: "Django", category: "Web framework" },
  { header: "x-powered-by", re: /Rails/i, name: "Ruby on Rails", category: "Web framework" },
  { header: "x-powered-by", re: /Shopify/i, name: "Shopify", category: "E-commerce" },
  { header: "x-powered-by", re: /PleskLin/i, name: "Plesk", category: "Hosting" },
  { header: "x-aspnet-version", re: /([\d.]+)/, name: "ASP.NET", category: "Web framework", version: true },
  { header: "x-aspnetmvc-version", re: /([\d.]+)/, name: "ASP.NET MVC", category: "Web framework", version: true },
  { header: "x-generator", re: /Drupal(?:\s*([\d.]+))?/i, name: "Drupal", category: "CMS", version: true },
  { header: "x-generator", re: /WordPress(?:\s*([\d.]+))?/i, name: "WordPress", category: "CMS", version: true },
  { header: "x-drupal-cache", re: /.*/, name: "Drupal", category: "CMS" },
  { header: "x-drupal-dynamic-cache", re: /.*/, name: "Drupal", category: "CMS" },
  { header: "x-shopify-stage", re: /.*/, name: "Shopify", category: "E-commerce" },
  { header: "x-shopid", re: /.*/, name: "Shopify", category: "E-commerce" },
  { header: "x-vercel-id", re: /.*/, name: "Vercel", category: "Hosting" },
  { header: "x-nextjs-cache", re: /.*/, name: "Next.js", category: "JavaScript framework" },
  { header: "x-nextjs-prerender", re: /.*/, name: "Next.js", category: "JavaScript framework" },
  { header: "cf-ray", re: /.*/, name: "Cloudflare", category: "CDN" },
  { header: "x-litespeed-cache", re: /.*/, name: "LiteSpeed", category: "Web server" },
  { header: "x-turbo-charged-by", re: /.*/, name: "Turbo", category: "Web framework" },
  { header: "via", re: /cloudfront/i, name: "Amazon CloudFront", category: "CDN" },
  { header: "via", re: /fastly/i, name: "Fastly", category: "CDN" },
  { header: "via", re: /akamai/i, name: "Akamai", category: "CDN" },
  { header: "x-cache", re: /cloudfront/i, name: "Amazon CloudFront", category: "CDN" },
  { header: "x-served-by", re: /cache-/i, name: "Fastly", category: "CDN" }
];

var HEADER_COOKIE_MARKERS = [
  { needle: "phpsessid", name: "PHP", category: "Programming language" },
  { needle: "laravel_session", name: "Laravel", category: "Web framework" },
  { needle: "wordpress_", name: "WordPress", category: "CMS" },
  { needle: "wp-settings", name: "WordPress", category: "CMS" },
  { needle: "_shopify", name: "Shopify", category: "E-commerce" },
  { needle: "__cf_bm", name: "Cloudflare", category: "CDN" },
  { needle: "asp.net_sessionid", name: "ASP.NET", category: "Web framework" },
  { needle: "jsessionid", name: "Java", category: "Programming language" },
  { needle: "csrftoken", name: "Django", category: "Web framework" },
  { needle: "ci_session", name: "CodeIgniter", category: "Web framework" },
  { needle: "_rails", name: "Ruby on Rails", category: "Web framework" }
];

function deriveHeaderTech(headers) {
  var list = [];
  var seen = {};

  function put(name, category, version) {
    if (!name) return;
    var key = name.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    list.push({ name: name, category: category || "Lainnya", version: version || "" });
  }

  for (var i = 0; i < HEADER_RULES.length; i++) {
    var rule = HEADER_RULES[i];
    var value = headers[rule.header];
    if (!value) continue;
    var match = rule.re.exec(value);
    if (!match) continue;
    put(rule.name, rule.category, rule.version ? headerCleanVersion(match[1]) : "");
  }

  var cookies = (headers["set-cookie"] || "").toLowerCase();
  if (cookies) {
    for (var j = 0; j < HEADER_COOKIE_MARKERS.length; j++) {
      var marker = HEADER_COOKIE_MARKERS[j];
      if (cookies.indexOf(marker.needle) !== -1) put(marker.name, marker.category, "");
    }
  }

  return list;
}

async function storeHeaderTech(tabId, techs) {
  var payload = {};
  payload[headerTechKey(tabId)] = techs;
  await storageSet("session", payload);
}

function clearHeaderTech(tabId) {
  if (tabId == null) return;
  try {
    chrome.storage.session.remove(headerTechKey(tabId));
  } catch (e) {}
}

async function getTabData(tabId) {
  if (tabId == null) return null;
  var data = {};
  try {
    data = await storageGet("session", [
      statsKey(tabId),
      securityKey(tabId),
      checksKey(tabId),
      techKey(tabId),
      headerTechKey(tabId)
    ]);
  } catch (e) {
    data = {};
  }
  var checksEntry = data[checksKey(tabId)] || null;
  return {
    stats: data[statsKey(tabId)] || emptyStats(),
    security: data[securityKey(tabId)] || emptySecurity(),
    checks: checksEntry ? checksEntry.checks : null,
    checksEnabled: checksEntry ? checksEntry.enabled !== false : true,
    tech: mergeTechLists(data[techKey(tabId)] || [], data[headerTechKey(tabId)] || [])
  };
}

async function applyRuleset(enabled) {
  try {
    if (enabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [RULESET_ID] });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: [RULESET_ID] });
    }
  } catch (e) {}
}

async function setEnabled(enabled) {
  await storageSet("local", { enabled: enabled });
  await applyRuleset(enabled);

  var tabs = await chrome.tabs.query({});
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].id == null) continue;
    chrome.tabs
      .sendMessage(tabs[i].id, { type: "adg:setEnabled", enabled: enabled })
      .catch(function () {});
  }
}

async function broadcastAutoHandle(map) {
  var tabs = await chrome.tabs.query({});
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].id == null) continue;
    chrome.tabs
      .sendMessage(tabs[i].id, { type: "adg:setAutoHandle", autoHandle: map })
      .catch(function () {});
  }
}

async function setAutoHandle(map) {
  var normalized = self.__ADG_normalizeAuto(map);
  await storageSet("local", { autoHandle: normalized });
  await broadcastAutoHandle(normalized);
  return normalized;
}

async function setAutoHandleItem(kind, value) {
  var cfg = await getCfg();
  var map = cfg.autoHandle;
  map[kind] = !!value;
  return setAutoHandle(map);
}

chrome.runtime.onInstalled.addListener(async function () {
  var cfg = await getCfg();
  await storageSet("local", {
    enabled: cfg.enabled,
    autoHandle: self.__ADG_normalizeAuto(cfg.autoHandle)
  });
  try {
    chrome.storage.local.remove(["stats", "security"]);
  } catch (e) {}
  await applyRuleset(cfg.enabled);
  await rebuildWhitelistRules();
});

chrome.runtime.onStartup.addListener(async function () {
  var cfg = await getCfg();
  await applyRuleset(cfg.enabled);
  await rebuildWhitelistRules();
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== "local") return;
  if (changes.whitelist) rebuildWhitelistRules();
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message) return;

  var tabId = sender && sender.tab && sender.tab.id != null ? sender.tab.id : null;

  if (message.type === "adg:pageStart") {
    if (tabId != null && (sender.frameId === 0 || sender.frameId == null)) {
      queueClear(tabId);
    }
    return;
  }

  if (message.type === "adg:blocked") {
    recordBlocked(tabId, message.kind);
    return;
  }

  if (message.type === "adg:security") {
    recordSecurity(tabId, message);
    return;
  }

  if (message.type === "adg:checks") {
    if (tabId != null && (sender.frameId === 0 || sender.frameId == null)) {
      storeChecks(tabId, {
        checks: message.checks || null,
        enabled: message.enabled !== false,
        time: Date.now()
      });
    }
    return;
  }

  if (message.type === "adg:tech") {
    if (tabId != null && (sender.frameId === 0 || sender.frameId == null) && Array.isArray(message.techs)) {
      storeTech(tabId, message.techs);
    }
    return;
  }

  if (message.type === "adg:getTabData") {
    getTabData(message.tabId).then(function (data) {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === "adg:getTabChecks") {
    if (message.tabId == null) {
      sendResponse(null);
      return true;
    }
    var key = checksKey(message.tabId);
    storageGet("session", key).then(function (data) {
      sendResponse(data && data[key] ? data[key] : null);
    });
    return true;
  }

  if (message.type === "adg:setEnabled") {
    setEnabled(!!message.enabled).then(function () {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "adg:setAutoHandle") {
    setAutoHandle(message.autoHandle).then(function () {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "adg:setAutoHandleItem") {
    setAutoHandleItem(message.kind, message.value).then(function () {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "adg:resetStats") {
    if (message.tabId == null) {
      sendResponse({ ok: false });
      return true;
    }
    var statsPayload = {};
    statsPayload[statsKey(message.tabId)] = emptyStats();
    storageSet("session", statsPayload).then(function () {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "adg:clearSecurity") {
    if (message.tabId == null) {
      sendResponse({ ok: false });
      return true;
    }
    var secPayload = {};
    secPayload[securityKey(message.tabId)] = emptySecurity();
    storageSet("session", secPayload).then(function () {
      updateBadge(message.tabId, emptySecurity());
      sendResponse({ ok: true });
    });
    return true;
  }
});

function adTab(tab) {
  var url = tab.pendingUrl || tab.url || "";
  return url ? P.isAdUrl(url) : false;
}

if (chrome.webRequest && chrome.webRequest.onBeforeRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
      if (details.tabId >= 0 && details.type === "main_frame") {
        clearHeaderTech(details.tabId);
      }
    },
    { urls: ["<all_urls>"], types: ["main_frame"] }
  );

  chrome.webRequest.onHeadersReceived.addListener(
    function (details) {
      if (details.tabId < 0 || details.type !== "main_frame") return;
      var headers = {};
      var list = details.responseHeaders || [];
      for (var i = 0; i < list.length; i++) {
        var name = (list[i].name || "").toLowerCase();
        if (!name) continue;
        if (name === "set-cookie") {
          headers[name] = (headers[name] ? headers[name] + "; " : "") + (list[i].value || "");
        } else {
          headers[name] = list[i].value || "";
        }
      }
      storeHeaderTech(details.tabId, deriveHeaderTech(headers));
    },
    { urls: ["<all_urls>"], types: ["main_frame"] },
    ["responseHeaders"]
  );
}

async function openerWhitelisted(openerTabId) {
  if (openerTabId == null) return false;
  try {
    var opener = await chrome.tabs.get(openerTabId);
    var host = hostFromUrl(opener.url || opener.pendingUrl || "");
    var cfg = await getCfg();
    return hostWhitelisted(host, cfg.whitelist);
  } catch (e) {
    return false;
  }
}

chrome.tabs.onCreated.addListener(async function (tab) {
  if (!adTab(tab)) return;
  var cfg = await getCfg();
  if (!cfg.enabled) return;
  if (await openerWhitelisted(tab.openerTabId)) return;
  chrome.tabs.remove(tab.id).catch(function () {});
});

chrome.tabs.onUpdated.addListener(async function (tabId, info, tab) {
  if (!info.url || !tab.openerTabId) return;
  if (!P.isAdUrl(info.url)) return;
  var cfg = await getCfg();
  if (!cfg.enabled) return;
  if (await openerWhitelisted(tab.openerTabId)) return;
  chrome.tabs.remove(tabId).catch(function () {});
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  queueClear(tabId);
  clearHeaderTech(tabId);
});
