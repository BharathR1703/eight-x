/* 8x.life redesign — clocks (with the ×8 easter egg), collage settle, video lightbox. */
(function () {
  "use strict";

  document.documentElement.classList.add("js"); /* gates scroll reveals — no js, everything visible */

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- clocks ---------- */

  var clocks = Array.prototype.slice.call(document.querySelectorAll(".clock"));
  var offset = 0;   // ms added to the real clock (accumulates while accelerated)
  var speed = 1;    // 1 → ×8 after "8" is pressed
  var lastTick = performance.now();

  function tick() {
    var now = performance.now();
    var dt = now - lastTick;
    lastTick = now;
    if (speed !== 1 && !document.hidden) offset += dt * (speed - 1);
    var virtual = new Date(Date.now() + offset);
    clocks.forEach(function (el) {
      var tz = el.getAttribute("data-tz");
      var time = el.querySelector(".time");
      if (!tz || !time) return;
      var hh = "--", mm = "--";
      try {
        var parts = new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
        }).formatToParts(virtual);
        parts.forEach(function (p) {
          if (p.type === "hour") hh = p.value;
          if (p.type === "minute") mm = p.value;
        });
      } catch (e) {
        hh = String(virtual.getHours()).padStart(2, "0");
        mm = String(virtual.getMinutes()).padStart(2, "0");
      }
      time.textContent = hh + ":" + mm;
      time.classList.toggle("x8", speed !== 1);
    });
  }
  setInterval(tick, 500);
  tick();

  document.addEventListener("keydown", function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "8") {
      speed = 8;
      tick();
    } else if (e.key === "r" || e.key === "R") {
      speed = 1;
      offset = 0;
      tick();
    }
  });

  /* ---------- collage: scatter, settle once, straighten on hover ---------- */

  var collage = document.getElementById("collage");
  if (collage) {
    var figs = Array.prototype.slice.call(collage.querySelectorAll("figure"));
    var tilts = [-7, 5, -3, 8, -6, 4, -9, 6];
    var dys = [10, 26, -6, 18, 34, 2, 22, 12];
    figs.forEach(function (f, i) {
      f.style.setProperty("--tilt", tilts[i % tilts.length] + "deg");
      f.style.setProperty("--dy", dys[i % dys.length] + "px");
      if (!reduceMotion) {
        f.addEventListener("animationend", function onlyOnce() {
          f.removeEventListener("animationend", onlyOnce);
          f.classList.add("settled");
        });
        f.classList.add("settling");
      }
    });
  }

  /* ---------- lightbox video ---------- */

  var lb = document.getElementById("lb");
  var lbVideo = document.getElementById("lb-video");
  var lbX = document.getElementById("lb-x");
  var lastFocus = null;

  function openVideo(src) {
    if (!lb || !lbVideo) return;
    lastFocus = document.activeElement;
    lbVideo.src = src;
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    if (reduceMotion) {
      lb.classList.add("lb-open");
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { lb.classList.add("lb-open"); });
      });
    }
    lbVideo.play().catch(function () {});
    lbX.focus();
  }
  function closeVideo() {
    if (!lb) return;
    function finish() {
      lbVideo.pause();
      lbVideo.removeAttribute("src");
      if (lbVideo.load) lbVideo.load();
      lb.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    if (lb.classList.contains("lb-open") && !reduceMotion) {
      lb.classList.remove("lb-open");
      window.setTimeout(finish, 230);
    } else {
      lb.classList.remove("lb-open");
      finish();
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-video]"), function (el) {
    if (el.tagName === "FIGURE") {
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openVideo(el.getAttribute("data-video"));
        }
      });
    }
    el.addEventListener("click", function () {
      openVideo(el.getAttribute("data-video"));
    });
  });

  if (lbX) lbX.addEventListener("click", closeVideo);
  if (lb) lb.addEventListener("click", function (e) { if (e.target === lb) closeVideo(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && lb && !lb.hidden) closeVideo();
  });

  /* ---------- full-screen menu ---------- */

  var menu = document.getElementById("menu");
  var menuOpenBtn = document.getElementById("menu-btn");
  var menuCloseBtn = document.getElementById("menu-close");
  var menuLastFocus = null;

  function openMenu() {
    if (!menu) return;
    menuLastFocus = document.activeElement;
    menu.hidden = false;
    document.body.style.overflow = "hidden";
    if (reduceMotion) {
      menu.classList.add("open");
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { menu.classList.add("open"); });
      });
    }
    if (menuOpenBtn) menuOpenBtn.setAttribute("aria-expanded", "true");
    if (menuCloseBtn) menuCloseBtn.focus();
  }
  function closeMenu() {
    if (!menu) return;
    function finish() {
      menu.hidden = true;
      document.body.style.overflow = "";
      if (menuLastFocus) menuLastFocus.focus();
    }
    if (menu.classList.contains("open") && !reduceMotion) {
      menu.classList.remove("open");
      window.setTimeout(finish, 230);
    } else {
      menu.classList.remove("open");
      finish();
    }
  }

  if (menuOpenBtn) menuOpenBtn.addEventListener("click", openMenu);
  if (menuCloseBtn) menuCloseBtn.addEventListener("click", closeMenu);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu && !menu.hidden) closeMenu();
  });

  /* ---------- motion: reveals, count-up, parallax, circle replay ---------- */

  if (!reduceMotion && "IntersectionObserver" in window) {
    /* the judging band pins and scrubs only where its content fits (>=721px,
       matching the css pin gate); on phone it flows and reveals like the rest */
    var pinnedJudge = window.matchMedia("(min-width: 721px)").matches;
    var groups = [
      [".verdict", 60],
      [".mani li", 60],
      [".people-tile", 45],
      [".clock", 55],
      [".biz li", 40]
    ];
    if (!pinnedJudge) {
      groups = [
        [".judge-step", 90],
        [".judge-plain p", 80]
      ].concat(groups);
    }
    var watched = [];
    groups.forEach(function (g) {
      var els = Array.prototype.slice.call(document.querySelectorAll(g[0]));
      if (!els.length) return;
      /* reveal class added by js here — css hides .reveal only, so no-js never hides content */
      els.forEach(function (el) { el.classList.add("reveal"); watched.push(el); });
      var io = new IntersectionObserver(function (entries) {
        var batch = entries.filter(function (en) { return en.isIntersecting; });
        batch.sort(function (a, b) {
          return a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top;
        });
        batch.forEach(function (en, k) {
          io.unobserve(en.target);
          en.target.style.transitionDelay = Math.min(k * g[1], 340) + "ms";
          en.target.classList.add("in");
          en.target.addEventListener("transitionend", function clear() {
            en.target.style.transitionDelay = ""; /* don't slow later hover transitions */
          }, { once: true });
        });
      }, { rootMargin: "0px 0px -8% 0px" });
      els.forEach(function (el) { io.observe(el); });
    });

    /* stats count up once, briefly; "0" stays put — it counts itself */
    var stats = document.querySelector(".stats");
    if (stats) {
      var nums = Array.prototype.slice.call(stats.querySelectorAll("b"));
      var fmt = function (n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); };
      var sio = new IntersectionObserver(function (entries) {
        if (!entries.some(function (en) { return en.isIntersecting; })) return;
        sio.disconnect();
        nums.forEach(function (b) {
          var finalText = b.textContent;
          var m = /^([\d,]+)/.exec(finalText);
          if (!m) return;
          var target = parseInt(m[1].replace(/,/g, ""), 10);
          if (target === 0) return;
          var rest = finalText.slice(m[0].length);
          var t0 = performance.now(), dur = 1100;
          (function step(now) {
            var p = Math.min((now - t0) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            b.textContent = fmt(Math.round(target * eased)) + rest;
            if (p < 1) requestAnimationFrame(step);
          })(t0);
        });
      }, { threshold: 0.4 });
      sio.observe(stats);
      stats.querySelectorAll("b").forEach(function (b) { b.style.fontVariantNumeric = "tabular-nums"; });
    }

    /* the judging band scrubs like e2's curtain: the frame holds (css sticky)
       while the wheel drives steps, punchlines and the ask through — and
       rewinding the scroll rewinds them. */
    var judgePin = document.querySelector(".judge-pin");
    var judgeScrub = null;
    if (pinnedJudge && judgePin && judgePin.querySelector(".on-dark")) {
      var judgeParts = Array.prototype.slice.call(judgePin.querySelectorAll(".judge-step"))
        .concat(Array.prototype.slice.call(judgePin.querySelectorAll(".judge-plain > p")))
        .concat(Array.prototype.slice.call(judgePin.querySelectorAll(".judge-plain .cta-row")));
      /* [arrival start, arrival length] in scroll-progress, one per part:
         head is up first, then step arrives, step, step, then the punchlines
         and the ask close the act */
      var arrivals = [[.02, .18], [.30, .16], [.55, .16], [.76, .10], [.84, .08], [.91, .08]];
      judgeParts.forEach(function (el) {
        el.style.opacity = "0";
        el.style.transform = "translateY(22px)";
      });
      judgeScrub = function (p) {
        judgeParts.forEach(function (el, i) {
          var a = arrivals[Math.min(i, arrivals.length - 1)];
          var k = Math.max(0, Math.min((p - a[0]) / a[1], 1));
          var e = 1 - Math.pow(1 - k, 2);
          el.style.opacity = e.toFixed(3);
          el.style.transform = e === 1 ? "none" : "translateY(" + ((1 - e) * 22).toFixed(1) + "px)";
        });
      };
    }

    /* the giant 8x mark drifts a touch as the blue flood enters */
    var mark = document.querySelector(".flood-mark");
    var queued = false;
    var scrollPass = function () {
      queued = false;
      if (judgeScrub) {
        var jr = judgePin.getBoundingClientRect();
        var span = jr.height - window.innerHeight;
        judgeScrub(span > 0 ? Math.min(Math.max(-jr.top / span, 0), 1) : 1);
      }
      if (mark) {
        var r = mark.getBoundingClientRect();
        var p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
        if (p > 0 && p < 1.2) {
          mark.style.transform = "translateY(" + ((0.5 - p) * -56).toFixed(1) + "px)";
        }
      }
      /* catch-up: an instant jump can teleport past elements before the
         observer ever sees them intersect — anything already above the
         viewport reveals now instead of staying invisible forever */
      for (var i = 0; i < watched.length; i++) {
        var el = watched[i];
        if (el.classList.contains("in")) continue;
        if (el.getBoundingClientRect().bottom < 0) {
          el.classList.add("in");
        }
      }
    };
    window.addEventListener("scroll", function () {
      if (!queued) { queued = true; requestAnimationFrame(scrollPass); }
    }, { passive: true });
    scrollPass();
  }

  /* the annotation circle redraws when you re-claim it; after any draw,
     inline animation:none keeps the base load animation from re-running */
  var circled = document.getElementById("circled");
  var heroPath = circled && circled.querySelector("path");
  if (circled && heroPath && !reduceMotion) {
    var lastRedraw = Date.now(); /* suppress hover replays while the load draw is still running */
    var redrawStyle = "circledraw .8s cubic-bezier(.55, 0, .25, 1) 0s";
    var redraw = function () {
      var now = Date.now();
      if (now - lastRedraw < 750) return;
      lastRedraw = now;
      heroPath.style.animation = "none";
      void heroPath.getBoundingClientRect();
      heroPath.style.animation = redrawStyle;
    };
    circled.addEventListener("mouseenter", redraw);
    circled.addEventListener("click", redraw);
    heroPath.addEventListener("animationend", function () {
      heroPath.style.animation = "none";
    });
  }
})();