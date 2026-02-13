(function () {
  var THEME_KEY = "fire";
  var EMBER_COUNT = 90;
  var GLOW_RADIUS = 150;

  var canvas = null;
  var ctx = null;
  var embers = [];
  var rafId = null;
  var active = false;
  var mouseX = -9999;
  var mouseY = -9999;
  var time = 0;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function createEmber(startY) {
    var w = canvas ? canvas.width : window.innerWidth;
    var h = canvas ? canvas.height : window.innerHeight;
    return {
      x: rand(0, w),
      y: typeof startY === "number" ? startY : rand(h * 0.5, h + 50),
      r: rand(1.5, 5),
      speed: rand(0.4, 1.8),
      wobbleAmp: rand(0.5, 2),
      wobbleSpeed: rand(0.01, 0.03),
      wobblePhase: rand(0, Math.PI * 2),
      life: rand(0.6, 1),
      hue: rand(10, 45),
    };
  }

  function init() {
    canvas = document.getElementById("fireCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "fireCanvas";
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

  function spawn() {
    embers = [];
    var h = canvas.height;
    for (var i = 0; i < EMBER_COUNT; i++) {
      embers.push(createEmber(rand(0, h)));
    }
  }

  function drawFireGlow() {
    var w = canvas.width;
    var h = canvas.height;

    // Bottom fire glow — large soft gradient
    var grd = ctx.createLinearGradient(0, h, 0, h * 0.15);
    grd.addColorStop(0, "rgba(200, 60, 10, 0.18)");
    grd.addColorStop(0.25, "rgba(220, 90, 10, 0.12)");
    grd.addColorStop(0.5, "rgba(180, 50, 5, 0.06)");
    grd.addColorStop(1, "rgba(80, 20, 0, 0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Pulsing fire sources along the bottom
    var pulseCount = 5;
    for (var i = 0; i < pulseCount; i++) {
      var cx = w * (0.1 + 0.8 * (i / (pulseCount - 1)));
      var pulse = 0.6 + 0.4 * Math.sin(time * 0.012 + i * 1.8);
      var radius = 200 + 100 * pulse;

      var grad = ctx.createRadialGradient(cx, h, 0, cx, h, radius);
      grad.addColorStop(0, "rgba(255, 120, 20, " + (0.12 * pulse) + ")");
      grad.addColorStop(0.3, "rgba(220, 70, 10, " + (0.08 * pulse) + ")");
      grad.addColorStop(0.6, "rgba(180, 40, 5, " + (0.04 * pulse) + ")");
      grad.addColorStop(1, "rgba(100, 20, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, h, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Slow moving heat distortion waves
    for (var j = 0; j < 3; j++) {
      var waveY = h * (0.5 + 0.15 * j) + Math.sin(time * 0.006 + j * 2) * 30;
      var waveGrad = ctx.createLinearGradient(0, waveY - 60, 0, waveY + 60);
      waveGrad.addColorStop(0, "rgba(255, 100, 20, 0)");
      waveGrad.addColorStop(0.5, "rgba(255, 80, 10, 0.03)");
      waveGrad.addColorStop(1, "rgba(255, 100, 20, 0)");
      ctx.fillStyle = waveGrad;
      ctx.fillRect(0, waveY - 60, w, 120);
    }
  }

  function drawEmbers() {
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      e.y -= e.speed;
      e.wobblePhase += e.wobbleSpeed;
      e.x += Math.sin(e.wobblePhase) * e.wobbleAmp;
      e.life -= 0.001;

      if (e.y < -30 || e.life <= 0) {
        embers[i] = createEmber();
        continue;
      }

      var dx = e.x - mouseX;
      var dy = e.y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var nearMouse = dist < GLOW_RADIUS;
      var glow = nearMouse ? 1 - dist / GLOW_RADIUS : 0;

      var heightFade = Math.min(1, (canvas.height - e.y) / (canvas.height * 0.7));
      var alpha = e.life * heightFade * (0.5 + 0.4 * glow);
      var radius = e.r + (nearMouse ? 3 * glow : 0);

      ctx.save();

      if (nearMouse) {
        ctx.shadowColor = "rgba(255, 140, 30, " + (0.6 * glow) + ")";
        ctx.shadowBlur = 12 + 18 * glow;
      }

      var grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, radius * 2);
      grad.addColorStop(0, "hsla(" + e.hue + ", 100%, 70%, " + alpha + ")");
      grad.addColorStop(0.4, "hsla(" + e.hue + ", 90%, 55%, " + (alpha * 0.6) + ")");
      grad.addColorStop(1, "hsla(" + e.hue + ", 80%, 40%, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.fillStyle = "hsla(" + (e.hue + 10) + ", 100%, 85%, " + (alpha * 0.8) + ")";
      ctx.beginPath();
      ctx.arc(e.x, e.y, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function draw() {
    time++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFireGlow();
    drawEmbers();
    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (active) return;
    active = true;
    canvas.style.opacity = "1";
    resize();
    spawn();
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
    embers = [];
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
