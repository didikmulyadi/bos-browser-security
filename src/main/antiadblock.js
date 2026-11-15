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

  var enabled = true;
  var BAIT_RE = /adsbygoogle\.js|pagead2\.googlesyndication\.com/i;

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (data && data.__adgCfg === 1) enabled = !!data.enabled;
  });

  function isProbe(url) {
    return BAIT_RE.test(String(url || ""));
  }

  var nativeFetch = window.fetch;
  if (typeof nativeFetch === "function") {
    window.fetch = function (input, init) {
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        if (enabled && isProbe(url)) {
          return Promise.resolve(
            new Response("/* bos: ads probe stub */", {
              status: 200,
              statusText: "OK",
              headers: { "content-type": "application/javascript" }
            })
          );
        }
      } catch (e) {}
      return nativeFetch.apply(this, arguments);
    };
  }
})();
