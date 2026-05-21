(function () {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const progress = document.getElementById("progress");
  const counter = document.getElementById("counter");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  const deck = document.getElementById("deck");
  const embedMode = new URLSearchParams(window.location.search).get("embed") === "1";
  let index = 0;
  let startX = 0;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function update() {
    slides.forEach(function (slide, position) {
      slide.classList.toggle("active", position === index);
      slide.classList.toggle("past", position < index);
      slide.setAttribute("aria-hidden", position === index ? "false" : "true");
    });
    const current = index + 1;
    if (counter) counter.textContent = pad(current) + " / " + pad(slides.length);
    if (progress) progress.style.width = (current / slides.length) * 100 + "%";
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === slides.length - 1;
    window.history.replaceState(null, "", "#" + current);
  }

  function goTo(nextIndex) {
    index = Math.max(0, Math.min(slides.length - 1, nextIndex));
    update();
  }

  function fromHash() {
    const raw = Number(window.location.hash.replace("#", ""));
    if (Number.isInteger(raw) && raw >= 1 && raw <= slides.length) index = raw - 1;
  }

  function dropState(value) {
    const count = Math.max(0, Math.floor(Number(value) || 0));
    if (count < 50) return { drop: "Drop 00", counter: count + "/100 eSIM spots reserved" };
    if (count < 80) return { drop: "Drop 00", counter: count + "/100 eSIM spots reserved" };
    if (count < 95) return { drop: "Drop 00", counter: count + "/100 eSIM spots reserved" };
    if (count < 100) return { drop: "Drop 00", counter: count + "/100 eSIM spots reserved" };
    if (count === 100) return { drop: "Drop 00 full", counter: "100/100 eSIM spots reserved" };
    if (count < 500) return { drop: "Drop 01", counter: count + "/500 early access spots reserved" };
    if (count === 500) return { drop: "Drop 01 full", counter: "500 people joined early access" };
    return { drop: "Future waitlist", counter: count + " people joined early access" };
  }

  function dropCount(payload) {
    if (typeof payload.globalPosition === "number") return payload.globalPosition;
    if (typeof payload.globalCount === "number") return payload.globalCount;
    if (typeof payload.reservedCount === "number") return payload.reservedCount;
    return 100;
  }

  function showDrop(state) {
    document.querySelectorAll("[data-pilot-counter]").forEach(function (element) {
      element.textContent = state.counter;
    });
    document.querySelectorAll("[data-pilot-drop]").forEach(function (element) {
      element.textContent = state.drop;
    });
  }

  function loadPublicDrop() {
    if (!document.querySelector("[data-pilot-counter]")) return;
    fetch("/api/public/drop?ts=" + Date.now(), {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "cache-control": "no-cache"
      }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("drop unavailable");
        return response.json();
      })
      .then(function (payload) {
        showDrop(dropState(dropCount(payload)));
      })
      .catch(function () {
        showDrop(dropState(100));
      });
  }

  function utcStamp() {
    try {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, "0");
      const minutes = String(now.getUTCMinutes()).padStart(2, "0");
      return hours + ":" + minutes + " UTC";
    } catch (error) {
      return "UTC";
    }
  }

  function scheduleHour(update) {
    const now = new Date();
    let untilNextHour = (60 - now.getUTCMinutes()) * 60000;
    untilNextHour -= now.getUTCSeconds() * 1000;
    untilNextHour -= now.getUTCMilliseconds();
    if (untilNextHour < 1000) untilNextHour += 3600000;
    window.setTimeout(function () {
      update();
      window.setInterval(update, 3600000);
    }, untilNextHour);
  }

  function initEarthSignal() {
    const img = document.getElementById("earth-signal-img");
    const utc = document.getElementById("earth-signal-utc");
    if (!img) return;
    let hasFrame = false;

    function frameUrl(bucket) {
      return "https://moontel.net/api/public/earth-signal.jpg?h=" + bucket + "&v=3";
    }

    function probeSource(url) {
      return fetch(url, { method: "HEAD", cache: "no-store" })
        .then(function (response) {
          const source = response.headers.get("x-earth-signal-source");
          if (source === "nasa" || source === "nasa-raw" || source === "fallback") return source;
          return "fallback";
        })
        .catch(function () {
          return "fallback";
        });
    }

    function update() {
      const bucket = Math.floor(Date.now() / 3600000);
      const url = frameUrl(bucket);
      if (utc) utc.textContent = utcStamp();
      if (img.dataset.frameUrl === url && hasFrame) return;
      const preload = new Image();
      preload.decoding = "async";
      preload.onload = function () {
        probeSource(url).then(function (source) {
          img.dataset.frameUrl = url;
          img.dataset.earthSource = source;
          img.src = url;
          window.requestAnimationFrame(function () {
            img.classList.add("is-ready");
          });
          hasFrame = true;
        });
      };
      preload.onerror = function () {
        if (!hasFrame) img.classList.remove("is-ready");
      };
      preload.src = url;
    }

    update();
    scheduleHour(update);
    window.setInterval(function () {
      if (utc) utc.textContent = utcStamp();
    }, 60000);
  }

  function initMoonSignal() {
    const img = document.getElementById("moon-signal-img");
    const fallback = document.querySelector(".moon-fallback");
    const utc = document.getElementById("moon-signal-utc");
    if (!img) return;
    const start = Date.UTC(2026, 0, 1, 0, 0, 0);
    const maxIndex = 8759;
    let hasFrame = false;

    function hourIndex() {
      const raw = Math.floor((Date.now() - start) / 3600000);
      return Math.max(0, Math.min(maxIndex, raw));
    }

    function pad4(value) {
      return String(value).padStart(4, "0");
    }

    function frameUrl(indexValue) {
      return "https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/frames/730x730_1x1_30p/moon." + pad4(indexValue) + ".jpg";
    }

    function update() {
      const nextIndex = hourIndex();
      const url = frameUrl(nextIndex);
      if (utc) utc.textContent = utcStamp();
      if (img.dataset.frameUrl === url && hasFrame) return;
      const preload = new Image();
      preload.decoding = "async";
      preload.onload = function () {
        img.src = url;
        img.dataset.frameUrl = url;
        img.dataset.hourIndex = String(nextIndex);
        img.classList.add("is-ready");
        if (fallback) fallback.style.display = "block";
        hasFrame = true;
      };
      preload.onerror = function () {
        if (!hasFrame) {
          img.classList.remove("is-ready");
          img.style.display = "none";
          if (fallback) fallback.style.display = "block";
        }
      };
      preload.src = url;
    }

    update();
    scheduleHour(update);
    window.setInterval(function () {
      if (utc) utc.textContent = utcStamp();
    }, 60000);
  }

  function initAnalytics() {
    if (embedMode) return;
    window.va = window.va || function () {
      (window.vaq = window.vaq || []).push(arguments);
    };
    const analytics = document.createElement("script");
    analytics.defer = true;
    analytics.src = "/_vercel/insights/script.js";
    document.body.appendChild(analytics);
  }

  if (embedMode) document.body.classList.add("embed");

  if (prev) prev.addEventListener("click", function () { goTo(index - 1); });
  if (next) next.addEventListener("click", function () { goTo(index + 1); });

  window.addEventListener("keydown", function (event) {
    const key = event.key;
    if (["ArrowRight", "PageDown", " "].includes(key)) {
      event.preventDefault();
      goTo(index + 1);
    }
    if (["ArrowLeft", "PageUp"].includes(key)) {
      event.preventDefault();
      goTo(index - 1);
    }
    if (key === "Home") {
      event.preventDefault();
      goTo(0);
    }
    if (key === "End") {
      event.preventDefault();
      goTo(slides.length - 1);
    }
  });

  window.addEventListener("hashchange", function () {
    fromHash();
    update();
  });

  if (deck) {
    deck.addEventListener("pointerdown", function (event) {
      startX = event.clientX;
    });
    deck.addEventListener("pointerup", function (event) {
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 80) goTo(index + (delta < 0 ? 1 : -1));
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      initEarthSignal();
      initMoonSignal();
    }
  }, { once: true });

  fromHash();
  update();
  loadPublicDrop();
  initEarthSignal();
  initMoonSignal();
  initAnalytics();
})();
