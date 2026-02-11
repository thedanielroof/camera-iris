(function () {
  var THEME_KEY = "bananas";
  var BANANA = "\u{1F34C}";
  var FONT_SIZE = 28;
  var FALL_SPEED_MIN = 0.8;
  var FALL_SPEED_MAX = 2.5;
  var WOBBLE_AMP = 1.2;
  var GLOW_RADIUS = 160;

  var canvas = null;
  var ctx = null;
  var bananas = [];
  var rafId = null;
  var active = false;
  var mouseX = -9999;
  var mouseY = -9999;

  function createBanana(startY) {
    return {
      x: Math.random() * (canvas ? canvas.width : window.innerWidth),
      y: typeof startY === "number" ? startY : -(Math.random() * 400 + 40),
      speed: FALL_SPEED_MIN + Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN),
      size: 18 + Math.random() * 18,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 3,
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      opacity: 0.55 + Math.random() * 0.4,
    };
  }

  function init() {
    canvas = document.getElementById("bananaRainCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "bananaRainCanvas";
      canvas.style.cssText =
        "position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity 0.6s;";
      var backdrop = document.querySelector(".backdrop");
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function spawnBatch() {
    var count = Math.floor(canvas.width / 50);
    bananas = [];
    for (var i = 0; i < count; i++) {
      bananas.push(createBanana(-(Math.random() * canvas.height)));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < bananas.length; i++) {
      var b = bananas[i];
      b.y += b.speed;
      b.rotation += b.rotSpeed;
      b.wobbleOffset += b.wobbleSpeed;
      var wobbleX = Math.sin(b.wobbleOffset) * WOBBLE_AMP;
      b.x += wobbleX;

      var dx = b.x - mouseX;
      var dy = b.y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var nearMouse = dist < GLOW_RADIUS;
      var glow = nearMouse ? 1 - dist / GLOW_RADIUS : 0;

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate((b.rotation * Math.PI) / 180);

      if (nearMouse) {
        ctx.shadowColor = "rgba(255, 230, 50, " + (0.9 * glow) + ")";
        ctx.shadowBlur = 15 + 25 * glow;
        ctx.globalAlpha = Math.min(1, b.opacity + 0.4 * glow);
        ctx.font = (b.size + 8 * glow) + "px serif";
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.globalAlpha = b.opacity;
        ctx.font = b.size + "px serif";
      }

      ctx.fillText(BANANA, 0, 0);
      ctx.restore();

      // Respawn when off screen
      if (b.y > canvas.height + 60) {
        bananas[i] = createBanana();
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (active) return;
    active = true;
    canvas.style.opacity = "0.7";
    resize();
    spawnBatch();
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
    bananas = [];
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
