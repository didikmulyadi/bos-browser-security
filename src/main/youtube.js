(function () {
  var host = "";
  try {
    host = location.hostname.toLowerCase();
  } catch (e) {}

  var onYouTube =
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com");
  if (!onYouTube) return;

  var enabled = true;
  var STYLE_ID = "__adg_yt_style";

  var BLOCK_KEYS = {
    adPlacements: 1,
    playerAds: 1,
    adSlots: 1,
    adBreakHeartbeatParams: 1,
    playerAdParams: 1,
    adParams: 1,
    adBreakParams: 1,
    adPlaybackContext: 1,
    adSafetyReason: 1,
    adsEngagementPanel: 1,
    adBreakServiceRenderer: 1,
    adBreakService: 1,
    adBreakRenderer: 1,
    adSlotRenderer: 1,
    displayAdRenderer: 1,
    promotedSparklesWebRenderer: 1,
    promotedVideoRenderer: 1,
    compactPromotedVideoRenderer: 1,
    inFeedAdLayoutRenderer: 1,
    adFederatedCommentRenderer: 1,
    mastheadAdV3Renderer: 1,
    bannerPromoRenderer: 1,
    statementBannerRenderer: 1,
    companionSlotRenderer: 1,
    adSlotMetadata: 1,
    adLayoutRenderer: 1,
    promotedSparklesTextSearchRenderer: 1,
    searchPymkRenderer: 1,
    webPageAdRenderer: 1,
    adThumbnailRenderer: 1,
    adVideoRenderer: 1,
    adCardRenderer: 1,
    adSlotAndLayoutMetadata: 1,
    adSlotsRenderer: 1,
    playerLegacyDesktopWatchAdsRenderer: 1
  };

  function hasAdRendererKey(obj) {
    try {
      for (var key in obj) {
        if (BLOCK_KEYS[key]) return true;
        if (typeof key === "string" && /(?:Ad|Promoted)[A-Za-z]*Renderer$/.test(key)) return true;
      }
    } catch (e) {}
    return false;
  }

  function stripAds(node, depth) {
    if (!node || typeof node !== "object" || depth > 40) return;
    if (Array.isArray(node)) {
      for (var i = node.length - 1; i >= 0; i--) {
        var item = node[i];
        if (item && typeof item === "object" && !Array.isArray(item) && hasAdRendererKey(item)) {
          node.splice(i, 1);
          continue;
        }
        stripAds(item, depth + 1);
      }
      return;
    }
    for (var key in node) {
      if (BLOCK_KEYS[key]) {
        try {
          delete node[key];
        } catch (e) {}
        continue;
      }
      var value = node[key];
      if (value && typeof value === "object") stripAds(value, depth + 1);
    }
  }

  function isYoutubeiDataUrl(url) {
    return /\/youtubei\/v1\/(?:player|next|browse|get_watch|reel\/reel_item_watch)/.test(url);
  }

  var nativeFetch = window.fetch;
  if (typeof nativeFetch === "function") {
    window.fetch = function (input, init) {
      if (!enabled) return nativeFetch.apply(this, arguments);

      var url = "";
      try {
        url = typeof input === "string" ? input : (input && input.url) || "";
      } catch (e) {}

      var request = nativeFetch.apply(this, arguments);
      if (!url || !isYoutubeiDataUrl(url)) return request;

      return request.then(function (response) {
        try {
          if (!response || !response.ok) return response;
          var type = response.headers.get("content-type") || "";
          if (type.indexOf("json") === -1) return response;

          return response
            .clone()
            .json()
            .then(function (data) {
              stripAds(data, 0);
              var headers = new Headers(response.headers);
              headers.delete("content-length");
              headers.delete("content-encoding");
              headers.delete("transfer-encoding");
              headers.set("content-type", "application/json; charset=utf-8");
              return new Response(JSON.stringify(data), {
                status: response.status,
                statusText: response.statusText,
                headers: headers
              });
            })
            .catch(function () {
              return response;
            });
        } catch (e) {
          return response;
        }
      });
    };
  }

  function patchNamed(name) {
    try {
      var value = window[name];
      if (value && typeof value === "object") stripAds(value, 0);
    } catch (e) {}
  }

  function patchInitialData() {
    if (!enabled) return;
    patchNamed("ytInitialPlayerResponse");
    patchNamed("ytInitialData");
    patchNamed("ytInitialReelWatchSequenceResponse");
  }

  try {
    var initialPlayer = window.ytInitialPlayerResponse;
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      enumerable: true,
      get: function () {
        return initialPlayer;
      },
      set: function (value) {
        try {
          if (enabled) stripAds(value, 0);
        } catch (e) {}
        initialPlayer = value;
      }
    });
  } catch (e) {}

  [0, 50, 250, 1000, 2500, 5000].forEach(function (ms) {
    setTimeout(patchInitialData, ms);
  });
  document.addEventListener("DOMContentLoaded", patchInitialData, { once: true });

  var AD_CSS =
    [
      "#player-ads",
      ".ytp-ad-module",
      ".ytp-ad-overlay-container",
      ".ytp-ad-progress-list",
      ".ytp-ad-preview-container",
      ".ytp-ad-text",
      ".ytp-ad-image-overlay",
      ".ytp-ad-survey",
      ".ytp-ad-button-icon",
      ".ytp-ad-overlay-slot",
      ".ytp-ad-player-overlay-layout",
      ".ytp-featured-product",
      "ytd-display-ad-renderer",
      "ytd-promoted-sparkles-web-renderer",
      "ytd-promoted-video-renderer",
      "ytd-in-feed-ad-layout-renderer",
      "ytd-ad-slot-renderer",
      "ytd-banner-promo-renderer",
      "ytd-statement-banner-renderer",
      "ytd-companion-slot-renderer",
      "ytd-rich-item-renderer:has(ytd-ad-slot-renderer)",
      "ytm-promoted-sparkles-web-renderer",
      "ytm-companion-slot",
      "#masthead-ad"
    ].join(",") + "{display:none!important;}";

  function injectCss() {
    try {
      if (document.getElementById(STYLE_ID)) return;
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = AD_CSS;
      (document.head || document.documentElement).appendChild(style);
    } catch (e) {}
  }

  function removeCss() {
    try {
      var style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    } catch (e) {}
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    var data = event.data;
    if (!data || data.__adgCfg !== 1) return;
    enabled = !!data.enabled && data.youtubeAds !== false;
    if (enabled) {
      injectCss();
      patchInitialData();
    } else {
      removeCss();
    }
  });

  injectCss();

  var savedRate = 0;

  function clickSkip() {
    var selectors = [
      ".ytp-skip-ad-button",
      ".ytp-ad-skip-button",
      ".ytp-ad-skip-button-modern",
      ".ytp-ad-skip-button-container button",
      "button.ytp-ad-skip-button"
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (!el) continue;
      try {
        el.click();
      } catch (e) {}
    }
  }

  function handleAd() {
    if (!enabled) return;
    var player = document.getElementById("movie_player");
    if (!player) return;

    var video = document.querySelector("video.html5-main-video");

    if (!player.classList.contains("ad-showing")) {
      if (savedRate && video) {
        try {
          video.playbackRate = savedRate;
        } catch (e) {}
        savedRate = 0;
      }
      return;
    }

    clickSkip();
    if (!video) return;

    try {
      if (!savedRate) savedRate = video.playbackRate || 1;
      if (video.playbackRate !== 16) video.playbackRate = 16;
      if (isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.2) {
        video.currentTime = video.duration;
      }
    } catch (e) {}
  }

  var adScheduled = false;
  function scheduleAd() {
    if (adScheduled) return;
    adScheduled = true;
    setTimeout(function () {
      adScheduled = false;
      handleAd();
    }, 250);
  }

  try {
    var observer = new MutationObserver(scheduleAd);
    observer.observe(document.documentElement || document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  } catch (e) {}

  setInterval(handleAd, 1000);
})();
