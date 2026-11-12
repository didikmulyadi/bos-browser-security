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
  if (!P) return;

  var enabled = true;

  function report(kind, detail) {
    try {
      window.postMessage({ __adg: 1, kind: kind, detail: detail || "" }, "*");
    } catch (e) {}
  }

  function hasUserActivation() {
    try {
      return !!(navigator.userActivation && navigator.userActivation.isActive);
    } catch (e) {
      return true;
    }
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (data && data.__adgCfg === 1) {
      enabled = !!data.enabled;
    }
  });

  var nativeOpen = window.open;
  window.open = function (url, name, features) {
    if (enabled) {
      var target = url == null ? "" : String(url);
      if (P.isAdUrl(target, location.href)) {
        report("popup", target);
        return null;
      }
      if (!hasUserActivation()) {
        report("popup", target || "about:blank");
        return null;
      }
    }
    return nativeOpen.apply(this, arguments);
  };

  function guardLocation(fnName) {
    var proto = window.Location && window.Location.prototype;
    if (!proto || typeof proto[fnName] !== "function") return;
    var native = proto[fnName];
    try {
      Object.defineProperty(proto, fnName, {
        configurable: true,
        writable: true,
        value: function (url) {
          if (enabled && url != null) {
            var target = String(url);
            var current = location.href;
            if (P.isAdUrl(target, current)) {
              report("redirect", target);
              return;
            }
            if (!hasUserActivation() && !P.sameSite(current, target)) {
              report("redirect", target);
              return;
            }
          }
          return native.apply(this, arguments);
        }
      });
    } catch (e) {}
  }

  guardLocation("assign");
  guardLocation("replace");
})();
