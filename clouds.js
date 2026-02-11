(function () {
  var THEME_KEY = "clouds";
  var CLOUD_COUNT = 14;
  var DRIFT_SPEED_MIN = 0.3;
  var DRIFT_SPEED_MAX = 0.9;

  var canvas = null;
  var ctx = null;
  var clouds = [];
  var rafId = null;
  var active = false;
  var mouseX = -9999;
  var mouseY = -9999;

  function createCloud(startX) {
    var w = canvas ? canvas.width : window.innerWidth;
    var h = canvas ? canvas.height : window.innerHeight;
    return {
      x: typeof startX === "number" ? startX : Math.random() * (w + 400) - 200,
      y: 40 + Math.random() * (h - 120),
      width: 180 + Math.random() * 260,
      height: 60 + Math.random() * 80,
      speed: DRIFT_SPEED_MIN + Math.random() * (DRIFT_SPEED_MAX - DRIFT_SPEED_MIN),
      opacity: 0.12 + Math.random() * 0.2,
      puffs: buildPuffs(),
    };
  }

  function buildPuffs() {
    var count = 4 + Math.floor(Math.random() * 4);
    var puffs = [];
    for (var i = 0; i < count; i++) {
      puffs.push({
        rx: (Math.random() - 0.5) * 0.8,
        ry: (Math.random() - 0.5) * 0.5,
        r: 0.35 + Math.random() * 0.45,
      });
    }
    return puffs;
  }

  function init() {
    canvas = document.getElementById("cloudsCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "cloudsCanvas";
      canvas.style.cssText =
        "position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity 0.8s;";
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

  function spawnClouds() {
    clouds = [];
    for (var i = 0; i < CLOUD_COUNT; i++) {
      clouds.push(createCloud());
    }
  }

  function drawCloud(c) {
    var cx = c.x;
    var cy = c.y;

    // Mouse proximity brightening
    var dx = cx + c.width / 2 - mouseX;
    var dy = cy - mouseY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var nearMouse = dist < 250;
    var glow = nearMouse ? 1 - dist / 250 : 0;

    var opacity = Math.min(0.6, c.opacity + 0.18 * glow);

    for (var i = 0; i < c.puffs.length; i++) {
      var p = c.puffs[i];
      var px = cx + c.width * 0.5 + p.rx * c.width;
      var py = cy + p.ry * c.height;
      var pr = p.r * c.width * 0.5;

      var grad = ctx.createRadialGradient(px, py, 0, px, py, pr);
      if (nearMouse) {
        grad.addColorStop(0, "rgba(255, 255, 255, " + (opacity * 1.3) + ")");
        grad.addColorStop(0.5, "rgba(235, 240, 250, " + (opacity * 0.7) + ")");
        grad.addColorStop(1, "rgba(220, 230, 245, 0)");
      } else {
        grad.addColorStop(0, "rgba(255, 255, 255, " + opacity + ")");
        grad.addColorStop(0.5, "rgba(230, 235, 245, " + (opacity * 0.5) + ")");
        grad.addColorStop(1, "rgba(210, 220, 240, 0)");
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      c.x += c.speed;

      // Wrap around when off right side
      if (c.x > canvas.width + c.width) {
        c.x = -(c.width + 50);
        c.y = 40 + Math.random() * (canvas.height - 120);
      }

      drawCloud(c);
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (active) return;
    active = true;
    canvas.style.opacity = "1";
    resize();
    spawnClouds();
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
    clouds = [];
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
