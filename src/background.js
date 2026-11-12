importScripts("shared/patterns.js", "shared/checks.js");

var P = self.__ADG_PATTERNS;
var RULESET_ID = "ads";
var SETTINGS_DEFAULT = { enabled: true };

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

function emptyStats() {
  return { popups: 0, redirects: 0 };
}

function emptySecurity() {
  return { events: [], counts: {} };
}

function getCfg() {
  return new Promise(function (resolve) {
    chrome.storage.local.get(SETTINGS_DEFAULT, function (cfg) {
      cfg.autoHandle = self.__ADG_normalizeAuto(cfg.autoHandle);
      resolve(cfg);
    });
  });
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
  await storageRemove("session", [statsKey(tabId), securityKey(tabId), checksKey(tabId)]);
  try {
    chrome.action.setBadgeText({ tabId: tabId, text: "" });
  } catch (e) {}
}

async function getTabData(tabId) {
  if (tabId == null) return null;
  var data = {};
  try {
    data = await storageGet("session", [statsKey(tabId), securityKey(tabId), checksKey(tabId)]);
  } catch (e) {
    data = {};
  }
  var checksEntry = data[checksKey(tabId)] || null;
  return {
    stats: data[statsKey(tabId)] || emptyStats(),
    security: data[securityKey(tabId)] || emptySecurity(),
    checks: checksEntry ? checksEntry.checks : null,
    checksEnabled: checksEntry ? checksEntry.enabled !== false : true
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
});

chrome.runtime.onStartup.addListener(async function () {
  var cfg = await getCfg();
  await applyRuleset(cfg.enabled);
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message) return;

  var tabId = sender && sender.tab && sender.tab.id != null ? sender.tab.id : null;

  if (message.type === "adg:blocked") {
    recordBlocked(tabId, message.kind);
    return;
  }

  if (message.type === "adg:security") {
    recordSecurity(tabId, message);
    return;
  }

  if (message.type === "adg:checks") {
    if (tabId != null) {
      var checksPayload = {};
      checksPayload[checksKey(tabId)] = {
        checks: message.checks || null,
        enabled: message.enabled !== false,
        time: Date.now()
      };
      storageSet("session", checksPayload);
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

chrome.tabs.onCreated.addListener(async function (tab) {
  if (!adTab(tab)) return;
  var cfg = await getCfg();
  if (!cfg.enabled) return;
  chrome.tabs.remove(tab.id).catch(function () {});
});

chrome.tabs.onUpdated.addListener(async function (tabId, info, tab) {
  if (info.status === "loading") {
    clearTabData(tabId);
  }

  if (!info.url || !tab.openerTabId) return;
  if (!P.isAdUrl(info.url)) return;
  var cfg = await getCfg();
  if (!cfg.enabled) return;
  chrome.tabs.remove(tabId).catch(function () {});
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  clearTabData(tabId);
});
