(function () {
  "use strict";
  var C = window.WEDDING || {};
  var url = C.siteUrl || location.href.split("#")[0];
  var title = C.title || document.title;
  var desc = "2026.12.12 토요일 오후 3시 · " + (C.venue || "KU컨벤션웨딩홀");
  var image = url.replace(/\/?$/, "/") + "images/share-cover.jpg";

  function $(id) { return document.getElementById(id); }
  function say(msg) {
    var s = $("share-status");
    if (s) s.textContent = msg;
    if (window.weddingToast) window.weddingToast(msg);
  }

  function copyLink() {
    var done = function () { say("청첩장 링크가 복사되었어요"); };
    var fail = function () {
      var inp = $("share-url");
      if (inp) {
        inp.hidden = false; inp.value = url; inp.focus(); inp.select();
        say("아래 주소를 길게 눌러 복사해 주세요");
      }
    };
    if (window.weddingCopy) window.weddingCopy(url).then(done, fail); else fail();
  }

  function kakaoReady() {
    return window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized();
  }

  function sendKakao() {
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: title,
        description: desc,
        imageUrl: image,
        imageWidth: 1200,
        imageHeight: 800,
        link: { mobileWebUrl: url, webUrl: url }
      },
      buttons: [{ title: "청첩장 보기", link: { mobileWebUrl: url, webUrl: url } }]
    });
  }

  function init() {
    var kbtn = $("kakao-share"), cbtn = $("copy-link");
    if (cbtn) cbtn.addEventListener("click", copyLink);
    if (!kbtn) return;

    if (C.kakaoJsKey) {
      var s = document.createElement("script");
      s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
      s.crossOrigin = "anonymous";
      s.onload = function () {
        try {
          if (!window.Kakao.isInitialized()) window.Kakao.init(C.kakaoJsKey);
          kbtn.hidden = false;
          kbtn.addEventListener("click", function () {
            try { sendKakao(); } catch (e) { say("카카오톡 공유를 열지 못했어요. 링크를 복사해 주세요"); }
          });
        } catch (e) { /* 키가 잘못된 경우: 링크 복사만 사용 */ }
      };
      document.head.appendChild(s);
    } else if (navigator.share) {
      kbtn.textContent = "공유하기";
      kbtn.hidden = false;
      kbtn.addEventListener("click", function () {
        navigator.share({ title: title, text: desc, url: url }).catch(function () {});
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
