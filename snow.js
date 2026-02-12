(function () {
  var THEME_KEY = "snow";
  var FLAKE_COUNT = 200;
  var GLOW_RADIUS = 140;

  var canvas = null;
  var ctx = null;
  var flakes = [];
  var rafId = null;
  var active = false;
  var mouseX = -9999;
  var mouseY = -9999;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function createFlake(startY) {
    var w = canvas ? canvas.width : window.innerWidth;
    var h = canvas ? canvas.height : window.innerHeight;
    return {
      x: rand(0, w),
      y: typeof startY === "number" ? startY : rand(-h, 0),
      r: rand(1.5, 5),
      speed: rand(0.5, 2),
      wobbleAmp: rand(0.3, 1.2),
      wobbleSpeed: rand(0.008, 0.025),
      wobblePhase: rand(0, Math.PI * 2),
      opacity: rand(0.4, 0.9),
      spin: rand(-0.02, 0.02),
      angle: 0,
    };
  }

  function init() {
    canvas = document.getElementById("snowCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "snowCanvas";
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

  function spawnFlakes() {
    flakes = [];
    var h = canvas.height;
    for (var i = 0; i < FLAKE_COUNT; i++) {
      flakes.push(createFlake(rand(-20, h)));
    }
  }

  function drawFlake(f) {
    var dx = f.x - mouseX;
    var dy = f.y - mouseY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var nearMouse = dist < GLOW_RADIUS;
    var glow = nearMouse ? 1 - dist / GLOW_RADIUS : 0;

    var alpha = Math.min(1, f.opacity + 0.3 * glow);
    var radius = f.r + (nearMouse ? 2 * glow : 0);

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);

    if (nearMouse) {
      ctx.shadowColor = "rgba(200, 220, 255, " + (0.5 * glow) + ")";
      ctx.shadowBlur = 8 + 10 * glow;
    }

    // Snowflake: a soft radial dot
    var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    grad.addColorStop(0, "rgba(255, 255, 255, " + alpha + ")");
    grad.addColorStop(0.6, "rgba(220, 235, 255, " + (alpha * 0.5) + ")");
    grad.addColorStop(1, "rgba(200, 220, 245, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // For larger flakes, draw a tiny star shape
    if (f.r > 3) {
      ctx.strokeStyle = "rgba(255, 255, 255, " + (alpha * 0.4) + ")";
      ctx.lineWidth = 0.5;
      for (var i = 0; i < 6; i++) {
        var a = (Math.PI / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * radius * 0.8, Math.sin(a) * radius * 0.8);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.speed;
      f.wobblePhase += f.wobbleSpeed;
      f.x += Math.sin(f.wobblePhase) * f.wobbleAmp;
      f.angle += f.spin;

      if (f.y > canvas.height + 20) {
        flakes[i] = createFlake();
      }

      drawFlake(f);
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (active) return;
    active = true;
    canvas.style.opacity = "1";
    resize();
    spawnFlakes();
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
    flakes = [];
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
