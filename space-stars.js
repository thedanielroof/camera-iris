(function () {
  var THEME_KEY = "space";
  var STAR_COUNT = 280;
  var DRIFT_SPEED = 0.15;
  var TWINKLE_SPEED = 0.01;
  var GLOW_RADIUS = 180;
  var SHOOTING_INTERVAL = 6000;

  var canvas = null;
  var ctx = null;
  var stars = [];
  var shootingStars = [];
  var rafId = null;
  var active = false;
  var mouseX = -9999;
  var mouseY = -9999;
  var lastShoot = 0;

  function createStar() {
    var depth = Math.random();
    return {
      x: Math.random() * (canvas ? canvas.width : window.innerWidth),
      y: Math.random() * (canvas ? canvas.height : window.innerHeight),
      size: 0.5 + depth * 2.5,
      brightness: 0.3 + Math.random() * 0.7,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleRate: TWINKLE_SPEED + Math.random() * 0.02,
      driftX: (Math.random() - 0.5) * DRIFT_SPEED * (0.3 + depth),
      driftY: (Math.random() - 0.5) * DRIFT_SPEED * 0.3 + DRIFT_SPEED * 0.1 * depth,
      hue: Math.random() < 0.2 ? 30 + Math.random() * 30 : (Math.random() < 0.15 ? 200 + Math.random() * 40 : 0),
      saturation: Math.random() < 0.35 ? 20 + Math.random() * 60 : 0,
    };
  }

  function createShootingStar() {
    var startX = Math.random() * canvas.width;
    var startY = Math.random() * canvas.height * 0.4;
    var angle = (Math.PI / 6) + Math.random() * (Math.PI / 4);
    return {
      x: startX,
      y: startY,
      speed: 6 + Math.random() * 8,
      angle: angle,
      length: 60 + Math.random() * 80,
      life: 1,
      decay: 0.015 + Math.random() * 0.01,
    };
  }

  function init() {
    canvas = document.getElementById("spaceStarsCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "spaceStarsCanvas";
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

  function spawnStars() {
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push(createStar());
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var now = Date.now();

    // Occasional shooting star
    if (now - lastShoot > SHOOTING_INTERVAL && Math.random() < 0.02) {
      shootingStars.push(createShootingStar());
      lastShoot = now;
    }

    // Draw stars
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.twinklePhase += s.twinkleRate;
      var twinkle = 0.5 + 0.5 * Math.sin(s.twinklePhase);
      var alpha = s.brightness * (0.4 + 0.6 * twinkle);

      s.x += s.driftX;
      s.y += s.driftY;

      // Wrap around
      if (s.x < -5) s.x = canvas.width + 5;
      if (s.x > canvas.width + 5) s.x = -5;
      if (s.y < -5) s.y = canvas.height + 5;
      if (s.y > canvas.height + 5) s.y = -5;

      // Mouse proximity glow
      var dx = s.x - mouseX;
      var dy = s.y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var nearMouse = dist < GLOW_RADIUS;
      var glow = nearMouse ? 1 - dist / GLOW_RADIUS : 0;

      var finalAlpha = Math.min(1, alpha + 0.5 * glow);
      var finalSize = s.size + (nearMouse ? 2 * glow : 0);

      if (s.saturation > 0) {
        ctx.fillStyle = "hsla(" + s.hue + ", " + s.saturation + "%, 85%, " + finalAlpha + ")";
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, " + finalAlpha + ")";
      }

      if (nearMouse) {
        ctx.shadowColor = "rgba(200, 220, 255, " + (0.7 * glow) + ")";
        ctx.shadowBlur = 8 + 12 * glow;
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, finalSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Draw shooting stars
    for (var j = shootingStars.length - 1; j >= 0; j--) {
      var ss = shootingStars[j];
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.life -= ss.decay;

      if (ss.life <= 0) {
        shootingStars.splice(j, 1);
        continue;
      }

      var tailX = ss.x - Math.cos(ss.angle) * ss.length * ss.life;
      var tailY = ss.y - Math.sin(ss.angle) * ss.length * ss.life;

      var grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
      grad.addColorStop(0, "rgba(255, 255, 255, 0)");
      grad.addColorStop(1, "rgba(255, 255, 255, " + (ss.life * 0.8) + ")");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(ss.x, ss.y);
      ctx.stroke();
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (active) return;
    active = true;
    canvas.style.opacity = "1";
    resize();
    spawnStars();
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
    stars = [];
    shootingStars = [];
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
