(function () {
  var THEME_KEY = "elden-ring";
  var RUNE_COUNT = 40;
  var ASH_COUNT = 60;
  var GLOW_RADIUS = 160;

  var canvas = null;
  var ctx = null;
  var runes = [];
  var ashes = [];
  var erdtreeGlow = { phase: 0 };
  var rafId = null;
  var active = false;
  var mouseX = -9999;
  var mouseY = -9999;
  var time = 0;

  // Elden Ring rune-like symbols
  var RUNE_CHARS = ["\u2720", "\u2726", "\u2727", "\u2605", "\u2736", "\u2737", "\u25C8", "\u25CA", "\u2742", "\u273B", "\u2741", "\u2748", "\u274B", "\u2756"];

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function createRune() {
    var w = canvas ? canvas.width : window.innerWidth;
    var h = canvas ? canvas.height : window.innerHeight;
    return {
      x: rand(0, w),
      y: rand(0, h),
      char: RUNE_CHARS[Math.floor(Math.random() * RUNE_CHARS.length)],
      size: rand(12, 28),
      opacity: 0,
      maxOpacity: rand(0.08, 0.22),
      fadeSpeed: rand(0.002, 0.006),
      fadeDir: 1,
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.003, 0.003),
      life: rand(200, 600),
      age: 0,
    };
  }

  function createAsh(startY) {
    var w = canvas ? canvas.width : window.innerWidth;
    var h = canvas ? canvas.height : window.innerHeight;
    return {
      x: rand(0, w),
      y: typeof startY === "number" ? startY : rand(h * 0.3, h + 40),
      r: rand(1, 3),
      speed: rand(0.2, 0.8),
      drift: rand(-0.3, 0.3),
      wobblePhase: rand(0, Math.PI * 2),
      wobbleSpeed: rand(0.008, 0.02),
      wobbleAmp: rand(0.3, 1),
      opacity: rand(0.15, 0.45),
      hue: rand(30, 50),
    };
  }

  function init() {
    canvas = document.getElementById("eldenRingCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "eldenRingCanvas";
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
    runes = [];
    ashes = [];
    var h = canvas.height;
    for (var i = 0; i < RUNE_COUNT; i++) runes.push(createRune());
    for (var j = 0; j < ASH_COUNT; j++) ashes.push(createAsh(rand(0, h)));
  }

  function drawErdtreeGlow() {
    var w = canvas.width;
    var h = canvas.height;
    erdtreeGlow.phase += 0.004;

    var pulse = 0.6 + 0.4 * Math.sin(erdtreeGlow.phase);
    var cx = w * 0.5;
    var cy = h * 0.08;

    // Erdtree — golden glow at top center
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.55 * pulse);
    grad.addColorStop(0, "rgba(220, 180, 80, " + (0.06 * pulse) + ")");
    grad.addColorStop(0.3, "rgba(180, 140, 40, " + (0.04 * pulse) + ")");
    grad.addColorStop(0.6, "rgba(120, 80, 20, " + (0.02 * pulse) + ")");
    grad.addColorStop(1, "rgba(60, 30, 5, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, h * 0.55 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Thin golden branches of light
    ctx.save();
    ctx.globalAlpha = 0.03 * pulse;
    for (var i = 0; i < 5; i++) {
      var angle = -Math.PI * 0.3 + (Math.PI * 0.6 / 4) * i + Math.sin(time * 0.003 + i) * 0.05;
      var len = h * 0.4 + Math.sin(time * 0.005 + i * 2) * 40;
      var bGrad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      bGrad.addColorStop(0, "rgba(230, 200, 100, 0.8)");
      bGrad.addColorStop(1, "rgba(140, 100, 30, 0)");
      ctx.strokeStyle = bGrad;
      ctx.lineWidth = 2 + Math.sin(time * 0.008 + i) * 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(
        cx + Math.cos(angle) * len * 0.5 + Math.sin(time * 0.004 + i) * 20,
        cy + Math.sin(angle) * len * 0.5,
        cx + Math.cos(angle) * len,
        cy + Math.sin(angle) * len
      );
      ctx.stroke();
    }
    ctx.restore();

    // Ground fog
    var fogGrad = ctx.createLinearGradient(0, h, 0, h * 0.7);
    fogGrad.addColorStop(0, "rgba(80, 60, 30, 0.08)");
    fogGrad.addColorStop(0.5, "rgba(60, 45, 20, 0.04)");
    fogGrad.addColorStop(1, "rgba(40, 30, 10, 0)");
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
  }

  function drawRunes() {
    for (var i = 0; i < runes.length; i++) {
      var r = runes[i];
      r.age++;
      r.opacity += r.fadeSpeed * r.fadeDir;
      r.rotation += r.rotSpeed;

      if (r.opacity >= r.maxOpacity) r.fadeDir = -1;
      if (r.opacity <= 0 || r.age > r.life) {
        runes[i] = createRune();
        continue;
      }

      var dx = r.x - mouseX;
      var dy = r.y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var nearMouse = dist < GLOW_RADIUS;
      var glow = nearMouse ? 1 - dist / GLOW_RADIUS : 0;

      var alpha = Math.min(0.5, r.opacity + 0.25 * glow);

      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rotation);

      if (nearMouse) {
        ctx.shadowColor = "rgba(220, 180, 80, " + (0.6 * glow) + ")";
        ctx.shadowBlur = 12 + 16 * glow;
      }

      ctx.font = r.size + "px serif";
      ctx.fillStyle = "rgba(220, 180, 80, " + alpha + ")";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(r.char, 0, 0);

      ctx.restore();
    }
  }

  function drawAshes() {
    for (var i = 0; i < ashes.length; i++) {
      var a = ashes[i];
      a.y -= a.speed;
      a.wobblePhase += a.wobbleSpeed;
      a.x += a.drift + Math.sin(a.wobblePhase) * a.wobbleAmp;

      if (a.y < -20) {
        ashes[i] = createAsh();
        continue;
      }

      var dx = a.x - mouseX;
      var dy = a.y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var nearMouse = dist < GLOW_RADIUS;
      var glow = nearMouse ? 1 - dist / GLOW_RADIUS : 0;

      var alpha = Math.min(0.7, a.opacity + 0.3 * glow);
      var radius = a.r + (nearMouse ? 2 * glow : 0);

      ctx.save();
      if (nearMouse) {
        ctx.shadowColor = "rgba(255, 180, 60, " + (0.4 * glow) + ")";
        ctx.shadowBlur = 6 + 10 * glow;
      }

      var grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, radius);
      grad.addColorStop(0, "hsla(" + a.hue + ", 80%, 65%, " + alpha + ")");
      grad.addColorStop(1, "hsla(" + a.hue + ", 60%, 40%, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function draw() {
    time++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawErdtreeGlow();
    drawRunes();
    drawAshes();
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
    runes = [];
    ashes = [];
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
