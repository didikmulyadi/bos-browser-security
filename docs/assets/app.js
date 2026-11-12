(function () {
  var root = document.documentElement;
  var stored = null;
  try {
    stored = localStorage.getItem("bos-theme");
  } catch (e) {}

  if (stored === "dark" || stored === "light") {
    root.setAttribute("data-theme", stored);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }

  function updateThemeButton() {
    var btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    var dark = root.getAttribute("data-theme") === "dark";
    btn.setAttribute("aria-label", dark ? "Aktifkan tema terang" : "Aktifkan tema gelap");
    btn.title = btn.getAttribute("aria-label");
    btn.innerHTML = dark
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("bos-theme", theme);
    } catch (e) {}
    updateThemeButton();
  }

  document.addEventListener("click", function (event) {
    var toggle = event.target.closest ? event.target.closest("[data-theme-toggle]") : null;
    if (toggle) {
      event.preventDefault();
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
      return;
    }

    var copy = event.target.closest ? event.target.closest("[data-copy]") : null;
    if (copy) {
      event.preventDefault();
      var pre = copy.closest("pre");
      var source = pre ? pre.querySelector("code") : null;
      var text = copy.getAttribute("data-copy") || (source ? source.textContent : "");
      var done = function () {
        var old = copy.textContent;
        copy.textContent = "Tersalin";
        setTimeout(function () {
          copy.textContent = old;
        }, 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {});
      }
    }
  });

  updateThemeButton();

  var links = Array.prototype.slice.call(document.querySelectorAll(".sidebar a[href^='#']"));
  if (links.length && "IntersectionObserver" in window) {
    var byId = {};
    links.forEach(function (link) {
      byId[link.getAttribute("href").slice(1)] = link;
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var link = byId[entry.target.id];
          if (!link) return;
          links.forEach(function (l) {
            l.classList.remove("active");
          });
          link.classList.add("active");
        });
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: 0.01 }
    );

    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  Array.prototype.slice.call(document.querySelectorAll("pre")).forEach(function (pre) {
    if (pre.querySelector("[data-copy]")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.setAttribute("data-copy", "");
    pre.appendChild(btn);
  });
})();
