(function () {
  const THEME_KEY = "matrix";
  const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFZ";
  const FONT_SIZE = 15;
  const FADE_ALPHA = 0.06;
  const DROP_SPEED_MIN = 0.15;
  const DROP_SPEED_MAX = 0.55;
  const COLOR_HEAD = "#aaffcc";
  const COLOR_BODY = "#00ff8c";
  const GLOW_RADIUS = 140;

  let canvas = null;
  let ctx = null;
  let columns = 0;
  let drops = [];
  let speeds = [];
  let rafId = null;
  let active = false;
  let mouseX = -9999;
  let mouseY = -9999;

  function init() {
    canvas = document.getElementById("matrixRainCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "matrixRainCanvas";
      canvas.style.cssText =
        "position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity 0.6s;";
      const backdrop = document.querySelector(".backdrop");
      if (backdrop) {
        backdrop.after(canvas);
      } else {
        document.body.prepend(canvas);
      }
    }
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    checkTheme();
    var observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    var newCols = Math.ceil(w / FONT_SIZE);
    if (newCols !== columns) {
      var oldDrops = drops;
      var oldSpeeds = speeds;
      drops = new Array(newCols);
      speeds = new Array(newCols);
      for (var i = 0; i < newCols; i++) {
        if (i < oldDrops.length && oldDrops[i] !== undefined) {
          drops[i] = oldDrops[i];
          speeds[i] = oldSpeeds[i];
        } else {
          drops[i] = Math.random() * -100;
          speeds[i] = DROP_SPEED_MIN + Math.random() * (DROP_SPEED_MAX - DROP_SPEED_MIN);
        }
      }
      columns = newCols;
    }
  }

  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, " + FADE_ALPHA + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = FONT_SIZE + "px monospace";

    for (var i = 0; i < columns; i++) {
      var ch = CHARS[Math.floor(Math.random() * CHARS.length)];
      var x = i * FONT_SIZE;
      var y = drops[i] * FONT_SIZE;

      // Distance from mouse cursor
      var dx = x - mouseX;
      var dy = y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var nearMouse = dist < GLOW_RADIUS;
      var glow = nearMouse ? 1 - dist / GLOW_RADIUS : 0;

      // Head character
      if (nearMouse) {
        // Bright white-green glow near cursor
        var r = Math.round(170 + 85 * glow);
        var g = 255;
        var b = Math.round(200 + 55 * glow);
        ctx.shadowColor = "rgba(" + r + ", 255, " + b + ", " + (0.8 * glow) + ")";
        ctx.shadowBlur = 12 + 18 * glow;
        ctx.fillStyle = "rgb(" + r + ", " + g + ", " + b + ")";
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.fillStyle = COLOR_HEAD;
      }
      ctx.fillText(ch, x, y);

      // Trail character
      if (drops[i] > 1) {
        var trailCh = CHARS[Math.floor(Math.random() * CHARS.length)];
        var ty = y - FONT_SIZE;
        var tDx = x - mouseX;
        var tDy = ty - mouseY;
        var tDist = Math.sqrt(tDx * tDx + tDy * tDy);
        var tNear = tDist < GLOW_RADIUS;
        var tGlow = tNear ? 1 - tDist / GLOW_RADIUS : 0;

        if (tNear) {
          var tr = Math.round(100 + 100 * tGlow);
          ctx.shadowColor = "rgba(" + tr + ", 255, 180, " + (0.5 * tGlow) + ")";
          ctx.shadowBlur = 8 + 12 * tGlow;
          ctx.fillStyle = "rgb(" + tr + ", 255, " + Math.round(140 + 60 * tGlow) + ")";
          ctx.globalAlpha = 0.7 + 0.3 * tGlow;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.fillStyle = COLOR_BODY;
          ctx.globalAlpha = 0.7;
        }
        ctx.fillText(trailCh, x, ty);
        ctx.globalAlpha = 1;
      }

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      drops[i] += speeds[i];

      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = Math.random() * -20;
        speeds[i] = DROP_SPEED_MIN + Math.random() * (DROP_SPEED_MAX - DROP_SPEED_MIN);
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (active) return;
    active = true;
    canvas.style.opacity = "0.45";
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < columns; i++) {
      drops[i] = Math.random() * -50;
      speeds[i] = DROP_SPEED_MIN + Math.random() * (DROP_SPEED_MAX - DROP_SPEED_MIN);
    }
    draw();
  }

  function stop() {
    if (!active) return;
    active = false;
    canvas.style.opacity = "0";
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function checkTheme() {
    var theme = document.documentElement.getAttribute("data-theme");
    if (theme === THEME_KEY) {
      start();
    } else {
      stop();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
