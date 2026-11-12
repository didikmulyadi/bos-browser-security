(function () {
  function sandboxBlocksScripts() {
    var fe = null;
    try {
      fe = window.frameElement;
    } catch (e) {
      fe = null;
    }
    var href = "";
    try {
      href = location.href || "";
    } catch (e) {}
    var blankish =
      href === "about:blank" ||
      href === "about:srcdoc" ||
      href.indexOf("data:") === 0 ||
      href.indexOf("blob:") === 0;
    if (blankish && !fe) return true;
    if (!fe) return false;
    try {
      if (fe.hasAttribute && fe.hasAttribute("sandbox")) {
        var attrs = (fe.getAttribute("sandbox") || "").toLowerCase();
        if (attrs.indexOf("allow-scripts") === -1) return true;
      }
    } catch (e) {}
    return false;
  }

  if (sandboxBlocksScripts()) return;

  var P = globalThis.__ADG_PATTERNS;

  var enabled = true;
  var globalEnabled = true;
  var whitelist = [];
  var autoHandle = null;
  var lastChecks = null;
  var metaScheduled = false;
  var STYLE_ID = "__adg_style";

  var COSMETIC_CSS =
    [
      '[id^="google_ads"]',
      '[id^="div-gpt-ad"]',
      "ins.adsbygoogle",
      "iframe[src*='doubleclick.net']",
      "iframe[src*='googlesyndication.com']",
      "iframe[src*='googleadservices.com']",
      "iframe[src*='adnxs.com']",
      "iframe[src='about:blank'][width='300'][height='250']",
      "iframe[src='about:blank'][width='300'][height='600']",
      "iframe[src='about:blank'][width='728'][height='90']",
      "iframe[src='about:blank'][width='468'][height='60']",
      "iframe[src='about:blank'][width='320'][height='50']",
      "iframe[src='about:blank'][width='160'][height='600']",
      '[id^="atContainer-"]',
      '[id^="atLink-"]',
      '[class~="ads" i]',
      '[class^="ads" i]',
      '[class*=" ads" i]',
      '[class*="pubadx"]',
      '[data-pubadx-gen]',
      '[id*="popunder"]',
      '[class*="popunder"]',
      '[class*="taboola"]',
      '[id*="taboola"]',
      '[class*="outbrain"]',
      '[id*="outbrain"]',
      '[class*="mgid"]',
      '[id*="mgid"]',
      "img[src*='storageimagedisplay.com']",
      "a[href*='hooliredir.com']",
      "[data-ad]",
      "[data-ad-slot]",
      "[data-ad-client]",
      "[data-google-query-id]",
      ".ad-slot",
      ".ad-container",
      ".ad-banner",
      ".ad-wrapper",
      ".ad-unit",
      ".ad-zone",
      ".sponsored-content",
      ".sponsored-post"
    ].join(",") + "{display:none !important;}";

  var AD_MARKERS = [
    '[id^="atContainer-"]',
    '[id^="atLink-"]',
    "ins.adsbygoogle",
    '[id^="google_ads"]',
    '[id^="div-gpt-ad"]',
    "iframe[src*='doubleclick.net']",
    "iframe[src*='googlesyndication.com']",
    "iframe[src*='googleadservices.com']",
    "iframe[src*='adnxs.com']",
    "img[src*='storageimagedisplay.com']",
    "a[href*='hooliredir.com']",
    '[class*="pubadx"]',
    "[data-pubadx-gen]",
    "[data-ad]",
    "[data-ad-slot]",
    "[data-google-query-id]"
  ].join(",");

  var AD_CLASS_SELECTOR = '[class*="ads" i]';

  var SAFE_CLASS_TOKENS = {
    downloads: 1,
    download: 1,
    uploads: 1,
    upload: 1,
    loads: 1,
    load: 1,
    threads: 1,
    heads: 1,
    reads: 1,
    spreads: 1,
    payloads: 1,
    preloads: 1,
    reloads: 1,
    overloads: 1
  };

  function classLooksLikeAd(el) {
    var list = el.classList;
    if (!list) return false;
    for (var i = 0; i < list.length; i++) {
      var token = list[i];
      if (token.length < 3) continue;
      var lower = token.toLowerCase();
      if (lower.indexOf("ads") === -1) continue;
      if (SAFE_CLASS_TOKENS[lower]) continue;
      return true;
    }
    return false;
  }

  function removeAdClassNodes() {
    if (!enabled) return;
    var nodes = document.querySelectorAll(AD_CLASS_SELECTOR);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el || !el.parentNode) continue;
      var tag = el.tagName;
      if (tag === "HTML" || tag === "BODY" || tag === "HEAD") continue;
      if (!classLooksLikeAd(el)) continue;
      el.remove();
    }
  }

  function docHref(doc) {
    try {
      return doc.location ? doc.location.href : location.href;
    } catch (e) {
      return location.href;
    }
  }

  function looksLikeAdDocument(doc) {
    if (!doc) return false;
    try {
      if (doc.querySelector(AD_MARKERS)) return true;
      var links = doc.querySelectorAll("a[href]");
      for (var i = 0; i < links.length; i++) {
        if (P && P.isAdUrl(links[i].href, docHref(doc))) return true;
      }
      var images = doc.querySelectorAll("img[src]");
      for (var j = 0; j < images.length; j++) {
        if (P && P.isAdUrl(images[j].src, docHref(doc))) return true;
      }
    } catch (e) {}
    return false;
  }

  function killFrame(frameEl, reason) {
    if (!frameEl) return;
    try {
      frameEl.style.setProperty("display", "none", "important");
      frameEl.remove();
      report("popup", reason);
    } catch (e) {}
  }

  var selfKilled = false;

  function cleanupSelf() {
    if (!enabled || selfKilled) return;
    if (window === window.top) return;
    if (!looksLikeAdDocument(document)) return;
    selfKilled = true;
    var frameEl = null;
    try {
      frameEl = window.frameElement;
    } catch (e) {}
    killFrame(frameEl, "ad-frame");
  }

  function cleanupChildFrames() {
    if (!enabled) return;
    var frames = document.querySelectorAll("iframe, frame");
    for (var i = 0; i < frames.length; i++) {
      var frameEl = frames[i];
      var childDoc = null;
      try {
        childDoc = frameEl.contentDocument;
      } catch (e) {
        childDoc = null;
      }
      if (!childDoc) continue;
      if (looksLikeAdDocument(childDoc)) killFrame(frameEl, "ad-frame");
    }
  }

  var scanScheduled = false;

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    queueMicrotask(function () {
      scanScheduled = false;
      removeAdClassNodes();
      cleanupSelf();
      cleanupChildFrames();
    });
  }

  var cleanerStarted = false;

  function startFrameCleaner() {
    scheduleScan();
    var delays = [250, 750, 1500, 3000, 6000];
    delays.forEach(function (ms) {
      setTimeout(scheduleScan, ms);
    });
    if (cleanerStarted) return;
    cleanerStarted = true;
    var ticks = 0;
    var timer = setInterval(function () {
      scheduleScan();
      ticks += 1;
      if (ticks >= 15) clearInterval(timer);
    }, 2000);
  }

  function send(message) {
    try {
      chrome.runtime.sendMessage(message);
    } catch (e) {}
  }

  function report(kind, detail) {
    if (!enabled) return;
    send({ type: "adg:blocked", kind: kind, detail: detail });
  }

  function broadcastConfig() {
    try {
      window.postMessage({ __adgCfg: 1, enabled: enabled, autoHandle: autoHandle }, "*");
    } catch (e) {}
  }

  function injectCosmetic() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = COSMETIC_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeCosmetic() {
    var style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  var CONSENT_STYLE_ID = "__adg_consent_style";
  var CONSENT_CSS =
    "#onetrust-consent-sdk,#onetrust-banner-sdk,#onetrust-pc-sdk,.onetrust-pc-dark-filter,.ot-sdk-container{display:none!important;}";

  function consentAutoOn() {
    if (autoHandle && typeof autoHandle === "object") return autoHandle.cookie_banner !== false;
    if (typeof autoHandle === "boolean") return autoHandle;
    return true;
  }

  function syncConsentStyle() {
    var on = enabled && consentAutoOn();
    var style = document.getElementById(CONSENT_STYLE_ID);
    if (on && !style) {
      style = document.createElement("style");
      style.id = CONSENT_STYLE_ID;
      style.textContent = CONSENT_CSS;
      (document.head || document.documentElement).appendChild(style);
    } else if (!on && style) {
      style.remove();
    }
  }

  function siteAllowed() {
    var host = "";
    try {
      host = location.hostname.toLowerCase();
    } catch (e) {}
    if (!host) return false;
    for (var i = 0; i < whitelist.length; i++) {
      var domain = whitelist[i];
      if (host === domain || host.endsWith("." + domain)) return true;
    }
    return false;
  }

  function applyState() {
    enabled = globalEnabled && !siteAllowed();
    broadcastConfig();
    if (enabled) {
      injectCosmetic();
      startFrameCleaner();
    } else {
      removeCosmetic();
    }
    syncConsentStyle();
  }

  function urlFromMeta(content) {
    var match = /url\s*=\s*['"]?([^'";]+)/i.exec(content || "");
    return match ? match[1].trim() : "";
  }

  function scrubMeta() {
    if (!enabled) return;
    var metas = document.querySelectorAll('meta[http-equiv="refresh" i]');
    for (var i = 0; i < metas.length; i++) {
      var meta = metas[i];
      var target = urlFromMeta(meta.getAttribute("content"));
      if (!target) continue;
      if (P && P.isAdUrl(target, location.href)) {
        meta.remove();
        report("redirect", target);
        continue;
      }
      if (!P || !P.sameSite(location.href, target)) {
        meta.remove();
        report("redirect", target);
      }
    }
  }

  function scheduleMeta() {
    if (metaScheduled) return;
    metaScheduled = true;
    queueMicrotask(function () {
      metaScheduled = false;
      scrubMeta();
    });
  }

  function startMetaGuard() {
    scrubMeta();
    try {
      var observer = new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          if (records[i].addedNodes && records[i].addedNodes.length) {
            scheduleMeta();
            scheduleScan();
            return;
          }
        }
      });
      observer.observe(document.documentElement || document, { childList: true, subtree: true });
    } catch (e) {}
  }

  chrome.storage.local.get({ enabled: true, whitelist: [] }, function (cfg) {
    globalEnabled = cfg.enabled !== false;
    whitelist = Array.isArray(cfg.whitelist) ? cfg.whitelist : [];
    autoHandle = cfg.autoHandle === undefined ? null : cfg.autoHandle;
    applyState();
    startMetaGuard();
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    var changed = false;
    if (changes.enabled) {
      globalEnabled = changes.enabled.newValue !== false;
      changed = true;
    }
    if (changes.whitelist) {
      whitelist = Array.isArray(changes.whitelist.newValue) ? changes.whitelist.newValue : [];
      changed = true;
    }
    if (changes.autoHandle) {
      autoHandle = changes.autoHandle.newValue === undefined ? null : changes.autoHandle.newValue;
      syncConsentStyle();
      broadcastConfig();
    }
    if (changed) applyState();
  });

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message) return;
    if (message.type === "adg:getChecks") {
      sendResponse({ checks: lastChecks || readChecksAttr(), enabled: enabled });
      return;
    }
    if (message.type === "adg:setEnabled") {
      globalEnabled = !!message.enabled;
      applyState();
      return;
    }
    if (message.type === "adg:setWhitelist") {
      whitelist = Array.isArray(message.whitelist) ? message.whitelist : [];
      applyState();
      return;
    }
    if (message.type === "adg:setAutoHandle") {
      autoHandle = message.autoHandle === undefined ? null : message.autoHandle;
      syncConsentStyle();
      broadcastConfig();
    }
  });

  function readChecksAttr() {
    try {
      var raw = document.documentElement && document.documentElement.getAttribute("data-adg-checks");
      if (!raw) return null;
      var checks = JSON.parse(raw);
      lastChecks = checks;
      return checks;
    } catch (e) {
      return null;
    }
  }

  [300, 800, 1600, 3000, 5000].forEach(function (ms) {
    setTimeout(function () {
      if (readChecksAttr()) {
        send({ type: "adg:checks", checks: lastChecks, enabled: enabled });
      }
    }, ms);
  });

  var isTopFrame = false;
  try {
    isTopFrame = window.top === window;
  } catch (e) {
    isTopFrame = false;
  }

  [400, 1200, 3000, 6000, 9000].forEach(function (ms) {
    setTimeout(function () {
      if (!isTopFrame) return;
      try {
        var raw = document.documentElement && document.documentElement.getAttribute("data-adg-tech");
        if (raw) send({ type: "adg:tech", techs: JSON.parse(raw) });
      } catch (e) {}
    }, ms);
  });

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (data && data.__adgChecks === 1) {
      lastChecks = data.checks || null;
      send({ type: "adg:checks", checks: data.checks, enabled: data.enabled });
      return;
    }
    if (data && data.__adgSec === 1) {
      if (!enabled) return;
      send({
        type: "adg:security",
        kind: data.kind,
        severity: data.severity,
        host: data.host,
        detail: data.detail,
        handled: data.handled
      });
      return;
    }
    if (data && data.__adgTech === 1) {
      var isTop = false;
      try {
        isTop = window.top === window;
      } catch (e) {
        isTop = false;
      }
      if (isTop) send({ type: "adg:tech", techs: data.techs || [] });
      return;
    }
    if (!data || data.__adg !== 1) return;
    if (!enabled) return;
    report(data.kind, data.detail);
  });

  document.addEventListener(
    "click",
    function (event) {
      if (!enabled) return;
      var node = event.target;
      var anchor = node && node.closest ? node.closest("a[href]") : null;
      if (!anchor) return;
      var href = anchor.href;
      if (P && P.isAdUrl(href, location.href)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        report("popup", "click:" + href);
      }
    },
    true
  );
})();
