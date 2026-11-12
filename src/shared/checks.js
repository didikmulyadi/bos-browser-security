(function (root) {
  var keys = [
    "secret_exfil",
    "sensitive_post",
    "ip_endpoint",
    "cross_domain_cookie",
    "document_domain",
    "clipboard_read",
    "credential_access",
    "key_listener",
    "obfuscated_script",
    "dynamic_script",
    "hidden_iframe",
    "media_capture",
    "geolocation",
    "payment_request",
    "postmessage_leak",
    "canvas_fingerprint",
    "cookie_banner"
  ];

  var defaults = {};
  for (var i = 0; i < keys.length; i++) defaults[keys[i]] = true;

  function normalize(value) {
    var out = {};
    var legacy = typeof value === "boolean" ? value : true;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (value && typeof value === "object" && typeof value[key] === "boolean") {
        out[key] = value[key];
      } else {
        out[key] = legacy;
      }
    }
    return out;
  }

  root.__ADG_AUTO_KEYS = keys;
  root.__ADG_AUTO_DEFAULTS = defaults;
  root.__ADG_normalizeAuto = normalize;
})(typeof globalThis !== "undefined" ? globalThis : self);
