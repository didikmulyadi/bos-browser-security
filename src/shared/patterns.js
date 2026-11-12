(function (root) {
  var AD_HOSTS = [
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "adservice.google.com",
    "googletagservices.com",
    "adnxs.com",
    "adsrvr.org",
    "rubiconproject.com",
    "pubmatic.com",
    "openx.net",
    "criteo.com",
    "criteo.net",
    "taboola.com",
    "outbrain.com",
    "mgid.com",
    "revcontent.com",
    "zergnet.com",
    "popads.net",
    "popcash.net",
    "propellerads.com",
    "propellerclick.com",
    "adsterra.com",
    "exoclick.com",
    "exosrv.com",
    "juicyads.com",
    "trafficjunky.net",
    "trafficstars.com",
    "clickadu.com",
    "onclck.com",
    "adcash.com",
    "hilltopads.net",
    "clickaine.com",
    "bidvertiser.com",
    "media.net",
    "contextweb.com",
    "sovrn.com",
    "lijit.com",
    "33across.com",
    "gumgum.com",
    "sharethrough.com",
    "triplelift.com",
    "smartadserver.com",
    "teads.tv",
    "spotxchange.com",
    "districtm.io",
    "yieldmo.com",
    "indexexchange.com",
    "casalemedia.com",
    "adform.net",
    "1rx.io",
    "360yield.com",
    "tremorhub.com",
    "beachfront.com",
    "springserve.com",
    "aniview.com",
    "spotx.tv",
    "yieldlab.net",
    "advertising.com",
    "amazon-adsystem.com",
    "ads.yahoo.com",
    "adroll.com",
    "quantserve.com",
    "scorecardresearch.com",
    "moatads.com",
    "adsymptotic.com",
    "bluekai.com",
    "demdex.net",
    "everesttech.net",
    "krxd.net",
    "exelator.com",
    "tapad.com",
    "adcolony.com",
    "applovin.com",
    "inmobi.com",
    "chartboost.com",
    "vungle.com",
    "ironsrc.com",
    "supersonicads.com",
    "startappservice.com",
    "hooliredir.com",
    "storageimagedisplay.com",
    "profitablecpmrate.com",
    "highperformanceformat.com",
    "adnium.com",
    "popmyads.com",
    "ad-maven.com",
    "admaven.com",
    "a-ads.com",
    "mellowads.com",
    "cointraffic.io",
    "coinzilla.io",
    "adspyglass.com",
    "trafficfactory.biz",
    "rocoads.com",
    "tsyndicate.com",
    "adpushup.com",
    "ezoic.net",
    "ezojs.com",
    "venatusmedia.com",
    "nitropay.com",
    "playwire.com",
    "raptive.com",
    "mediavine.com",
    "freestar.io",
    "monumetric.com",
    "setupad.com",
    "snigel.com",
    "adthrive.com",
    "bauval.org",
    "pubadx.one",
    "pubadx.com"
  ];

  var AD_HOST_SET = new Set(AD_HOSTS);

  function hostOf(url, base) {
    try {
      var fallback = root.location && root.location.href;
      return new URL(url, base || fallback || undefined).hostname.toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function isAdHost(host) {
    if (!host) return false;
    if (AD_HOST_SET.has(host)) return true;
    var parts = host.split(".");
    for (var i = 1; i < parts.length - 1; i++) {
      if (AD_HOST_SET.has(parts.slice(i).join("."))) return true;
    }
    return false;
  }

  function isAdUrl(url, base) {
    if (url == null) return false;
    var value = String(url).trim();
    if (!value) return false;
    var lower = value.toLowerCase();
    if (lower === "about:blank" || lower.indexOf("javascript:") === 0 || lower.indexOf("data:") === 0) {
      return false;
    }
    return isAdHost(hostOf(value, base));
  }

  function sameSite(a, b) {
    var ha = hostOf(a);
    var hb = hostOf(b);
    if (!ha || !hb) return true;
    if (ha === hb) return true;
    return ha.endsWith("." + hb) || hb.endsWith("." + ha);
  }

  function baseDomain(host) {
    if (!host) return "";
    host = String(host).toLowerCase().replace(/\.$/, "");
    var multi = [
      "co.uk",
      "co.id",
      "co.jp",
      "com.au",
      "com.br",
      "co.in",
      "co.kr",
      "com.tr",
      "com.cn",
      "com.mx",
      "co.nz",
      "co.za",
      "com.sg",
      "com.hk"
    ];
    var parts = host.split(".");
    if (parts.length <= 2) return host;
    var lastTwo = parts.slice(-2).join(".");
    if (multi.indexOf(lastTwo) !== -1 && parts.length >= 3) return parts.slice(-3).join(".");
    return lastTwo;
  }

  root.__ADG_PATTERNS = {
    AD_HOSTS: AD_HOSTS,
    hostOf: hostOf,
    isAdHost: isAdHost,
    isAdUrl: isAdUrl,
    sameSite: sameSite,
    baseDomain: baseDomain
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
