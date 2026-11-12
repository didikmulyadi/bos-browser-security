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

  var found = Object.create(null);

  function add(name, category, version) {
    if (!name) return;
    var key = name.toLowerCase();
    var entry = found[key];
    if (!entry) {
      found[key] = { name: name, category: category || "Lainnya", version: version || "" };
      return;
    }
    if (!entry.version && version) entry.version = version;
  }

  function safe(fn) {
    try {
      fn();
    } catch (e) {}
  }

  function cleanVersion(value) {
    if (value == null) return "";
    var text = String(value).trim();
    if (!/^\d+(\.\d+){0,3}([-.][0-9a-z.]+)?$/i.test(text)) return "";
    return text;
  }

  function versionFromUrl(url) {
    var match = /[?&](?:v|ver|version)=([\d.]+)/i.exec(url);
    if (match) return cleanVersion(match[1]);
    match = /[@/-](\d+\.\d+(?:\.\d+)?)(?:[/?._-]|$)/.exec(url);
    if (match) return cleanVersion(match[1]);
    return "";
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function urlMatches(url, needle) {
    var re = new RegExp("(?:^|[/@._-])" + escapeRegExp(needle) + "(?:[.@/_-]|$)", "i");
    return re.test(url);
  }

  var ASSET_SIGNATURES = [
    { needle: "jquery-ui", name: "jQuery UI", category: "UI library" },
    { needle: "jquery", name: "jQuery", category: "JavaScript library" },
    { needle: "bootstrap", name: "Bootstrap", category: "CSS framework" },
    { needle: "react-dom", name: "React DOM", category: "JavaScript library" },
    { needle: "react", name: "React", category: "JavaScript framework" },
    { needle: "vue", name: "Vue.js", category: "JavaScript framework" },
    { needle: "angular", name: "Angular", category: "JavaScript framework" },
    { needle: "alpine", name: "Alpine.js", category: "JavaScript framework" },
    { needle: "svelte", name: "Svelte", category: "JavaScript framework" },
    { needle: "lodash", name: "Lodash", category: "JavaScript library" },
    { needle: "moment", name: "Moment.js", category: "JavaScript library" },
    { needle: "dayjs", name: "Day.js", category: "JavaScript library" },
    { needle: "d3", name: "D3.js", category: "Visualization" },
    { needle: "gsap", name: "GSAP", category: "Animation" },
    { needle: "three", name: "Three.js", category: "3D library" },
    { needle: "swiper", name: "Swiper", category: "UI library" },
    { needle: "axios", name: "Axios", category: "HTTP client" },
    { needle: "htmx", name: "htmx", category: "JavaScript library" },
    { needle: "sentry", name: "Sentry", category: "Monitoring" },
    { needle: "stripe", name: "Stripe.js", category: "Payments" },
    { needle: "recaptcha", name: "reCAPTCHA", category: "Security" },
    { needle: "turnstile", name: "Cloudflare Turnstile", category: "Security" },
    { needle: "font-awesome", name: "Font Awesome", category: "Font/Icon" },
    { needle: "fontawesome", name: "Font Awesome", category: "Font/Icon" },
    { needle: "fonts.googleapis.com", name: "Google Fonts", category: "Font/Icon" },
    { needle: "googletagmanager.com/gtm.js", name: "Google Tag Manager", category: "Analytics" },
    { needle: "googletagmanager.com/gtag", name: "Google Analytics", category: "Analytics" },
    { needle: "google-analytics.com", name: "Google Analytics", category: "Analytics" },
    { needle: "connect.facebook.net", name: "Facebook Pixel", category: "Analytics" },
    { needle: "hotjar", name: "Hotjar", category: "Analytics" },
    { needle: "clarity.ms", name: "Microsoft Clarity", category: "Analytics" },
    { needle: "wp-includes", name: "WordPress", category: "CMS" },
    { needle: "wp-content", name: "WordPress", category: "CMS" },
    { needle: "cdn.shopify.com", name: "Shopify", category: "E-commerce" },
    { needle: "_next/static", name: "Next.js", category: "JavaScript framework" },
    { needle: "_nuxt/", name: "Nuxt", category: "JavaScript framework" },
    { needle: "@vite/client", name: "Vite", category: "Build tool" },
    { needle: "prism", name: "Prism.js", category: "Syntax highlighter" },
    { needle: "highlight", name: "Highlight.js", category: "Syntax highlighter" },
    { needle: "leaflet", name: "Leaflet", category: "Maps" },
    { needle: "mapbox-gl", name: "Mapbox GL JS", category: "Maps" },
    { needle: "pdfjs", name: "PDF.js", category: "Document" },
    { needle: "pdf.js", name: "PDF.js", category: "Document" }
  ];

  function scanGlobals() {
    var w = window;
    safe(function () {
      if (w.jQuery && w.jQuery.fn && w.jQuery.fn.jquery) {
        add("jQuery", "JavaScript library", cleanVersion(w.jQuery.fn.jquery));
      }
      if (w.jQuery && w.jQuery.ui && w.jQuery.ui.version) {
        add("jQuery UI", "UI library", cleanVersion(w.jQuery.ui.version));
      }
      if (w.React && w.React.version) add("React", "JavaScript framework", cleanVersion(w.React.version));
      if (w.ReactDOM && w.ReactDOM.version) add("React DOM", "JavaScript library", cleanVersion(w.ReactDOM.version));
      if (w.Vue && w.Vue.version) add("Vue.js", "JavaScript framework", cleanVersion(w.Vue.version));
      if (w.angular && w.angular.version) {
        add("AngularJS", "JavaScript framework", cleanVersion(w.angular.version.full || w.angular.version));
      }
      if (w.ng && w.ng.version) add("Angular", "JavaScript framework", cleanVersion(w.ng.version.full || w.ng.version));
      if (w.Alpine && w.Alpine.version) add("Alpine.js", "JavaScript framework", cleanVersion(w.Alpine.version));
      if (w.Svelte && w.Svelte.VERSION) add("Svelte", "JavaScript framework", cleanVersion(w.Svelte.VERSION));
      if (w.lodash && w.lodash.VERSION) add("Lodash", "JavaScript library", cleanVersion(w.lodash.VERSION));
      if (w._ && w._.VERSION) add("Underscore.js", "JavaScript library", cleanVersion(w._.VERSION));
      if (w.moment && w.moment.version) add("Moment.js", "JavaScript library", cleanVersion(w.moment.version));
      if (w.dayjs && w.dayjs.version) add("Day.js", "JavaScript library", cleanVersion(w.dayjs.version));
      if (w.d3 && w.d3.version) add("D3.js", "Visualization", cleanVersion(w.d3.version));
      if (w.gsap && w.gsap.version) add("GSAP", "Animation", cleanVersion(w.gsap.version));
      if (w.THREE && w.THREE.REVISION) add("Three.js", "3D library", cleanVersion(w.THREE.REVISION));
      if (w.Swiper && w.Swiper.version) add("Swiper", "UI library", cleanVersion(w.Swiper.version));
      if (w.htmx && w.htmx.version) add("htmx", "JavaScript library", cleanVersion(w.htmx.version));
      if (w.axios && w.axios.VERSION) add("Axios", "HTTP client", cleanVersion(w.axios.VERSION));
      if (w.Sentry && w.Sentry.SDK_VERSION) add("Sentry", "Monitoring", cleanVersion(w.Sentry.SDK_VERSION));
      if (w.Stripe && w.Stripe.version) add("Stripe.js", "Payments", cleanVersion(w.Stripe.version));
      if (w.bootstrap) {
        var bv = w.bootstrap.Tooltip && w.bootstrap.Tooltip.VERSION;
        add("Bootstrap", "CSS framework", cleanVersion(bv));
      }
      if (w.Popper) add("Popper.js", "JavaScript library", "");
      if (w.Ember && w.Ember.VERSION) add("Ember.js", "JavaScript framework", cleanVersion(w.Ember.VERSION));
      if (w.Backbone && w.Backbone.VERSION) add("Backbone.js", "JavaScript library", cleanVersion(w.Backbone.VERSION));
      if (w.Handlebars && w.Handlebars.VERSION) add("Handlebars", "Templating", cleanVersion(w.Handlebars.VERSION));
      if (w.Mustache && w.Mustache.version) add("Mustache", "Templating", cleanVersion(w.Mustache.version));
      if (w.DOMPurify && w.DOMPurify.version) add("DOMPurify", "Security", cleanVersion(w.DOMPurify.version));
      if (w.Chart && w.Chart.version) add("Chart.js", "Visualization", cleanVersion(w.Chart.version));
      if (w.Shopify) add("Shopify", "E-commerce", "");
      if (w.Drupal) add("Drupal", "CMS", cleanVersion(w.Drupal.version));
      if (w.__NEXT_DATA__) add("Next.js", "JavaScript framework", "");
      if (w.__NUXT__ || w.__nuxt) add("Nuxt", "JavaScript framework", "");
      if (w.wp && w.wp.version) add("WordPress", "CMS", cleanVersion(w.wp.version));
    });
  }

  function scanAssets() {
    var nodes = document.querySelectorAll("script[src], link[href]");
    for (var i = 0; i < nodes.length; i++) {
      var url = nodes[i].src || nodes[i].href || "";
      if (!url) continue;
      for (var j = 0; j < ASSET_SIGNATURES.length; j++) {
        var sig = ASSET_SIGNATURES[j];
        if (!urlMatches(url, sig.needle)) continue;
        var version = versionFromUrl(url);
        add(sig.name, sig.category, version);
      }
    }
  }

  function scanMeta() {
    var metas = document.querySelectorAll('meta[name="generator"]');
    var patterns = [
      [/WordPress\s+([\d.]+)/i, "WordPress", "CMS"],
      [/Drupal\s+([\d.]+)/i, "Drupal", "CMS"],
      [/Joomla!?(?:\s+([\d.]+))?/i, "Joomla", "CMS"],
      [/Ghost\s+([\d.]+)/i, "Ghost", "CMS"],
      [/TYPO3\s+([\d.]+)/i, "TYPO3", "CMS"],
      [/Shopify/i, "Shopify", "E-commerce"],
      [/Wix\.com/i, "Wix", "Website builder"],
      [/Squarespace/i, "Squarespace", "Website builder"],
      [/Hugo\s+([\d.]+)/i, "Hugo", "Static site generator"],
      [/Gatsby/i, "Gatsby", "Static site generator"]
    ];
    for (var i = 0; i < metas.length; i++) {
      var content = metas[i].getAttribute("content") || "";
      for (var j = 0; j < patterns.length; j++) {
        var match = patterns[j][0].exec(content);
        if (!match) continue;
        add(patterns[j][1], patterns[j][2], cleanVersion(match[1]));
      }
    }
  }

  function report() {
    var list = Object.keys(found).map(function (key) {
      return found[key];
    });
    list.sort(function (a, b) {
      var cat = (a.category || "").localeCompare(b.category || "");
      if (cat !== 0) return cat;
      return a.name.localeCompare(b.name);
    });
    try {
      window.postMessage({ __adgTech: 1, techs: list }, "*");
    } catch (e) {}
  }

  function run() {
    scanGlobals();
    scanAssets();
    scanMeta();
    report();
  }

  document.addEventListener("DOMContentLoaded", run, { once: true });
  window.addEventListener("load", run, { once: true });
  [300, 1000, 2500, 5000, 9000].forEach(function (ms) {
    setTimeout(run, ms);
  });
})();
