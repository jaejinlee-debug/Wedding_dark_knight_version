(function () {
  "use strict";
  var C = window.WEDDING || {};
  var $ = function (id) { return document.getElementById(id); };

  function toast(msg) {
    var t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  window.weddingToast = toast;

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }
  window.weddingCopy = copyText;

  /* ---------- 사진/영상 보호 ---------- */
  document.addEventListener("contextmenu", function (e) {
    if (e.target.closest && e.target.closest(".protected-media, .gallery, #photo-dialog")) e.preventDefault();
  });
  document.addEventListener("dragstart", function (e) {
    if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") e.preventDefault();
  });
  document.addEventListener("selectstart", function (e) {
    var n = e.target && e.target.nodeType === 3 ? e.target.parentNode : e.target;
    if (n && n.closest && n.closest(".protected-media, .gallery, #photo-dialog")) e.preventDefault();
  });

  /* 확대 방지: iOS 핀치(gesture*), 두 손가락 터치, 데스크톱 Ctrl+휠/단축키 */
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (n) {
    document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener("touchmove", function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  window.addEventListener("wheel", function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

  /* 캡처 억제: 창이 가려지거나 캡처 키가 눌리면 사진을 잠시 숨김 (브라우저 한계상 완전 차단은 불가) */
  var shieldTimer;
  function shield(on, hold) {
    clearTimeout(shieldTimer);
    document.documentElement.classList.toggle("shielded", !!on);
    if (on && hold) shieldTimer = setTimeout(function () { document.documentElement.classList.remove("shielded"); }, hold);
  }
  window.addEventListener("blur", function () { shield(true); });
  window.addEventListener("focus", function () { shield(false); });
  document.addEventListener("visibilitychange", function () { shield(document.hidden); });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && (k === "+" || k === "=" || k === "-" || k === "_" || k === "0")) e.preventDefault();   // 키보드 확대
    if (mod && (k === "s" || k === "p" || k === "u")) { e.preventDefault(); if (k === "p") shield(true, 1500); }   // 저장·인쇄·소스
    if (e.metaKey && e.shiftKey && (e.code === "Digit3" || e.code === "Digit4" || e.code === "Digit5")) shield(true, 1500);   // macOS 캡처
    if (e.metaKey && e.shiftKey && e.code === "KeyS") shield(true, 1500);   // Windows 캡처 도구
  });
  document.addEventListener("keyup", function (e) {
    if (e.key === "PrintScreen" || e.keyCode === 44) {
      try { navigator.clipboard.writeText(""); } catch (err) { /* 무시 */ }
      shield(true, 1500);
    }
  });

  /* ---------- 달력 ---------- */
  function buildCalendar() {
    var body = $("calendar-body");
    if (!body) return;
    var d = new Date(C.dateISO || "2026-12-12T15:00:00+09:00");
    var year = 2026, month = 11, day = 12;
    var first = new Date(year, month, 1).getDay();
    var last = new Date(year, month + 1, 0).getDate();
    var html = "", n = 1;
    for (var r = 0; r < 6 && n <= last; r++) {
      html += "<tr>";
      for (var c = 0; c < 7; c++) {
        if ((r === 0 && c < first) || n > last) { html += "<td></td>"; continue; }
        var cls = c === 0 ? "sun" : (c === 6 ? "sat" : "");
        if (n === day) cls += " wedding-day";
        html += '<td class="' + cls.trim() + '"' + (n === day ? ' aria-label="12일 결혼식"' : "") + "><span>" + n + "</span></td>";
        n++;
      }
      html += "</tr>";
    }
    body.innerHTML = html;
  }

  /* ---------- D-day ---------- */
  function buildCountdown() {
    var el = $("countdown");
    if (!el) return;
    var target = new Date(C.dateISO || "2026-12-12T15:00:00+09:00");
    function tick() {
      var now = new Date();
      var diff = target - now;
      if (diff <= 0) {
        var endT = new Date(C.endISO || target.getTime() + 5400000);
        el.innerHTML = now < endT ? "오늘, 결혼식이 진행 중입니다 ♥" : "함께해 주셔서 감사합니다 ♥";
        return;
      }
      var days = Math.floor(diff / 86400000);
      var hrs = Math.floor((diff % 86400000) / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);
      el.innerHTML = "재진 ♥ 미진의 결혼식까지 <strong>" + days + "일 " + hrs + "시간 " + mins + "분</strong> 남았습니다";
    }
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- 달력에 일정 추가 ---------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function icsTime(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z";
  }
  function setupCalendarAdd() {
    var btn = $("calendar-add");
    if (!btn) return;
    var start = new Date(C.dateISO), end = new Date(C.endISO || start.getTime() + 5400000);
    var title = "이재진 · 이미진 결혼식";
    var loc = (C.venue || "") + " " + (C.address || "");
    var google = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(title) +
      "&dates=" + icsTime(start) + "/" + icsTime(end) +
      "&location=" + encodeURIComponent(loc) +
      "&details=" + encodeURIComponent("소중한 걸음으로 축복해 주세요.");

    var g = document.createElement("a");
    g.className = "text-link";
    g.href = google; g.target = "_blank"; g.rel = "noopener noreferrer";
    g.textContent = "구글 캘린더로 추가 ↗";
    btn.insertAdjacentElement("afterend", g);

    btn.addEventListener("click", function () {
      var ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedding//KO", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
        "UID:wedding-20261212@jaejin-mijin",
        "DTSTAMP:" + icsTime(new Date()),
        "DTSTART:" + icsTime(start), "DTEND:" + icsTime(end),
        "SUMMARY:" + title, "LOCATION:" + loc.replace(/,/g, "\\,"),
        "DESCRIPTION:소중한 걸음으로 축복해 주세요.",
        "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:내일은 결혼식입니다", "END:VALARM",
        "END:VEVENT", "END:VCALENDAR"
      ].join("\r\n");
      try {
        var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "wedding.ics";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast("일정 파일을 내려받았어요");
      } catch (e) {
        window.open(google, "_blank");
      }
    });
  }

  /* ---------- 오시는 길 ---------- */
  function buildDirections() {
    if ($("address")) $("address").textContent = C.address || "";
    var q = encodeURIComponent(C.mapQuery || C.venue || "");
    var n = $("naver-map"), k = $("kakao-map");
    if (n) { n.href = "https://map.naver.com/p/search/" + q; n.target = "_blank"; n.rel = "noopener noreferrer"; n.removeAttribute("aria-disabled"); }
    if (k) { k.href = "https://map.kakao.com/?q=" + q; k.target = "_blank"; k.rel = "noopener noreferrer"; k.removeAttribute("aria-disabled"); }
    function put(id, html) {
      var el = $(id); if (!el) return;
      if (html) el.innerHTML = html; else { var row = el.closest("div"); if (row) row.remove(); }
    }
    put("subway", C.subway); put("bus", C.bus); put("parking", C.parking);
  }

  /* ---------- 계좌 / 연락처 ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function buildAccounts() {
    var root = $("account-groups");
    if (!root) return;
    var any = false;
    (C.accounts || []).forEach(function (g) {
      var items = (g.items || []).filter(function (i) { return i.number; });
      if (!items.length) return;
      any = true;
      var det = document.createElement("details");
      det.className = "account-group";
      det.open = true;
      var html = "<summary>" + esc(g.group) + "</summary><ul>";
      items.forEach(function (i) {
        html += '<li><div><span class="role">' + esc(i.role) + " " + esc(i.name) + "</span>" +
          '<span class="acct">' + esc(i.bank) + " " + esc(i.number) + "</span></div>" +
          '<button class="copy-btn" type="button" data-copy="' + esc(i.number.replace(/[^0-9]/g, "")) + '">복사</button></li>';
      });
      det.innerHTML = html + "</ul>";
      root.appendChild(det);
    });
    if (!any) { var sec = root.closest("section"); if (sec) sec.remove(); return; }
    var tgl = $("account-toggle");
    if (tgl) tgl.addEventListener("click", function () {
      var open = root.hidden;
      root.hidden = !open;
      tgl.setAttribute("aria-expanded", open ? "true" : "false");
      tgl.classList.toggle("open", open);
      if (open) setTimeout(function () { root.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 50);
    });
    root.addEventListener("click", function (e) {
      var b = e.target.closest(".copy-btn");
      if (!b) return;
      copyText(b.getAttribute("data-copy")).then(function () { toast("계좌번호가 복사되었어요"); },
        function () { toast("복사하지 못했어요. 번호를 길게 눌러 복사해 주세요"); });
    });
  }

  function buildContacts() {
    var root = $("contacts");
    if (!root) return;
    var any = false;
    (C.contacts || []).forEach(function (g) {
      var items = (g.items || []).filter(function (i) { return i.phone; });
      if (!items.length) return;
      any = true;
      var box = document.createElement("div");
      box.className = "contact-group";
      var html = "<h3>" + esc(g.group) + "</h3><ul>";
      items.forEach(function (i) {
        var num = i.phone.replace(/[^0-9+]/g, "");
        html += "<li><span>" + esc(i.role) + " <strong>" + esc(i.name) + "</strong></span>" +
          '<span class="contact-actions"><a href="tel:' + num + '">전화</a><a href="sms:' + num + '">문자</a></span></li>';
      });
      box.innerHTML = html + "</ul>";
      root.appendChild(box);
    });
    if (!any) { var sec = root.closest("section"); if (sec) sec.remove(); }
  }

  /* ---------- 갤러리: 한 장씩 차례대로 ---------- */
  function photoSrc(file) {
    var k = "images/photo-" + file + ".jpg";
    return (window.ASSET && window.ASSET[k]) || k;
  }
  function buildGallery() {
    var g = $("gallery");
    var photos = C.photos || [];
    if (!g || !photos.length) return;
    g.innerHTML =
      '<div class="slider">' +
      '<button type="button" class="slide-frame protected-media changing" aria-label="다음 사진 보기"><img class="slide-bg" alt="" aria-hidden="true" draggable="false"><img class="slide-fg" alt="" draggable="false"></button>' +
      '<button type="button" class="slide-nav prev" aria-label="이전 사진">‹</button>' +
      '<button type="button" class="slide-nav next" aria-label="다음 사진">›</button>' +
      '</div><p class="slide-count" aria-live="polite"></p>';
    var frame = g.querySelector(".slide-frame"), bg = frame.querySelector(".slide-bg"), img = frame.querySelector(".slide-fg"), cnt = g.querySelector(".slide-count");
    var cur = 0, busy = false;

    function preload(i) { var p = new Image(); p.src = photoSrc(photos[(i + photos.length) % photos.length].file); }
    function show(i, first, dir) {
      cur = (i + photos.length) % photos.length;
      var p = photos[cur];
      cnt.textContent = (cur + 1) + " / " + photos.length;
      var done = function () { busy = false; preload(cur + 1); };
      var swap = function () {
        img.onload = function () {
          if (first) { frame.classList.remove("changing"); done(); return; }
          // 새 사진은 진행 방향 반대쪽에서 들어와 제자리로 이동
          frame.classList.add("no-anim");
          frame.style.setProperty("--dx", (dir * 28) + "px");
          void frame.offsetWidth;
          frame.classList.remove("no-anim");
          frame.classList.remove("changing");
          done();
        };
        img.onerror = function () { frame.classList.remove("changing"); busy = false; };
        img.alt = p.alt;
        bg.src = img.src = photoSrc(p.file);
      };
      if (first) { swap(); return; }
      busy = true;
      frame.style.setProperty("--dx", (dir * -28) + "px");
      frame.classList.add("changing");
      setTimeout(swap, 180);
    }
    function go(d) { if (!busy) show(cur + d, false, d); }

    frame.addEventListener("click", function () { go(1); });
    g.querySelector(".prev").addEventListener("click", function () { go(-1); });
    g.querySelector(".next").addEventListener("click", function () { go(1); });
    var sx = null;
    frame.addEventListener("touchstart", function (e) { sx = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    frame.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 45) { e.preventDefault(); go(dx < 0 ? 1 : -1); }
    });
    show(0, true, 1);
  }

  /* ---------- 배경음악 (열자마자 자동재생) ---------- */
  function setupMusic() {
    var btn = $("music-toggle"), audio = $("bgm"), label = $("music-label");
    if (!btn || !audio) return;
    var wantOn = true;          // 방문자가 직접 끄기 전까지는 계속 켜 두기
    var unlocked = false;
    audio.volume = 0.6;

    function sync() {
      var on = !audio.paused;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "배경음악 끄기" : "배경음악 재생");
      btn.classList.toggle("on", on);
      label.textContent = on ? "음악 끄기" : "음악 켜기";
    }
    var intro = $("intro");
    function hideIntro() {
      if (!intro || intro.hidden) return;
      intro.classList.add("leaving");
      document.body.classList.remove("no-scroll");
      setTimeout(function () { intro.hidden = true; }, 600);
    }
    function showIntro() {
      if (!intro || !intro.hidden) return;
      intro.hidden = false;
      document.body.classList.add("no-scroll");
      var open = function () { wantOn = true; tryPlay(); hideIntro(); };
      intro.addEventListener("click", open);
      intro.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") open(); });
    }
    function tryPlay(initial) {
      var p = audio.play();
      if (p && p.then) p.then(function () { unlocked = true; removeUnlock(); hideIntro(); },
        function () { if (initial) showIntro(); /* 브라우저가 소리 자동재생을 막음 → 첫 터치로 시작 */ });
    }
    var evts = ["pointerdown", "touchstart", "touchend", "click", "keydown", "wheel"];
    function onFirst() { if (wantOn && audio.paused) tryPlay(); }
    function removeUnlock() { evts.forEach(function (e) { window.removeEventListener(e, onFirst, true); }); }
    evts.forEach(function (e) { window.addEventListener(e, onFirst, { capture: true, passive: true }); });

    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (audio.paused) { wantOn = true; tryPlay(); }
      else { wantOn = false; audio.pause(); }
    });
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (!audio.paused) audio.pause(); }
      else if (wantOn && unlocked) tryPlay();
    });
    window.addEventListener("pageshow", function () { if (wantOn) tryPlay(); });
    tryPlay(true);              // 열자마자 시도
    sync();
  }

  /* ---------- 메인 영상 ---------- */
  function setupVideo() {
    var v = $("cover-video"), btn = $("video-toggle"), err = $("video-error");
    if (!v) return;
    function sync() {
      if (!btn) return;
      btn.textContent = v.paused ? "영상 재생" : "일시정지";
      btn.setAttribute("aria-label", v.paused ? "메인 영상 재생" : "메인 영상 일시정지");
      btn.classList.toggle("is-playing", !v.paused);
    }
    if (btn) btn.addEventListener("click", function () { if (v.paused) v.play().catch(function () {}); else v.pause(); });
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    v.addEventListener("error", function () { if (err) err.hidden = false; }, true);
    var p = v.play(); if (p && p.catch) p.catch(sync);
    sync();
  }

  /* ---------- 스크롤 등장 효과 ---------- */
  function setupReveal() {
    var els = document.querySelectorAll(".section, .cover > *");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    els.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildCalendar(); buildCountdown(); setupCalendarAdd(); buildDirections();
    buildAccounts(); buildContacts(); buildGallery(); setupMusic(); setupVideo(); setupReveal();
  });
})();
