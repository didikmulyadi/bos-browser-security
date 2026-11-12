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

  var isTopFrame = false;
  try {
    isTopFrame = window.top === window;
  } catch (e) {
    isTopFrame = false;
  }
  if (!isTopFrame) return;

  var postNative = window.postMessage.bind(window);
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

  function textHas(text, needle) {
    return text.toLowerCase().indexOf(String(needle).toLowerCase()) !== -1;
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
    { needle: "woocommerce", name: "WooCommerce", category: "E-commerce" },
    { needle: "elementor", name: "Elementor", category: "Page builder" },
    { needle: "cdn.shopify.com", name: "Shopify", category: "E-commerce" },
    { needle: "_next/static", name: "Next.js", category: "JavaScript framework" },
    { needle: "_nuxt/", name: "Nuxt", category: "JavaScript framework" },
    { needle: "gatsby", name: "Gatsby", category: "Static site generator" },
    { needle: "astro", name: "Astro", category: "Static site generator" },
    { needle: "remix", name: "Remix", category: "JavaScript framework" },
    { needle: "@vite/client", name: "Vite", category: "Build tool" },
    { needle: "webpack", name: "Webpack", category: "Build tool" },
    { needle: "prism", name: "Prism.js", category: "Syntax highlighter" },
    { needle: "highlight", name: "Highlight.js", category: "Syntax highlighter" },
    { needle: "leaflet", name: "Leaflet", category: "Maps" },
    { needle: "mapbox-gl", name: "Mapbox GL JS", category: "Maps" },
    { needle: "chart", name: "Chart.js", category: "Visualization" },
    { needle: "pdfjs", name: "PDF.js", category: "Document" },
    { needle: "pdf.js", name: "PDF.js", category: "Document" },
    { needle: "cdnjs", name: "cdnjs", category: "CDN" },
    { needle: "cloudflare", name: "Cloudflare", category: "CDN" }
  ];

  var DOM_MARKERS = [
    { selector: "#__next, script#__NEXT_DATA__", name: "Next.js", category: "JavaScript framework" },
    { selector: "#__nuxt, [data-n-head], script#__NUXT_DATA__", name: "Nuxt", category: "JavaScript framework" },
    { selector: "[data-reactroot], [data-reactid], #root[data-reactroot]", name: "React", category: "JavaScript framework" },
    { selector: "astro-island, [data-astro-cid]", name: "Astro", category: "Static site generator" },
    { selector: "#___gatsby, [data-gatsby]", name: "Gatsby", category: "Static site generator" },
    { selector: "[data-v-app], #app[data-v-app]", name: "Vue.js", category: "JavaScript framework" },
    { selector: "[data-svelte-h], [class*='svelte-']", name: "Svelte", category: "JavaScript framework" },
    { selector: "link[href*='/wp-content/'], link[href*='/wp-includes/']", name: "WordPress", category: "CMS" },
    { selector: ".shopify-section, script[src*='cdn.shopify.com']", name: "Shopify", category: "E-commerce" },
    { selector: "html[data-wf-site], html[data-wf-page]", name: "Webflow", category: "Website builder" },
    { selector: "script[src*='googletagmanager.com/gtm.js']", name: "Google Tag Manager", category: "Analytics" },
    { selector: "script[src*='googletagmanager.com/gtag']", name: "Google Analytics", category: "Analytics" },
    { selector: "img[src*='facebook.com/tr'], script[src*='connect.facebook.net']", name: "Facebook Pixel", category: "Analytics" },
    { selector: "script[src*='clarity.ms']", name: "Microsoft Clarity", category: "Analytics" },
    { selector: "link[href*='fonts.googleapis.com']", name: "Google Fonts", category: "Font/Icon" },
    { selector: "link[href*='font-awesome'], link[href*='fontawesome']", name: "Font Awesome", category: "Font/Icon" },
    { selector: "script[src*='stripe.com']", name: "Stripe.js", category: "Payments" },
    { selector: "script[src*='recaptcha']", name: "reCAPTCHA", category: "Security" },
    { selector: "script[src*='challenges.cloudflare.com']", name: "Cloudflare Turnstile", category: "Security" }
  ];

  var COOKIE_MARKERS = [
    { needle: "phpsessid", name: "PHP", category: "Programming language" },
    { needle: "laravel_session", name: "Laravel", category: "Web framework" },
    { needle: "wordpress_", name: "WordPress", category: "CMS" },
    { needle: "wp-settings", name: "WordPress", category: "CMS" },
    { needle: "_shopify", name: "Shopify", category: "E-commerce" },
    { needle: "__cf_bm", name: "Cloudflare", category: "CDN" },
    { needle: "_ga", name: "Google Analytics", category: "Analytics" },
    { needle: "_gid", name: "Google Analytics", category: "Analytics" },
    { needle: "asp.net_sessionid", name: "ASP.NET", category: "Web framework" },
    { needle: "jsessionid", name: "Java", category: "Programming language" },
    { needle: "csrftoken", name: "Django", category: "Web framework" },
    { needle: "ci_session", name: "CodeIgniter", category: "Web framework" },
    { needle: "_rails", name: "Ruby on Rails", category: "Web framework" },
    { needle: "_session_id", name: "Ruby on Rails", category: "Web framework" }
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
      if (w.__remixContext) add("Remix", "JavaScript framework", "");
      if (w.___gatsby || w.gatsby) add("Gatsby", "Static site generator", "");
      if (w.dataLayer) add("Google Tag Manager", "Analytics", "");
      if (w.gtag) add("Google Analytics", "Analytics", "");
      if (w.ga) add("Google Analytics", "Analytics", "");
      if (w.fbq) add("Facebook Pixel", "Analytics", "");
      if (w.hj) add("Hotjar", "Analytics", "");
      if (w.clarity) add("Microsoft Clarity", "Analytics", "");
      if (w.webpackChunk || w.webpackJsonp) add("Webpack", "Build tool", "");
      if (w.__vite_plugin_react_preamble_installed__) {
        add("Vite", "Build tool", "");
        add("React", "JavaScript framework", "");
      }
      if (w.wp && w.wp.version) add("WordPress", "CMS", cleanVersion(w.wp.version));
    });
  }

  function scanUrls() {
    var nodes = document.querySelectorAll("script[src], link[href]");
    for (var i = 0; i < nodes.length; i++) {
      var url = nodes[i].src || nodes[i].href || "";
      if (!url) continue;
      for (var j = 0; j < ASSET_SIGNATURES.length; j++) {
        var sig = ASSET_SIGNATURES[j];
        if (urlMatches(url, sig.needle)) add(sig.name, sig.category, versionFromUrl(url));
      }
    }

    try {
      var entries = performance.getEntriesByType("resource");
      for (var k = 0; k < entries.length; k++) {
        var resource = entries[k].name || "";
        if (!resource) continue;
        for (var m = 0; m < ASSET_SIGNATURES.length; m++) {
          var rsig = ASSET_SIGNATURES[m];
          if (urlMatches(resource, rsig.needle)) add(rsig.name, rsig.category, versionFromUrl(resource));
        }
      }
    } catch (e) {}
  }

  function scanDom() {
    for (var i = 0; i < DOM_MARKERS.length; i++) {
      var marker = DOM_MARKERS[i];
      try {
        if (document.querySelector(marker.selector)) add(marker.name, marker.category, "");
      } catch (e) {}
    }
    try {
      var ng = document.querySelector("[ng-version]");
      if (ng) add("Angular", "JavaScript framework", cleanVersion(ng.getAttribute("ng-version")));
    } catch (e) {}
  }

  function scanCookies() {
    var cookie = "";
    try {
      cookie = document.cookie || "";
    } catch (e) {}
    if (!cookie) return;
    var names = cookie.split(";").map(function (pair) {
      var index = pair.indexOf("=");
      return (index >= 0 ? pair.slice(0, index) : pair).trim().toLowerCase();
    });
    for (var i = 0; i < COOKIE_MARKERS.length; i++) {
      var marker = COOKIE_MARKERS[i];
      for (var j = 0; j < names.length; j++) {
        if (names[j].indexOf(marker.needle) !== -1) {
          add(marker.name, marker.category, "");
          break;
        }
      }
    }
  }

  function scanInlineScripts() {
    var scripts = document.querySelectorAll("script:not([src])");
    var text = "";
    for (var i = 0; i < scripts.length; i++) {
      text += (scripts[i].textContent || "").slice(0, 50000);
      if (text.length > 300000) break;
    }
    if (!text) return;

    var patterns = [
      ["__NEXT_DATA__", "Next.js", "JavaScript framework"],
      ["__NUXT__", "Nuxt", "JavaScript framework"],
      ["__remixContext", "Remix", "JavaScript framework"],
      ["___gatsby", "Gatsby", "Static site generator"],
      ["webpackChunk", "Webpack", "Build tool"],
      ["webpackJsonp", "Webpack", "Build tool"],
      ["wp-content", "WordPress", "CMS"],
      ["Shopify", "Shopify", "E-commerce"],
      ["googletagmanager", "Google Tag Manager", "Analytics"],
      ["gtag(", "Google Analytics", "Analytics"],
      ["dataLayer", "Google Tag Manager", "Analytics"],
      ["clarity.ms", "Microsoft Clarity", "Analytics"],
      ["hotjar", "Hotjar", "Analytics"],
      ["fbq(", "Facebook Pixel", "Analytics"],
      ["astro-island", "Astro", "Static site generator"],
      ["data-v-app", "Vue.js", "JavaScript framework"],
      ["ng-version", "Angular", "JavaScript framework"]
    ];

    for (var p = 0; p < patterns.length; p++) {
      if (textHas(text, patterns[p][0])) add(patterns[p][1], patterns[p][2], "");
    }
  }

  var IMPLIES = {
    woocommerce: [["WordPress", "CMS"]],
    elementor: [["WordPress", "CMS"]],
    "next.js": [
      ["React", "JavaScript framework"],
      ["Node.js", "Runtime"]
    ],
    nuxt: [
      ["Vue.js", "JavaScript framework"],
      ["Node.js", "Runtime"]
    ],
    gatsby: [["React", "JavaScript framework"]],
    remix: [["React", "JavaScript framework"]],
    laravel: [["PHP", "Programming language"]],
    codeigniter: [["PHP", "Programming language"]],
    django: [["Python", "Programming language"]],
    "ruby on rails": [["Ruby", "Programming language"]],
    "asp.net": [[".NET", "Programming language"]]
  };

  function applyImplies() {
    var keys = Object.keys(IMPLIES);
    for (var i = 0; i < keys.length; i++) {
      if (!found[keys[i]]) continue;
      var targets = IMPLIES[keys[i]];
      for (var j = 0; j < targets.length; j++) {
        add(targets[j][0], targets[j][1], "");
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
      if (document.documentElement) {
        document.documentElement.setAttribute("data-adg-tech", JSON.stringify(list));
      }
    } catch (e) {}

    try {
      postNative({ __adgTech: 1, techs: list }, "*");
    } catch (e) {}
  }

  function run() {
    scanGlobals();
    scanUrls();
    scanDom();
    scanCookies();
    scanInlineScripts();
    applyImplies();
    report();
  }

  document.addEventListener("DOMContentLoaded", run, { once: true });
  window.addEventListener("load", run, { once: true });
  [300, 1000, 2500, 5000, 9000].forEach(function (ms) {
    setTimeout(run, ms);
  });
})();
