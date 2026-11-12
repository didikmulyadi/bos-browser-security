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

  function safeGet(fn) {
    try {
      return fn();
    } catch (e) {
      return undefined;
    }
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

  function buildUrlRe(needle) {
    return new RegExp("(?:^|[/@._-])" + escapeRegExp(needle) + "(?:[.@/_-]|$)", "i");
  }

  function textHas(text, needle) {
    return text.toLowerCase().indexOf(String(needle).toLowerCase()) !== -1;
  }

  function getPath(path) {
    var parts = path.split(".");
    var current = window;
    for (var i = 0; i < parts.length; i++) {
      if (current == null) return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  var ASSET_SIGNATURES = [
    { needle: "jquery-ui", name: "jQuery UI", category: "UI library" },
    { needle: "jquery-mobile", name: "jQuery Mobile", category: "UI library" },
    { needle: "jquery", name: "jQuery", category: "JavaScript library" },
    { needle: "bootstrap", name: "Bootstrap", category: "CSS framework" },
    { needle: "bulma", name: "Bulma", category: "CSS framework" },
    { needle: "foundation", name: "Foundation", category: "CSS framework" },
    { needle: "materialize", name: "Materialize", category: "CSS framework" },
    { needle: "uikit", name: "UIkit", category: "CSS framework" },
    { needle: "semantic", name: "Semantic UI", category: "CSS framework" },
    { needle: "spectre", name: "Spectre.css", category: "CSS framework" },
    { needle: "tailwind", name: "Tailwind CSS", category: "CSS framework" },
    { needle: "animate.css", name: "Animate.css", category: "Animation" },
    { needle: "font-awesome", name: "Font Awesome", category: "Font/Icon" },
    { needle: "fontawesome", name: "Font Awesome", category: "Font/Icon" },
    { needle: "ionicons", name: "Ionicons", category: "Font/Icon" },
    { needle: "material-icons", name: "Material Icons", category: "Font/Icon" },
    { needle: "fonts.googleapis.com", name: "Google Fonts", category: "Font/Icon" },
    { needle: "react-dom", name: "React DOM", category: "JavaScript library" },
    { needle: "react", name: "React", category: "JavaScript framework" },
    { needle: "preact", name: "Preact", category: "JavaScript framework" },
    { needle: "vue", name: "Vue.js", category: "JavaScript framework" },
    { needle: "angular", name: "Angular", category: "JavaScript framework" },
    { needle: "alpine", name: "Alpine.js", category: "JavaScript framework" },
    { needle: "svelte", name: "Svelte", category: "JavaScript framework" },
    { needle: "solid-js", name: "SolidJS", category: "JavaScript framework" },
    { needle: "qwik", name: "Qwik", category: "JavaScript framework" },
    { needle: "lit", name: "Lit", category: "JavaScript library" },
    { needle: "polymer", name: "Polymer", category: "JavaScript library" },
    { needle: "ember", name: "Ember.js", category: "JavaScript framework" },
    { needle: "backbone", name: "Backbone.js", category: "JavaScript library" },
    { needle: "stimulus", name: "Stimulus", category: "JavaScript framework" },
    { needle: "turbo", name: "Turbo", category: "JavaScript framework" },
    { needle: "htmx", name: "htmx", category: "JavaScript library" },
    { needle: "_next/static", name: "Next.js", category: "JavaScript framework" },
    { needle: "_nuxt/", name: "Nuxt", category: "JavaScript framework" },
    { needle: "gatsby", name: "Gatsby", category: "Static site generator" },
    { needle: "astro", name: "Astro", category: "Static site generator" },
    { needle: "remix", name: "Remix", category: "JavaScript framework" },
    { needle: "sveltekit", name: "SvelteKit", category: "JavaScript framework" },
    { needle: "docusaurus", name: "Docusaurus", category: "Static site generator" },
    { needle: "vitepress", name: "VitePress", category: "Static site generator" },
    { needle: "@vite/client", name: "Vite", category: "Build tool" },
    { needle: "webpack", name: "Webpack", category: "Build tool" },
    { needle: "lodash", name: "Lodash", category: "JavaScript library" },
    { needle: "underscore", name: "Underscore.js", category: "JavaScript library" },
    { needle: "moment", name: "Moment.js", category: "JavaScript library" },
    { needle: "dayjs", name: "Day.js", category: "JavaScript library" },
    { needle: "luxon", name: "Luxon", category: "JavaScript library" },
    { needle: "axios", name: "Axios", category: "HTTP client" },
    { needle: "socket.io", name: "Socket.IO", category: "Realtime" },
    { needle: "peerjs", name: "PeerJS", category: "Realtime" },
    { needle: "crypto-js", name: "CryptoJS", category: "Security" },
    { needle: "dompurify", name: "DOMPurify", category: "Security" },
    { needle: "marked", name: "Marked", category: "Markdown" },
    { needle: "prism", name: "Prism.js", category: "Syntax highlighter" },
    { needle: "highlight", name: "Highlight.js", category: "Syntax highlighter" },
    { needle: "monaco", name: "Monaco Editor", category: "Code editor" },
    { needle: "codemirror", name: "CodeMirror", category: "Code editor" },
    { needle: "tinymce", name: "TinyMCE", category: "Rich text editor" },
    { needle: "ckeditor", name: "CKEditor", category: "Rich text editor" },
    { needle: "quill", name: "Quill", category: "Rich text editor" },
    { needle: "select2", name: "Select2", category: "UI library" },
    { needle: "chosen", name: "Chosen", category: "UI library" },
    { needle: "sweetalert2", name: "SweetAlert2", category: "UI library" },
    { needle: "toastr", name: "Toastr", category: "UI library" },
    { needle: "datatables", name: "DataTables", category: "UI library" },
    { needle: "dropzone", name: "Dropzone", category: "File upload" },
    { needle: "sortable", name: "SortableJS", category: "UI library" },
    { needle: "tippy", name: "Tippy.js", category: "UI library" },
    { needle: "popper", name: "Popper.js", category: "JavaScript library" },
    { needle: "chart.js", name: "Chart.js", category: "Visualization" },
    { needle: "chartjs", name: "Chart.js", category: "Visualization" },
    { needle: "highcharts", name: "Highcharts", category: "Visualization" },
    { needle: "apexcharts", name: "ApexCharts", category: "Visualization" },
    { needle: "echarts", name: "Apache ECharts", category: "Visualization" },
    { needle: "d3", name: "D3.js", category: "Visualization" },
    { needle: "three", name: "Three.js", category: "3D library" },
    { needle: "babylon", name: "Babylon.js", category: "3D library" },
    { needle: "gsap", name: "GSAP", category: "Animation" },
    { needle: "anime", name: "Anime.js", category: "Animation" },
    { needle: "lottie", name: "Lottie", category: "Animation" },
    { needle: "swiper", name: "Swiper", category: "UI library" },
    { needle: "slick", name: "Slick Carousel", category: "UI library" },
    { needle: "owl.carousel", name: "Owl Carousel", category: "UI library" },
    { needle: "splide", name: "Splide", category: "UI library" },
    { needle: "glide", name: "Glide.js", category: "UI library" },
    { needle: "leaflet", name: "Leaflet", category: "Maps" },
    { needle: "mapbox-gl", name: "Mapbox GL JS", category: "Maps" },
    { needle: "pdfjs", name: "PDF.js", category: "Document" },
    { needle: "pdf.js", name: "PDF.js", category: "Document" },
    { needle: "wp-includes", name: "WordPress", category: "CMS" },
    { needle: "wp-content", name: "WordPress", category: "CMS" },
    { needle: "woocommerce", name: "WooCommerce", category: "E-commerce" },
    { needle: "elementor", name: "Elementor", category: "Page builder" },
    { needle: "cdn.shopify.com", name: "Shopify", category: "E-commerce" },
    { needle: "bigcommerce", name: "BigCommerce", category: "E-commerce" },
    { needle: "magento", name: "Magento", category: "E-commerce" },
    { needle: "prestashop", name: "PrestaShop", category: "E-commerce" },
    { needle: "opencart", name: "OpenCart", category: "E-commerce" },
    { needle: "js.stripe.com", name: "Stripe.js", category: "Payments" },
    { needle: "paypal", name: "PayPal", category: "Payments" },
    { needle: "klarna", name: "Klarna", category: "Payments" },
    { needle: "afterpay", name: "Afterpay", category: "Payments" },
    { needle: "affirm", name: "Affirm", category: "Payments" },
    { needle: "braintree", name: "Braintree", category: "Payments" },
    { needle: "squareup", name: "Square", category: "Payments" },
    { needle: "razorpay", name: "Razorpay", category: "Payments" },
    { needle: "midtrans", name: "Midtrans", category: "Payments" },
    { needle: "xendit", name: "Xendit", category: "Payments" },
    { needle: "googletagmanager.com/gtm.js", name: "Google Tag Manager", category: "Analytics" },
    { needle: "googletagmanager.com/gtag", name: "Google Analytics", category: "Analytics" },
    { needle: "google-analytics.com", name: "Google Analytics", category: "Analytics" },
    { needle: "connect.facebook.net", name: "Facebook Pixel", category: "Analytics" },
    { needle: "hotjar", name: "Hotjar", category: "Analytics" },
    { needle: "clarity.ms", name: "Microsoft Clarity", category: "Analytics" },
    { needle: "segment.com", name: "Segment", category: "Analytics" },
    { needle: "mixpanel", name: "Mixpanel", category: "Analytics" },
    { needle: "amplitude", name: "Amplitude", category: "Analytics" },
    { needle: "heap", name: "Heap", category: "Analytics" },
    { needle: "matomo", name: "Matomo", category: "Analytics" },
    { needle: "plausible.io", name: "Plausible", category: "Analytics" },
    { needle: "fathom", name: "Fathom", category: "Analytics" },
    { needle: "umami", name: "Umami", category: "Analytics" },
    { needle: "tiktok", name: "TikTok Pixel", category: "Analytics" },
    { needle: "snap.licdn.com", name: "LinkedIn Insight", category: "Analytics" },
    { needle: "ads-twitter.com", name: "X Pixel", category: "Analytics" },
    { needle: "pinimg.com/ct", name: "Pinterest Tag", category: "Analytics" },
    { needle: "sc-static.net", name: "Snap Pixel", category: "Analytics" },
    { needle: "redditstatic.com", name: "Reddit Pixel", category: "Analytics" },
    { needle: "mc.yandex", name: "Yandex Metrica", category: "Analytics" },
    { needle: "js.hs-scripts.com", name: "HubSpot", category: "Marketing" },
    { needle: "mailchimp", name: "Mailchimp", category: "Marketing" },
    { needle: "intercom", name: "Intercom", category: "Support" },
    { needle: "drift", name: "Drift", category: "Support" },
    { needle: "crisp", name: "Crisp", category: "Support" },
    { needle: "tawk.to", name: "Tawk.to", category: "Support" },
    { needle: "zendesk", name: "Zendesk", category: "Support" },
    { needle: "livechat", name: "LiveChat", category: "Support" },
    { needle: "recaptcha", name: "reCAPTCHA", category: "Security" },
    { needle: "turnstile", name: "Cloudflare Turnstile", category: "Security" },
    { needle: "cloudflare", name: "Cloudflare", category: "CDN" },
    { needle: "cdnjs", name: "cdnjs", category: "CDN" },
    { needle: "jsdelivr", name: "jsDelivr", category: "CDN" },
    { needle: "unpkg", name: "unpkg", category: "CDN" },
    { needle: "bunny", name: "Bunny CDN", category: "CDN" }
  ];

  for (var si = 0; si < ASSET_SIGNATURES.length; si++) {
    ASSET_SIGNATURES[si].re = buildUrlRe(ASSET_SIGNATURES[si].needle);
  }

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
    { selector: "html[data-wf-domain]", name: "Webflow", category: "Website builder" },
    { selector: "[data-framer-name], [data-framer-appear-id]", name: "Framer", category: "Website builder" },
    { selector: "[data-hs-cos-general-type]", name: "HubSpot", category: "Marketing" },
    { selector: "[class*='Mui']", name: "Material UI", category: "UI library" },
    { selector: "[class*='ant-']", name: "Ant Design", category: "UI library" },
    { selector: "[class*='chakra-']", name: "Chakra UI", category: "UI library" },
    { selector: "[class*='el-button'], [class*='el-menu']", name: "Element UI", category: "UI library" },
    { selector: "[class*='v-application']", name: "Vuetify", category: "UI library" },
    { selector: "[class*='van-']", name: "Vant", category: "UI library" },
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

  var JS_PROBES = [
    { path: "jQuery.fn.jquery", name: "jQuery", category: "JavaScript library", version: true },
    { path: "jQuery.ui.version", name: "jQuery UI", category: "UI library", version: true },
    { path: "React.version", name: "React", category: "JavaScript framework", version: true },
    { path: "ReactDOM.version", name: "React DOM", category: "JavaScript library", version: true },
    { path: "Vue.version", name: "Vue.js", category: "JavaScript framework", version: true },
    { path: "angular.version.full", name: "AngularJS", category: "JavaScript framework", version: true },
    { path: "ng.version.full", name: "Angular", category: "JavaScript framework", version: true },
    { path: "Alpine.version", name: "Alpine.js", category: "JavaScript framework", version: true },
    { path: "Svelte.VERSION", name: "Svelte", category: "JavaScript framework", version: true },
    { path: "Preact", name: "Preact", category: "JavaScript framework", version: false },
    { path: "lit", name: "Lit", category: "JavaScript library", version: false },
    { path: "Polymer", name: "Polymer", category: "JavaScript library", version: false },
    { path: "Ember.VERSION", name: "Ember.js", category: "JavaScript framework", version: true },
    { path: "Backbone.VERSION", name: "Backbone.js", category: "JavaScript library", version: true },
    { path: "Handlebars.VERSION", name: "Handlebars", category: "Templating", version: true },
    { path: "Mustache.version", name: "Mustache", category: "Templating", version: true },
    { path: "lodash.VERSION", name: "Lodash", category: "JavaScript library", version: true },
    { path: "_.VERSION", name: "Underscore.js", category: "JavaScript library", version: true },
    { path: "moment.version", name: "Moment.js", category: "JavaScript library", version: true },
    { path: "dayjs.version", name: "Day.js", category: "JavaScript library", version: true },
    { path: "luxon.VERSION", name: "Luxon", category: "JavaScript library", version: true },
    { path: "axios.VERSION", name: "Axios", category: "HTTP client", version: true },
    { path: "io.version", name: "Socket.IO", category: "Realtime", version: true },
    { path: "DOMPurify.version", name: "DOMPurify", category: "Security", version: true },
    { path: "CryptoJS", name: "CryptoJS", category: "Security", version: false },
    { path: "marked", name: "Marked", category: "Markdown", version: false },
    { path: "Prism", name: "Prism.js", category: "Syntax highlighter", version: false },
    { path: "hljs.versionString", name: "Highlight.js", category: "Syntax highlighter", version: true },
    { path: "monaco", name: "Monaco Editor", category: "Code editor", version: false },
    { path: "CodeMirror.version", name: "CodeMirror", category: "Code editor", version: true },
    { path: "Quill.version", name: "Quill", category: "Rich text editor", version: true },
    { path: "TinyMCE.majorVersion", name: "TinyMCE", category: "Rich text editor", version: true },
    { path: "CKEDITOR.version", name: "CKEditor", category: "Rich text editor", version: true },
    { path: "Dropzone.version", name: "Dropzone", category: "File upload", version: true },
    { path: "Sortable", name: "SortableJS", category: "UI library", version: false },
    { path: "AOS", name: "AOS", category: "Animation", version: false },
    { path: "WOW", name: "WOW.js", category: "Animation", version: false },
    { path: "Lottie", name: "Lottie", category: "Animation", version: false },
    { path: "bodymovin", name: "Lottie", category: "Animation", version: false },
    { path: "Swiper.version", name: "Swiper", category: "UI library", version: true },
    { path: "splide", name: "Splide", category: "UI library", version: false },
    { path: "L.version", name: "Leaflet", category: "Maps", version: true },
    { path: "mapboxgl.version", name: "Mapbox GL JS", category: "Maps", version: true },
    { path: "pdfjsLib.version", name: "PDF.js", category: "Document", version: true },
    { path: "Chart.version", name: "Chart.js", category: "Visualization", version: true },
    { path: "Highcharts.version", name: "Highcharts", category: "Visualization", version: true },
    { path: "echarts.version", name: "Apache ECharts", category: "Visualization", version: true },
    { path: "ApexCharts", name: "ApexCharts", category: "Visualization", version: false },
    { path: "d3.version", name: "D3.js", category: "Visualization", version: true },
    { path: "THREE.REVISION", name: "Three.js", category: "3D library", version: true },
    { path: "BABYLON.Engine.Version", name: "Babylon.js", category: "3D library", version: true },
    { path: "gsap.version", name: "GSAP", category: "Animation", version: true },
    { path: "anime.version", name: "Anime.js", category: "Animation", version: true },
    { path: "Sentry.SDK_VERSION", name: "Sentry", category: "Monitoring", version: true },
    { path: "Stripe.version", name: "Stripe.js", category: "Payments", version: true },
    { path: "paypal", name: "PayPal", category: "Payments", version: false },
    { path: "Shopify", name: "Shopify", category: "E-commerce", version: false },
    { path: "Drupal", name: "Drupal", category: "CMS", version: false },
    { path: "wp.version", name: "WordPress", category: "CMS", version: true },
    { path: "__NEXT_DATA__", name: "Next.js", category: "JavaScript framework", version: false },
    { path: "__NUXT__", name: "Nuxt", category: "JavaScript framework", version: false },
    { path: "__nuxt", name: "Nuxt", category: "JavaScript framework", version: false },
    { path: "__remixContext", name: "Remix", category: "JavaScript framework", version: false },
    { path: "___gatsby", name: "Gatsby", category: "Static site generator", version: false },
    { path: "gatsby", name: "Gatsby", category: "Static site generator", version: false },
    { path: "dataLayer", name: "Google Tag Manager", category: "Analytics", version: false },
    { path: "gtag", name: "Google Analytics", category: "Analytics", version: false },
    { path: "ga", name: "Google Analytics", category: "Analytics", version: false },
    { path: "fbq", name: "Facebook Pixel", category: "Analytics", version: false },
    { path: "hj", name: "Hotjar", category: "Analytics", version: false },
    { path: "clarity", name: "Microsoft Clarity", category: "Analytics", version: false },
    { path: "webpackChunk", name: "Webpack", category: "Build tool", version: false },
    { path: "webpackJsonp", name: "Webpack", category: "Build tool", version: false },
    { path: "__vite_plugin_react_preamble_installed__", name: "Vite", category: "Build tool", version: false },
    { path: "React", name: "React", category: "JavaScript framework", version: false },
    { path: "angular", name: "AngularJS", category: "JavaScript framework", version: false },
    { path: "Vue", name: "Vue.js", category: "JavaScript framework", version: false }
  ];

  var META_PATTERNS = [
    { re: /WordPress\s*([\d.]+)?/i, name: "WordPress", category: "CMS" },
    { re: /Drupal\s*([\d.]+)?/i, name: "Drupal", category: "CMS" },
    { re: /Joomla!?\s*([\d.]+)?/i, name: "Joomla", category: "CMS" },
    { re: /Ghost\s*([\d.]+)?/i, name: "Ghost", category: "CMS" },
    { re: /TYPO3\s*([\d.]+)?/i, name: "TYPO3", category: "CMS" },
    { re: /PrestaShop\s*([\d.]+)?/i, name: "PrestaShop", category: "E-commerce" },
    { re: /OpenCart\s*([\d.]+)?/i, name: "OpenCart", category: "E-commerce" },
    { re: /Magento\s*([\d.]+)?/i, name: "Magento", category: "E-commerce" },
    { re: /Shopify/i, name: "Shopify", category: "E-commerce" },
    { re: /Wix\.com|Wix/i, name: "Wix", category: "Website builder" },
    { re: /Squarespace/i, name: "Squarespace", category: "Website builder" },
    { re: /Webflow/i, name: "Webflow", category: "Website builder" },
    { re: /Hugo\s*([\d.]+)?/i, name: "Hugo", category: "Static site generator" },
    { re: /Gatsby/i, name: "Gatsby", category: "Static site generator" },
    { re: /Jekyll\s*([\d.]+)?/i, name: "Jekyll", category: "Static site generator" },
    { re: /Hexo\s*([\d.]+)?/i, name: "Hexo", category: "Static site generator" },
    { re: /Eleventy/i, name: "Eleventy", category: "Static site generator" },
    { re: /Docusaurus/i, name: "Docusaurus", category: "Static site generator" },
    { re: /HubSpot/i, name: "HubSpot", category: "Marketing" },
    { re: /Moodle\s*([\d.]+)?/i, name: "Moodle", category: "LMS" },
    { re: /MediaWiki\s*([\d.]+)?/i, name: "MediaWiki", category: "Wiki" },
    { re: /Discourse/i, name: "Discourse", category: "Forum" },
    { re: /phpBB/i, name: "phpBB", category: "Forum" },
    { re: /vBulletin/i, name: "vBulletin", category: "Forum" },
    { re: /XenForo/i, name: "XenForo", category: "Forum" },
    { re: /Craft CMS/i, name: "Craft CMS", category: "CMS" },
    { re: /Statamic/i, name: "Statamic", category: "CMS" },
    { re: /Grav\s*([\d.]+)?/i, name: "Grav", category: "CMS" },
    { re: /October CMS/i, name: "October CMS", category: "CMS" },
    { re: /Duda/i, name: "Duda", category: "Website builder" },
    { re: /Weebly/i, name: "Weebly", category: "Website builder" },
    { re: /Framer/i, name: "Framer", category: "Website builder" },
    { re: /BigCommerce/i, name: "BigCommerce", category: "E-commerce" }
  ];

  var COOKIE_MARKERS = [
    { needle: "phpsessid", name: "PHP", category: "Programming language" },
    { needle: "laravel_session", name: "Laravel", category: "Web framework" },
    { needle: "wordpress_", name: "WordPress", category: "CMS" },
    { needle: "wp-settings", name: "WordPress", category: "CMS" },
    { needle: "_shopify", name: "Shopify", category: "E-commerce" },
    { needle: "__cf_bm", name: "Cloudflare", category: "CDN" },
    { needle: "__utma", name: "Google Analytics", category: "Analytics" },
    { needle: "_ga", name: "Google Analytics", category: "Analytics" },
    { needle: "_gid", name: "Google Analytics", category: "Analytics" },
    { needle: "_gcl_au", name: "Google Ads", category: "Advertising" },
    { needle: "_fbp", name: "Facebook Pixel", category: "Analytics" },
    { needle: "_hjid", name: "Hotjar", category: "Analytics" },
    { needle: "_clck", name: "Microsoft Clarity", category: "Analytics" },
    { needle: "__stripe_mid", name: "Stripe.js", category: "Payments" },
    { needle: "__stripe_sid", name: "Stripe.js", category: "Payments" },
    { needle: "asp.net_sessionid", name: "ASP.NET", category: "Web framework" },
    { needle: "jsessionid", name: "Java", category: "Programming language" },
    { needle: "csrftoken", name: "Django", category: "Web framework" },
    { needle: "ci_session", name: "CodeIgniter", category: "Web framework" },
    { needle: "_rails", name: "Ruby on Rails", category: "Web framework" },
    { needle: "_session_id", name: "Ruby on Rails", category: "Web framework" },
    { needle: "optimizelyenduserid", name: "Optimizely", category: "Experimentation" },
    { needle: "_uetsid", name: "Microsoft Advertising", category: "Advertising" },
    { needle: "_pin_unauth", name: "Pinterest Tag", category: "Analytics" },
    { needle: "_scid", name: "Snap Pixel", category: "Analytics" },
    { needle: "_tt_enable_cookie", name: "TikTok Pixel", category: "Analytics" },
    { needle: "li_sugr", name: "LinkedIn Insight", category: "Analytics" }
  ];

  var INLINE_PATTERNS = [
    { needle: "__NEXT_DATA__", name: "Next.js", category: "JavaScript framework" },
    { needle: "__NUXT__", name: "Nuxt", category: "JavaScript framework" },
    { needle: "__remixContext", name: "Remix", category: "JavaScript framework" },
    { needle: "___gatsby", name: "Gatsby", category: "Static site generator" },
    { needle: "webpackChunk", name: "Webpack", category: "Build tool" },
    { needle: "webpackJsonp", name: "Webpack", category: "Build tool" },
    { needle: "wp-content", name: "WordPress", category: "CMS" },
    { needle: "Shopify", name: "Shopify", category: "E-commerce" },
    { needle: "googletagmanager", name: "Google Tag Manager", category: "Analytics" },
    { needle: "gtag(", name: "Google Analytics", category: "Analytics" },
    { needle: "dataLayer", name: "Google Tag Manager", category: "Analytics" },
    { needle: "clarity.ms", name: "Microsoft Clarity", category: "Analytics" },
    { needle: "hotjar", name: "Hotjar", category: "Analytics" },
    { needle: "fbq(", name: "Facebook Pixel", category: "Analytics" },
    { needle: "astro-island", name: "Astro", category: "Static site generator" },
    { needle: "data-v-app", name: "Vue.js", category: "JavaScript framework" },
    { needle: "ng-version", name: "Angular", category: "JavaScript framework" },
    { needle: "svelte", name: "Svelte", category: "JavaScript framework" },
    { needle: "turbo", name: "Turbo", category: "JavaScript framework" },
    { needle: "htmx", name: "htmx", category: "JavaScript library" },
    { needle: "alpine", name: "Alpine.js", category: "JavaScript framework" },
    { needle: "stripe", name: "Stripe.js", category: "Payments" },
    { needle: "recaptcha", name: "reCAPTCHA", category: "Security" },
    { needle: "cloudflare", name: "Cloudflare", category: "CDN" },
    { needle: "plausible", name: "Plausible", category: "Analytics" },
    { needle: "matomo", name: "Matomo", category: "Analytics" }
  ];

  var STYLE_MARKERS = [
    { needle: "--tw-", name: "Tailwind CSS", category: "CSS framework" },
    { needle: "tailwindcss", name: "Tailwind CSS", category: "CSS framework" },
    { needle: "--bulma", name: "Bulma", category: "CSS framework" },
    { needle: "foundation-", name: "Foundation", category: "CSS framework" },
    { needle: "--mdc-", name: "Material Components", category: "UI library" },
    { needle: "--ant-", name: "Ant Design", category: "UI library" },
    { needle: "--chakra-", name: "Chakra UI", category: "UI library" },
    { needle: "--spectrum-", name: "Adobe Spectrum", category: "UI library" },
    { needle: "--sl-", name: "Shoelace", category: "UI library" }
  ];

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
    sveltekit: [
      ["Svelte", "JavaScript framework"],
      ["Vite", "Build tool"]
    ],
    astro: [["Vite", "Build tool"]],
    laravel: [["PHP", "Programming language"]],
    codeigniter: [["PHP", "Programming language"]],
    wordpress: [["PHP", "Programming language"]],
    drupal: [["PHP", "Programming language"]],
    joomla: [["PHP", "Programming language"]],
    magento: [["PHP", "Programming language"]],
    prestashop: [["PHP", "Programming language"]],
    opencart: [["PHP", "Programming language"]],
    "craft cms": [["PHP", "Programming language"]],
    statamic: [["PHP", "Programming language"]],
    "october cms": [["PHP", "Programming language"]],
    django: [["Python", "Programming language"]],
    "ruby on rails": [["Ruby", "Programming language"]],
    "asp.net": [[".NET", "Programming language"]],
    "vue.js": [["JavaScript", "Programming language"]],
    react: [["JavaScript", "Programming language"]],
    angular: [["TypeScript", "Programming language"]],
    "jquery": [["JavaScript", "Programming language"]]
  };

  function scanGlobals() {
    for (var i = 0; i < JS_PROBES.length; i++) {
      var probe = JS_PROBES[i];
      var value = safeGet(function () {
        return getPath(probe.path);
      });
      if (value === undefined || value === null || value === false) continue;
      add(probe.name, probe.category, probe.version ? cleanVersion(value) : "");
    }
  }

  function scanUrls() {
    var nodes = document.querySelectorAll("script[src], link[href]");
    for (var i = 0; i < nodes.length; i++) {
      var url = nodes[i].src || nodes[i].href || "";
      if (!url) continue;
      for (var j = 0; j < ASSET_SIGNATURES.length; j++) {
        var sig = ASSET_SIGNATURES[j];
        if (sig.re.test(url)) add(sig.name, sig.category, versionFromUrl(url));
      }
    }

    try {
      var entries = performance.getEntriesByType("resource");
      for (var k = 0; k < entries.length; k++) {
        var resource = entries[k].name || "";
        if (!resource) continue;
        for (var m = 0; m < ASSET_SIGNATURES.length; m++) {
          var rsig = ASSET_SIGNATURES[m];
          if (rsig.re.test(resource)) add(rsig.name, rsig.category, versionFromUrl(resource));
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

  function scanMeta() {
    var text = "";
    var metas = document.querySelectorAll("meta");
    for (var i = 0; i < metas.length; i++) {
      text += " " + (metas[i].getAttribute("name") || "") + " " + (metas[i].getAttribute("content") || "");
    }
    if (!text) return;
    for (var j = 0; j < META_PATTERNS.length; j++) {
      var pattern = META_PATTERNS[j];
      var match = pattern.re.exec(text);
      if (match) add(pattern.name, pattern.category, cleanVersion(match[1]));
    }
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
      if (text.length > 400000) break;
    }
    if (!text) return;
    for (var j = 0; j < INLINE_PATTERNS.length; j++) {
      var pattern = INLINE_PATTERNS[j];
      if (textHas(text, pattern.needle)) add(pattern.name, pattern.category, "");
    }
  }

  function scanStyles() {
    var styles = document.querySelectorAll("style");
    var text = "";
    for (var i = 0; i < styles.length && i < 25; i++) {
      text += (styles[i].textContent || "").slice(0, 100000);
      if (text.length > 400000) break;
    }
    if (!text) return;
    for (var j = 0; j < STYLE_MARKERS.length; j++) {
      var marker = STYLE_MARKERS[j];
      if (textHas(text, marker.needle)) add(marker.name, marker.category, "");
    }
  }

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
    scanMeta();
    scanCookies();
    scanInlineScripts();
    scanStyles();
    applyImplies();
    report();
  }

  document.addEventListener("DOMContentLoaded", run, { once: true });
  window.addEventListener("load", run, { once: true });
  [300, 1000, 2500, 5000, 9000, 15000].forEach(function (ms) {
    setTimeout(run, ms);
  });
})();
