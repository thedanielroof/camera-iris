(function () {
  var THEME_KEY = "ocean";
  var BUBBLE_COUNT = 60;
  var RAY_COUNT = 5;
  var PARTICLE_COUNT = 80;
  var GLOW_RADIUS = 160;

  var canvas = null;
  var ctx = null;
  var bubbles = [];
  var rays = [];
  var particles = [];
  var rafId = null;
  var active = false;
  var mouseX = -9999;
  var mouseY = -9999;
  var time = 0;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function createBubble(startY) {
    var w = canvas ? canvas.width : window.innerWidth;
    var h = canvas ? canvas.height : window.innerHeight;
    return {
      x: rand(0, w),
      y: typeof startY === "number" ? startY : rand(h, h + 200),
      r: rand(2, 12),
      speed: rand(0.3, 1.2),
      wobbleAmp: rand(0.3, 1.5),
      wobbleSpeed: rand(0.01, 0.03),
      wobblePhase: rand(0, Math.PI * 2),
      opacity: rand(0.15, 0.5),
    };
  }

  function createRay() {
    var w = canvas ? canvas.width : window.innerWidth;
    return {
      x: rand(0, w),
      width: rand(40, 140),
      opacity: rand(0.03, 0.08),
      speed: rand(0.1, 0.3),
      angle: rand(-0.15, 0.15),
      drift: rand(-0.2, 0.2),
    };
  }

  function createParticle() {
    var w = canvas ? canvas.width : window.innerWidth;
    var h = canvas ? canvas.height : window.innerHeight;
    return {
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.5, 2),
      opacity: rand(0.1, 0.35),
      driftX: rand(-0.15, 0.15),
      driftY: rand(-0.3, 0.1),
      twinklePhase: rand(0, Math.PI * 2),
      twinkleSpeed: rand(0.01, 0.03),
    };
  }

  function init() {
    canvas = document.getElementById("oceanCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "oceanCanvas";
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
    bubbles = [];
    rays = [];
    particles = [];
    var h = canvas.height;
    for (var i = 0; i < BUBBLE_COUNT; i++) {
      var b = createBubble(rand(0, h));
      bubbles.push(b);
    }
    for (var j = 0; j < RAY_COUNT; j++) {
      rays.push(createRay());
    }
    for (var k = 0; k < PARTICLE_COUNT; k++) {
      particles.push(createParticle());
    }
  }

  function drawRays() {
    var h = canvas.height;
    for (var i = 0; i < rays.length; i++) {
      var r = rays[i];
      r.x += r.drift;
      if (r.x > canvas.width + 200) r.x = -200;
      if (r.x < -200) r.x = canvas.width + 200;

      var grad = ctx.createLinearGradient(r.x, 0, r.x + r.width * 0.5, h);
      grad.addColorStop(0, "rgba(80, 200, 255, " + (r.opacity * 1.5) + ")");
      grad.addColorStop(0.3, "rgba(60, 180, 240, " + r.opacity + ")");
      grad.addColorStop(1, "rgba(20, 80, 140, 0)");

      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(r.x - r.width * 0.5, 0);
      ctx.lineTo(r.x + r.width * 0.5, 0);
      ctx.lineTo(r.x + r.width * 0.3 + Math.sin(time * r.speed) * 30, h);
      ctx.lineTo(r.x - r.width * 0.3 + Math.sin(time * r.speed) * 30, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBubbles() {
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      b.y -= b.speed;
      b.wobblePhase += b.wobbleSpeed;
      b.x += Math.sin(b.wobblePhase) * b.wobbleAmp;

      if (b.y < -20) {
        bubbles[i] = createBubble();
      }

      var dx = b.x - mouseX;
      var dy = b.y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var nearMouse = dist < GLOW_RADIUS;
      var glow = nearMouse ? 1 - dist / GLOW_RADIUS : 0;

      var alpha = Math.min(0.7, b.opacity + 0.3 * glow);
      var radius = b.r + (nearMouse ? 3 * glow : 0);

      ctx.save();

      // Bubble body
      var bubbleGrad = ctx.createRadialGradient(
        b.x - radius * 0.3, b.y - radius * 0.3, radius * 0.1,
        b.x, b.y, radius
      );
      bubbleGrad.addColorStop(0, "rgba(180, 230, 255, " + (alpha * 0.9) + ")");
      bubbleGrad.addColorStop(0.5, "rgba(100, 190, 240, " + (alpha * 0.4) + ")");
      bubbleGrad.addColorStop(1, "rgba(60, 150, 220, " + (alpha * 0.1) + ")");

      if (nearMouse) {
        ctx.shadowColor = "rgba(100, 200, 255, " + (0.6 * glow) + ")";
        ctx.shadowBlur = 10 + 15 * glow;
      }

      ctx.fillStyle = bubbleGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255, 255, 255, " + (alpha * 0.5) + ")";
      ctx.beginPath();
      ctx.arc(b.x - radius * 0.25, b.y - radius * 0.25, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.driftX;
      p.y += p.driftY;
      p.twinklePhase += p.twinkleSpeed;

      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;

      var twinkle = 0.5 + 0.5 * Math.sin(p.twinklePhase);
      var alpha = p.opacity * twinkle;

      var dx = p.x - mouseX;
      var dy = p.y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GLOW_RADIUS) {
        alpha = Math.min(0.7, alpha + 0.3 * (1 - dist / GLOW_RADIUS));
      }

      ctx.fillStyle = "rgba(150, 220, 255, " + alpha + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCaustics() {
    // Subtle caustic light pattern on top area
    var w = canvas.width;
    ctx.save();
    ctx.globalAlpha = 0.04;
    for (var i = 0; i < 3; i++) {
      var cx = w * 0.3 + Math.sin(time * 0.008 + i * 2) * w * 0.25;
      var cy = 60 + Math.cos(time * 0.006 + i * 1.5) * 40;
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200 + i * 50);
      grad.addColorStop(0, "rgba(120, 220, 255, 1)");
      grad.addColorStop(1, "rgba(60, 160, 220, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 200 + i * 50, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    time++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCaustics();
    drawRays();
    drawParticles();
    drawBubbles();

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
    bubbles = [];
    rays = [];
    particles = [];
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
