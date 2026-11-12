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

  try {
    if (
      location.hostname === "challenges.cloudflare.com" ||
      location.hostname.endsWith(".challenges.cloudflare.com") ||
      location.pathname.indexOf("/cdn-cgi/challenge-platform/") === 0
    ) {
      return;
    }
  } catch (e) {}

  var P = globalThis.__ADG_PATTERNS;
  var enabled = true;
  var autoHandle = null;
  var postMessageNative = window.postMessage.bind(window);
  var reported = Object.create(null);
  var reportCount = 0;
  var secretCache = { at: 0, values: [] };
  var cap = {
    network: false,
    cookie: false,
    domain: false,
    clipboard: false,
    credentials: false,
    keys: false,
    script: false,
    dynscript: false,
    frames: false,
    media: false,
    geo: false,
    payment: false,
    postmessage: false,
    canvas: false,
    consent: false
  };

  var SENSITIVE_RE =
    /(password|passwd|pwd|pass|token|session|auth|api[_-]?key|secret|credit|card[_-]?number|cvv|ssn|nik|otp|email)["']?\s*[:=]/i;

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (data && data.__adgCfg === 1) {
      enabled = !!data.enabled;
      if (data.autoHandle !== undefined) autoHandle = data.autoHandle;
      announceChecks();
    }
  });

  function report(kind, severity, detail, handled) {
    if (!enabled) return false;
    var key = kind + "|" + (detail || "").slice(0, 80);
    if (!reported[key] && reportCount <= 100) {
      reported[key] = true;
      reportCount += 1;
      try {
        postMessageNative(
          {
            __adgSec: 1,
            kind: kind,
            severity: severity,
            host: location.hostname,
            detail: detail || "",
            handled: !!handled
          },
          "*"
        );
      } catch (e) {}
    }
    return !!handled;
  }

  function autoFor(kind) {
    if (autoHandle && typeof autoHandle === "object") return autoHandle[kind] !== false;
    if (typeof autoHandle === "boolean") return autoHandle;
    return true;
  }

  var cfChallenge = false;

  function isCloudflareChallenge() {
    if (cfChallenge) return true;
    try {
      if (location.hostname === "challenges.cloudflare.com") {
        cfChallenge = true;
        return true;
      }
      if (location.hostname.endsWith(".challenges.cloudflare.com")) {
        cfChallenge = true;
        return true;
      }
      if (location.pathname.indexOf("/cdn-cgi/") === 0) {
        cfChallenge = true;
        return true;
      }
      if (window._cf_chl_opt) {
        cfChallenge = true;
        return true;
      }
      if (
        /just a moment|attention required|security verification|verifying you are human|checking your browser/i.test(
          document.title || ""
        )
      ) {
        cfChallenge = true;
        return true;
      }
      if (
        document.querySelector(
          'script[src*="challenges.cloudflare.com"], script[src*="/cdn-cgi/challenge-platform/"]'
        )
      ) {
        cfChallenge = true;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function isChallengeResource(host, url) {
    if (!host) return false;
    if (host === "challenges.cloudflare.com" || host.endsWith(".cloudflare.com")) return true;
    if (host.indexOf("hcaptcha.com") !== -1) return true;
    var lower = String(url || "").toLowerCase();
    if (lower.indexOf("recaptcha") !== -1 && (host.indexOf("google.com") !== -1 || host.indexOf("gstatic.com") !== -1)) {
      return true;
    }
    return false;
  }

  function record(kind, severity, detail) {
    var handled = enabled && !isCloudflareChallenge() && autoFor(kind) && severity !== "low";
    report(kind, severity, detail, handled);
    return handled;
  }

  function resolveUrl(url) {
    try {
      return new URL(String(url), location.href).href;
    } catch (e) {
      return String(url || "");
    }
  }

  function hostOf(url) {
    try {
      return new URL(String(url), location.href).hostname.toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function isThirdParty(url) {
    if (!P) return false;
    return !P.sameSite(location.href, resolveUrl(url));
  }

  function bodyToString(body) {
    if (body == null) return "";
    if (typeof body === "string") return body;
    try {
      if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return body.toString();
      if (typeof FormData !== "undefined" && body instanceof FormData) {
        var parts = [];
        body.forEach(function (value, key) {
          if (typeof value === "string") parts.push(key + "=" + value);
        });
        return parts.join("&");
      }
      if (typeof ArrayBuffer !== "undefined" && (body instanceof ArrayBuffer || ArrayBuffer.isView(body))) {
        return "";
      }
      if (typeof Blob !== "undefined" && body instanceof Blob) return "";
      return JSON.stringify(body);
    } catch (e) {
      return "";
    }
  }

  function collectSecrets() {
    var now = Date.now();
    if (now - secretCache.at < 2000) return secretCache.values;
    var values = [];
    try {
      document.cookie.split(";").forEach(function (pair) {
        var idx = pair.indexOf("=");
        if (idx <= 0) return;
        var value = pair.slice(idx + 1).trim();
        if (value.length >= 10 && value.length <= 500) values.push(value);
      });
    } catch (e) {}

    var stores = [];
    try {
      stores.push(localStorage);
    } catch (e) {}
    try {
      stores.push(sessionStorage);
    } catch (e) {}

    for (var s = 0; s < stores.length; s++) {
      try {
        var store = stores[s];
        for (var i = 0; i < store.length && i < 60; i++) {
          var key = store.key(i);
          if (!key || !/(token|auth|session|jwt|secret|api|key|user|email|pass|card)/i.test(key)) continue;
          var value = store.getItem(key);
          if (value && value.length >= 10 && value.length <= 500) values.push(value);
        }
      } catch (e) {}
    }

    secretCache = { at: now, values: values };
    return values;
  }

  function containsSecret(payload, secrets) {
    if (!payload) return false;
    for (var i = 0; i < secrets.length; i++) {
      var secret = secrets[i];
      if (!secret) continue;
      if (payload.indexOf(secret) !== -1) return true;
      try {
        if (payload.indexOf(encodeURIComponent(secret)) !== -1) return true;
      } catch (e) {}
    }
    return false;
  }

  function inspectRequest(url, body, method) {
    if (!enabled || isCloudflareChallenge()) return false;
    try {
      var resolved = resolveUrl(url);
      var host = hostOf(resolved);
      if (!host) return false;
      if (isChallengeResource(host, resolved)) return false;
      if (!isThirdParty(resolved)) return false;

      var bodyText = bodyToString(body);
      var payload = resolved + "\n" + bodyText;

      if (containsSecret(payload, collectSecrets())) {
        return record("secret_exfil", "high", method + " " + host + " (sensitive value matched)");
      }
      if (SENSITIVE_RE.test(payload)) {
        return record("sensitive_post", "medium", method + " " + host + " (sensitive fields)");
      }
      if (bodyText && /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
        return record("ip_endpoint", "medium", method + " " + host);
      }
    } catch (e) {}
    return false;
  }

  function blockedFetchResponse() {
    try {
      return Promise.resolve(new Response("", { status: 403, statusText: "Blocked by Bos" }));
    } catch (e) {
      return Promise.reject(new TypeError("Blocked by Bos"));
    }
  }

  if (typeof window.fetch === "function") {
    var nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      var blocked = false;
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        var method = (init && init.method) || (input && input.method) || "GET";
        var body = (init && init.body) || null;
        blocked = inspectRequest(url, body, String(method).toUpperCase());
      } catch (e) {}
      if (blocked) return blockedFetchResponse();
      return nativeFetch.apply(this, arguments);
    };
    cap.network = true;
  }

  if (typeof XMLHttpRequest !== "undefined") {
    var nativeOpen = XMLHttpRequest.prototype.open;
    var nativeSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__adgMethod = method;
      this.__adgUrl = url;
      return nativeOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      var blocked = false;
      try {
        blocked = inspectRequest(this.__adgUrl, body, String(this.__adgMethod || "GET").toUpperCase());
      } catch (e) {}
      if (blocked) return;
      return nativeSend.apply(this, arguments);
    };
    cap.network = true;
  }

  if (navigator.sendBeacon) {
    var nativeBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      var blocked = false;
      try {
        blocked = inspectRequest(url, data, "BEACON");
      } catch (e) {}
      if (blocked) return false;
      return nativeBeacon.apply(navigator, arguments);
    };
    cap.network = true;
  }

  if (typeof WebSocket !== "undefined" && WebSocket.prototype.send) {
    var nativeWsSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      var blocked = false;
      try {
        blocked = inspectRequest(this.url, data, "WS");
      } catch (e) {}
      if (blocked) return;
      return nativeWsSend.apply(this, arguments);
    };
    cap.network = true;
  }

  function formPayload(form) {
    var action = form.getAttribute("action") || location.href;
    var fields = form.querySelectorAll("input, textarea, select");
    var values = [];
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var name = field.name || field.id;
      if (!name) continue;
      values.push(name + "=" + (field.value || ""));
    }
    return { action: action, body: values.join("&") };
  }

  if (typeof HTMLFormElement !== "undefined" && HTMLFormElement.prototype.submit) {
    var nativeSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function () {
      var blocked = false;
      try {
        var payload = formPayload(this);
        blocked = inspectRequest(payload.action, payload.body, "POST");
      } catch (e) {}
      if (blocked) return;
      return nativeSubmit.apply(this, arguments);
    };
    cap.network = true;
  }

  document.addEventListener(
    "submit",
    function (event) {
      try {
        var form = event.target;
        if (!form || form.tagName !== "FORM") return;
        var payload = formPayload(form);
        if (inspectRequest(payload.action, payload.body, "POST")) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      } catch (e) {}
    },
    true
  );

  function inspectCookieWrite(value) {
    if (!enabled) return false;
    var domainMatch = /(?:^|;)\s*domain\s*=\s*([^;]+)/i.exec(value);
    if (!domainMatch) return false;
    var cookieDomain = domainMatch[1].trim().replace(/^\./, "").toLowerCase();
    if (!cookieDomain) return false;
    var current = location.hostname.toLowerCase();
    if (!current) return false;
    if (current === cookieDomain) return false;
    if (current.endsWith("." + cookieDomain)) return false;
    return record("cross_domain_cookie", "high", "cookie domain=" + cookieDomain);
  }

  try {
    var cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    if (cookieDesc && cookieDesc.set) {
      Object.defineProperty(Document.prototype, "cookie", {
        configurable: true,
        get: cookieDesc.get,
        set: function (value) {
          var blocked = false;
          try {
            blocked = inspectCookieWrite(String(value));
          } catch (e) {}
          if (blocked) return;
          return cookieDesc.set.call(this, value);
        }
      });
      cap.cookie = true;
    }
  } catch (e) {}

  try {
    var domainDesc = Object.getOwnPropertyDescriptor(Document.prototype, "domain");
    if (domainDesc && domainDesc.set) {
      Object.defineProperty(Document.prototype, "domain", {
        configurable: true,
        get: domainDesc.get,
        set: function (value) {
          var blocked = false;
          try {
            blocked = record("document_domain", "medium", String(value));
          } catch (e) {}
          if (blocked) return;
          return domainDesc.set.call(this, value);
        }
      });
      cap.domain = true;
    }
  } catch (e) {}

  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      var nativeRead = navigator.clipboard.readText.bind(navigator.clipboard);
      navigator.clipboard.readText = function () {
        var blocked = record("clipboard_read", "medium", location.hostname);
        if (blocked) {
          try {
            return Promise.reject(new DOMException("Blocked by Bos", "NotAllowedError"));
          } catch (e) {
            return Promise.reject(new Error("Blocked by Bos"));
          }
        }
        return nativeRead.apply(navigator.clipboard, arguments);
      };
      cap.clipboard = true;
    }
  } catch (e) {}

  try {
    if (navigator.credentials && navigator.credentials.get) {
      var nativeCred = navigator.credentials.get.bind(navigator.credentials);
      navigator.credentials.get = function () {
        var blocked = record("credential_access", "high", location.hostname);
        if (blocked) {
          try {
            return Promise.reject(new DOMException("Blocked by Bos", "NotAllowedError"));
          } catch (e) {
            return Promise.reject(new Error("Blocked by Bos"));
          }
        }
        return nativeCred.apply(navigator.credentials, arguments);
      };
      cap.credentials = true;
    }
  } catch (e) {}
  var ALLOWED_KEYS = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1 };
  var keyWrappers = new WeakMap();

  function keyAllowed(event) {
    return !!(event && ALLOWED_KEYS[event.key]);
  }

  function wrapKeyListener(listener) {
    if (typeof listener !== "function" && !(listener && typeof listener.handleEvent === "function")) {
      return listener;
    }
    var cached = keyWrappers.get(listener);
    if (cached) return cached;

    var wrapped = function (event) {
      if (enabled && !isCloudflareChallenge() && autoFor("key_listener") && !keyAllowed(event)) {
        report("key_listener", "medium", "ketikan non-navigasi diblokir", true);
        return undefined;
      }
      if (typeof listener === "function") {
        return listener.apply(this, arguments);
      }
      return listener.handleEvent.apply(listener, arguments);
    };

    keyWrappers.set(listener, wrapped);
    return wrapped;
  }

  try {
    var nativeAdd = EventTarget.prototype.addEventListener;
    var nativeRemove = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function (type, listener, options) {
      try {
        if (
          listener &&
          (type === "keydown" || type === "keypress" || type === "keyup") &&
          (this === window || this === document)
        ) {
          report(
            "key_listener",
            "medium",
            type + " dibatasi: hanya tombol panah",
            enabled && !isCloudflareChallenge() && autoFor("key_listener")
          );
          return nativeAdd.call(this, type, wrapKeyListener(listener), options);
        }
      } catch (e) {}
      return nativeAdd.apply(this, arguments);
    };

    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      try {
        if (
          listener &&
          (type === "keydown" || type === "keypress" || type === "keyup") &&
          keyWrappers.has(listener)
        ) {
          return nativeRemove.call(this, type, keyWrappers.get(listener), options);
        }
      } catch (e) {}
      return nativeRemove.apply(this, arguments);
    };

    cap.keys = true;
  } catch (e) {}

  function analyzeScript(text) {
    if (!text || text.length < 200) return null;

    var reasons = [];
    var strong = 0;
    var score = 0;
    var dataAccess = false;

    var hexCount = (text.match(/\\x[0-9a-fA-F]{2}/g) || []).length;
    var uniCount = (text.match(/\\u[0-9a-fA-F]{4}/g) || []).length;
    var obfIdents = (text.match(/_0x[0-9a-fA-F]{3,}/g) || []).length;
    var hasB64 = /[A-Za-z0-9+/=]{300,}/.test(text);
    var hasEval = /\beval\s*\(/.test(text) || /new\s+Function\s*\(/.test(text);
    var hasDecoder = /\batob\s*\(/.test(text) || /fromCharCode/.test(text) || /unescape\s*\(/.test(text);

    if (obfIdents > 3) {
      strong += 1;
      score += 3;
      reasons.push("identifier _0x");
    }
    if (hexCount > 20) {
      strong += 1;
      score += 3;
      reasons.push("escape hex");
    } else if (hexCount > 5) {
      score += 1;
    }
    if (uniCount > 20) {
      strong += 1;
      score += 2;
      reasons.push("escape unicode");
    } else if (uniCount > 5) {
      score += 1;
    }
    if (hasB64) score += 2;
    if (hasB64 && hasDecoder) {
      strong += 1;
      reasons.push("string base64 + decoder");
    }
    if (hasEval) {
      score += 2;
      reasons.push("eval/Function");
      if (hexCount > 5 || obfIdents > 3) strong += 1;
    }
    if (hasDecoder) {
      score += 1;
      reasons.push("decoder");
    }
    if (/document\.cookie|localStorage|sessionStorage/.test(text)) {
      dataAccess = true;
      score += 3;
      reasons.push("akses cookie/storage");
    }
    if (/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(text)) {
      dataAccess = true;
      score += 2;
      reasons.push("kirim data jaringan");
    }
    if (/document\.write/.test(text)) score += 1;
    if (text.length > 4000) score += 1;

    if (!strong) {
      if (score >= 3) {
        return { severity: "low", reason: "indikasi ringan: " + reasons.join(", "), score: score };
      }
      return null;
    }

    return {
      severity: dataAccess ? "high" : "medium",
      reason: "obfuscated: " + reasons.join(", "),
      score: score
    };
  }

  function neutralizeScript(el) {
    try {
      el.type = "text/plain";
      el.textContent = "";
    } catch (e) {}
  }

  function handleScript(el) {
    if (!enabled || !el || el.nodeType !== 1 || el.tagName !== "SCRIPT") return;

    var src = "";
    try {
      src = el.getAttribute("src") || "";
    } catch (e) {}

    if (src) {
      var lower = src.toLowerCase();
      var host = P ? P.hostOf(src) : "";
      if (isChallengeResource(host, lower)) return;
      var bad =
        lower.indexOf("data:") === 0 ||
        lower.indexOf("blob:") === 0 ||
        /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
      if (bad) {
        var handledSrc = record("dynamic_script", "high", "script dari " + (host || lower.slice(0, 20)));
        if (handledSrc) neutralizeScript(el);
      }
      return;
    }

    var text = "";
    try {
      text = el.textContent || "";
    } catch (e) {}

    if (
      text.indexOf("_cf_chl_opt") !== -1 ||
      text.indexOf("cf_chl") !== -1 ||
      text.indexOf("challenge-platform") !== -1 ||
      text.indexOf("cf-browser-verification") !== -1
    ) {
      return;
    }

    var verdict = analyzeScript(text);
    if (!verdict) return;
    var handled = enabled && !isCloudflareChallenge() && autoFor("obfuscated_script") && verdict.severity !== "low";
    report("obfuscated_script", verdict.severity, verdict.reason, handled);
    if (handled) neutralizeScript(el);
  }

  function checkInlineScript(node) {
    handleScript(node);
  }

  function scanInlineScripts() {
    if (!enabled) return;
    var scripts = document.querySelectorAll("script:not([src])");
    for (var i = 0; i < scripts.length; i++) checkInlineScript(scripts[i]);
  }

  try {
    var scriptObserver = new MutationObserver(function (records) {
      if (!enabled) return;
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (!node || node.nodeType !== 1) continue;
          if (node.tagName === "SCRIPT" && !node.src) {
            checkInlineScript(node);
          } else if (node.querySelectorAll) {
            var inner = node.querySelectorAll("script:not([src])");
            for (var k = 0; k < inner.length; k++) checkInlineScript(inner[k]);
          }
        }
      }
    });
    scriptObserver.observe(document.documentElement || document, { childList: true, subtree: true });
    cap.script = true;
  } catch (e) {}

  document.addEventListener("DOMContentLoaded", scanInlineScripts, { once: true });

  try {
    var hookInsert = function (method) {
      var native = Node.prototype[method];
      if (!native) return;
      Node.prototype[method] = function (node) {
        try {
          handleScript(node);
        } catch (e) {}
        return native.apply(this, arguments);
      };
    };
    hookInsert("appendChild");
    hookInsert("insertBefore");
    hookInsert("replaceChild");

    if (Element.prototype.append) {
      var nativeAppendEl = Element.prototype.append;
      Element.prototype.append = function () {
        try {
          for (var i = 0; i < arguments.length; i++) handleScript(arguments[i]);
        } catch (e) {}
        return nativeAppendEl.apply(this, arguments);
      };
    }
    if (Element.prototype.prepend) {
      var nativePrependEl = Element.prototype.prepend;
      Element.prototype.prepend = function () {
        try {
          for (var i = 0; i < arguments.length; i++) handleScript(arguments[i]);
        } catch (e) {}
        return nativePrependEl.apply(this, arguments);
      };
    }
    cap.dynscript = true;
  } catch (e) {}

  function iframeHidden(frame) {
    try {
      if (frame.hidden) return true;
      var w = frame.getAttribute("width");
      var h = frame.getAttribute("height");
      if (w !== null && h !== null && (parseInt(w, 10) <= 1 || parseInt(h, 10) <= 1)) return true;
      var cs = getComputedStyle(frame);
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity || "1") === 0) return true;
      if (frame.offsetWidth <= 1 && frame.offsetHeight <= 1) return true;
    } catch (e) {}
    return false;
  }

  function iframeOverlay(frame) {
    try {
      var cs = getComputedStyle(frame);
      if (cs.position !== "fixed" && cs.position !== "absolute") return false;
      if (frame.offsetWidth * frame.offsetHeight < window.innerWidth * window.innerHeight * 0.5) return false;
      var z = parseInt(cs.zIndex, 10);
      return !isNaN(z) && z >= 1000;
    } catch (e) {
      return false;
    }
  }

  function hideFrame(frame) {
    try {
      frame.style.setProperty("display", "none", "important");
      frame.setAttribute("aria-hidden", "true");
    } catch (e) {}
  }

  function scanFrames() {
    if (!enabled || !P || isCloudflareChallenge()) return;
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      var src = "";
      try {
        src = frame.getAttribute("src") || "";
      } catch (e) {}
      if (!src || src.indexOf("about:") === 0 || src.indexOf("blob:") === 0) continue;
      if (P.sameSite(location.href, src)) continue;
      var host = P.hostOf(src);
      if (isChallengeResource(host, src)) continue;
      if (iframeOverlay(frame)) {
        if (record("hidden_iframe", "high", "overlay lintas situs " + host)) hideFrame(frame);
      } else if (iframeHidden(frame)) {
        if (record("hidden_iframe", "medium", "iframe tersembunyi " + host)) hideFrame(frame);
      }
    }
  }

  var frameScanScheduled = false;
  function scheduleFrameScan() {
    if (frameScanScheduled) return;
    frameScanScheduled = true;
    setTimeout(function () {
      frameScanScheduled = false;
      scanFrames();
    }, 150);
  }

  try {
    var frameObserver = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].addedNodes && records[i].addedNodes.length) {
          scheduleFrameScan();
          return;
        }
      }
    });
    frameObserver.observe(document.documentElement || document, { childList: true, subtree: true });
    cap.frames = true;
  } catch (e) {}

  [500, 1500, 3500].forEach(function (ms) {
    setTimeout(scanFrames, ms);
  });

  try {
    if (navigator.mediaDevices) {
      if (navigator.mediaDevices.getUserMedia) {
        var nativeGum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = function (constraints) {
          var parts = [];
          if (constraints && constraints.audio) parts.push("mikrofon");
          if (constraints && constraints.video) parts.push("kamera");
          var blocked = record("media_capture", "high", parts.join("+") || "media");
          if (blocked) return Promise.reject(new DOMException("Blocked by Bos", "NotAllowedError"));
          return nativeGum.apply(navigator.mediaDevices, arguments);
        };
        cap.media = true;
      }
      if (navigator.mediaDevices.getDisplayMedia) {
        var nativeGdm = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getDisplayMedia = function () {
          var blocked = record("media_capture", "high", "rekam layar");
          if (blocked) return Promise.reject(new DOMException("Blocked by Bos", "NotAllowedError"));
          return nativeGdm.apply(navigator.mediaDevices, arguments);
        };
        cap.media = true;
      }
    }
  } catch (e) {}

  try {
    if (navigator.geolocation) {
      var geo = navigator.geolocation;
      var nativeGeo = geo.getCurrentPosition.bind(geo);
      var nativeWatch = geo.watchPosition ? geo.watchPosition.bind(geo) : null;

      geo.getCurrentPosition = function (success, error) {
        var blocked = record("geolocation", "medium", "getCurrentPosition");
        if (blocked) {
          if (typeof error === "function") {
            setTimeout(function () {
              error({ code: 1, message: "Blocked by Bos" });
            }, 0);
          }
          return;
        }
        return nativeGeo.apply(geo, arguments);
      };

      if (nativeWatch) {
        geo.watchPosition = function (success, error) {
          var blocked = record("geolocation", "medium", "watchPosition");
          if (blocked) {
            if (typeof error === "function") {
              setTimeout(function () {
                error({ code: 1, message: "Blocked by Bos" });
              }, 0);
            }
            return 0;
          }
          return nativeWatch.apply(geo, arguments);
        };
      }
      cap.geo = true;
    }
  } catch (e) {}

  try {
    if (typeof window.PaymentRequest === "function") {
      var NativePaymentRequest = window.PaymentRequest;
      window.PaymentRequest = function () {
        var blocked = record("payment_request", "high", "PaymentRequest dipanggil");
        if (blocked) throw new DOMException("Blocked by Bos", "NotAllowedError");
        return Reflect.construct(NativePaymentRequest, arguments, NativePaymentRequest);
      };
      window.PaymentRequest.prototype = NativePaymentRequest.prototype;
      cap.payment = true;
    }
  } catch (e) {}

  try {
    var nativePost = window.postMessage;
    window.postMessage = function (message, targetOrigin) {
      try {
        if (enabled) {
          var target = typeof targetOrigin === "string" ? targetOrigin : "";
          var isStar = target === "*" || target === "" || target === "/";
          var thirdParty = false;
          if (target && !isStar && P) thirdParty = !P.sameSite(location.href, target);
          if (isStar || thirdParty) {
            var payload = bodyToString(message);
            var challengePayload = /cf[-_]chl|challenge-platform|turnstile|hcaptcha|recaptcha/i.test(payload);
            var secret = containsSecret(payload, collectSecrets());
            if (!challengePayload && (secret || (thirdParty && SENSITIVE_RE.test(payload)))) {
              var handledMsg = !isCloudflareChallenge() && autoFor("postmessage_leak");
              report(
                "postmessage_leak",
                thirdParty ? "high" : "medium",
                "postMessage ke " + (isStar ? "*" : target),
                handledMsg
              );
              if (handledMsg) return;
            }
          }
        }
      } catch (e) {}
      return nativePost.apply(this, arguments);
    };
    cap.postmessage = true;
  } catch (e) {}

  try {
    if (typeof HTMLCanvasElement !== "undefined") {
      if (HTMLCanvasElement.prototype.toDataURL) {
        var nativeToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function () {
          report("canvas_fingerprint", "low", "canvas.toDataURL", false);
          return nativeToDataURL.apply(this, arguments);
        };
        cap.canvas = true;
      }
      if (HTMLCanvasElement.prototype.getImageData) {
        var nativeGetImageData = HTMLCanvasElement.prototype.getImageData;
        HTMLCanvasElement.prototype.getImageData = function () {
          report("canvas_fingerprint", "low", "canvas.getImageData", false);
          return nativeGetImageData.apply(this, arguments);
        };
        cap.canvas = true;
      }
    }
  } catch (e) {}

  function clickOneTrustReject() {
    var direct = [
      "#onetrust-reject-all-handler",
      "#onetrust-banner-sdk .ot-pc-refuse-all-handler",
      "#onetrust-pc-sdk .ot-pc-refuse-all-handler",
      "button.ot-pc-refuse-all-handler"
    ];
    for (var i = 0; i < direct.length; i++) {
      var el = document.querySelector(direct[i]);
      if (!el) continue;
      try {
        el.click();
        return true;
      } catch (e) {}
    }

    var buttons = document.querySelectorAll(
      "#onetrust-consent-sdk button, #onetrust-banner-sdk button, #onetrust-pc-sdk button"
    );
    for (var j = 0; j < buttons.length; j++) {
      var text = (buttons[j].textContent || "").trim().toLowerCase();
      if (
        text === "reject all" ||
        text === "reject semua" ||
        text === "tolak semua" ||
        text === "refuse all" ||
        text === "decline"
      ) {
        try {
          buttons[j].click();
          return true;
        } catch (e) {}
      }
    }
    return false;
  }

  function removeConsentBanner() {
    var selectors = [
      "#onetrust-consent-sdk",
      "#onetrust-banner-sdk",
      "#onetrust-pc-sdk",
      ".onetrust-pc-dark-filter",
      ".ot-sdk-container"
    ];
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) {
        try {
          els[j].remove();
        } catch (e) {}
      }
    }
    try {
      if (document.body && document.body.style.overflow === "hidden") document.body.style.overflow = "";
      if (document.documentElement.style.overflow === "hidden") document.documentElement.style.overflow = "";
    } catch (e) {}
  }

  var consentAttempts = 0;
  var consentTimer = null;

  function handleConsent() {
    if (!enabled || !autoFor("cookie_banner")) return;
    var banner = document.querySelector("#onetrust-consent-sdk, #onetrust-banner-sdk, #onetrust-pc-sdk");
    if (!banner) return;

    if (clickOneTrustReject()) {
      if (consentTimer) clearTimeout(consentTimer);
      consentTimer = setTimeout(removeConsentBanner, 1200);
      return;
    }

    if (consentAttempts < 12) {
      consentAttempts += 1;
      setTimeout(handleConsent, 500);
    }
  }

  var consentScheduled = false;
  function scheduleConsent() {
    if (consentScheduled) return;
    consentScheduled = true;
    setTimeout(function () {
      consentScheduled = false;
      handleConsent();
    }, 300);
  }

  try {
    var consentObserver = new MutationObserver(function () {
      scheduleConsent();
    });
    consentObserver.observe(document.documentElement || document, { childList: true, subtree: true });
    [300, 900, 1800, 3500, 6000, 10000].forEach(function (ms) {
      setTimeout(handleConsent, ms);
    });
    cap.consent = true;
  } catch (e) {}

  function buildChecks() {
    return {
      secret_exfil: cap.network && cap.cookie,
      sensitive_post: cap.network,
      ip_endpoint: cap.network,
      cross_domain_cookie: cap.cookie,
      document_domain: cap.domain,
      clipboard_read: cap.clipboard,
      credential_access: cap.credentials,
      key_listener: cap.keys,
      obfuscated_script: cap.script,
      dynamic_script: cap.dynscript,
      hidden_iframe: cap.frames,
      media_capture: cap.media,
      geolocation: cap.geo,
      payment_request: cap.payment,
      postmessage_leak: cap.postmessage,
      canvas_fingerprint: cap.canvas,
      cookie_banner: cap.consent
    };
  }

  function announceChecks() {
    try {
      var checks = buildChecks();
      postMessageNative({ __adgChecks: 1, checks: checks, enabled: enabled }, "*");
      if (document.documentElement) {
        document.documentElement.setAttribute("data-adg-checks", JSON.stringify(checks));
      }
    } catch (e) {}
  }

  [0, 250, 750, 1500, 3000].forEach(function (ms) {
    setTimeout(announceChecks, ms);
  });
  document.addEventListener("DOMContentLoaded", announceChecks, { once: true });
  window.addEventListener("load", announceChecks, { once: true });
})();
