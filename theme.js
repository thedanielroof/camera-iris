(() => {
  const THEME_STORAGE_KEY = "cameraIrisTheme";
  const CUSTOM_THEMES_KEY = "cameraIrisCustomThemes";
  const DEFAULT_THEME = "matrix";

  function loadCustomThemes() {
    if (typeof localStorage === "undefined") {
      return [];
    }
    try {
      const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.prompt) : [];
    } catch (error) {
      return [];
    }
  }

  function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function hslToRgb(h, s, l) {
    const sat = s / 100;
    const light = l / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = sat * Math.min(light, 1 - light);
    const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
  }

  function mixRgb(base, target, amount) {
    return base.map((value, index) => Math.round(value + (target[index] - value) * amount));
  }

  function rgbToCss(rgb) {
    return rgb.join(" ");
  }

  function rgbToHex(rgb) {
    return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  }

  function buildThemeTokens(prompt) {
    const seed = hashString(prompt);
    const hue = seed % 360;
    const accent = hslToRgb(hue, 75, 55);
    const strong = hslToRgb(hue, 80, 70);
    const border = hslToRgb(hue, 70, 60);
    const deep = hslToRgb(hue, 70, 35);
    const soft = hslToRgb(hue, 60, 65);
    const bgHue = (hue + 220) % 360;
    const bg0 = hslToRgb(bgHue, 25, 6);
    const bg1 = hslToRgb(bgHue, 22, 10);
    const textMain = mixRgb([246, 239, 230], accent, 0.08);
    const textDim = mixRgb([199, 185, 170], accent, 0.08);
    const accentText = mixRgb([255, 255, 255], accent, 0.18);
    const accentTextStrong = mixRgb([255, 255, 255], strong, 0.15);
    const accentTextSoft = mixRgb([255, 255, 255], soft, 0.1);
    const accentTextMuted = mixRgb([220, 220, 220], accent, 0.12);
    const accentTextBright = mixRgb([255, 255, 255], strong, 0.2);
    const accentTextAlt = mixRgb([245, 245, 245], accent, 0.12);
    const accentTextDim = mixRgb([210, 210, 210], accent, 0.12);
    const accentTextBadge = mixRgb([245, 255, 248], soft, 0.2);
    const accentTextTitle = mixRgb([240, 255, 250], strong, 0.25);
    const accentTextMetrics = mixRgb([232, 255, 246], soft, 0.2);
    const accentTextMeta = mixRgb([205, 245, 230], accent, 0.2);
    const accentTextHeader = mixRgb([198, 235, 220], accent, 0.18);

    return {
      accent,
      strong,
      border,
      deep,
      soft,
      bg0,
      bg1,
      textMain,
      textDim,
      accentText,
      accentTextStrong,
      accentTextSoft,
      accentTextMuted,
      accentTextBright,
      accentTextAlt,
      accentTextDim,
      accentTextBadge,
      accentTextTitle,
      accentTextMetrics,
      accentTextMeta,
      accentTextHeader,
    };
  }

  function buildThemeStyles(theme) {
    const tokens = buildThemeTokens(theme.prompt || theme.name || theme.id);
    return `:root[data-theme="${theme.id}"] {\n` +
      `  --bg-0: ${rgbToHex(tokens.bg0)};\n` +
      `  --bg-1: ${rgbToHex(tokens.bg1)};\n` +
      `  --accent-rgb: ${rgbToCss(tokens.accent)};\n` +
      `  --accent-border-rgb: ${rgbToCss(tokens.border)};\n` +
      `  --accent-strong-rgb: ${rgbToCss(tokens.strong)};\n` +
      `  --accent-deep-rgb: ${rgbToCss(tokens.deep)};\n` +
      `  --accent-soft-rgb: ${rgbToCss(tokens.soft)};\n` +
      `  --accent-text: ${rgbToHex(tokens.accentText)};\n` +
      `  --accent-text-strong: ${rgbToHex(tokens.accentTextStrong)};\n` +
      `  --accent-text-soft: ${rgbToHex(tokens.accentTextSoft)};\n` +
      `  --accent-text-muted: ${rgbToHex(tokens.accentTextMuted)};\n` +
      `  --accent-text-bright: ${rgbToHex(tokens.accentTextBright)};\n` +
      `  --accent-text-alt: ${rgbToHex(tokens.accentTextAlt)};\n` +
      `  --accent-text-dim: ${rgbToHex(tokens.accentTextDim)};\n` +
      `  --accent-text-badge: ${rgbToHex(tokens.accentTextBadge)};\n` +
      `  --accent-text-title: ${rgbToHex(tokens.accentTextTitle)};\n` +
      `  --accent-text-metrics: ${rgbToHex(tokens.accentTextMetrics)};\n` +
      `  --accent-text-meta: ${rgbToHex(tokens.accentTextMeta)};\n` +
      `  --accent-text-header: ${rgbToHex(tokens.accentTextHeader)};\n` +
      `  --text-main: ${rgbToHex(tokens.textMain)};\n` +
      `  --text-dim: ${rgbToHex(tokens.textDim)};\n` +
      `}`;
  }

  function ensureCustomThemeStyles(themes) {
    const id = "customThemeStyles";
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = themes.map((theme) => buildThemeStyles(theme)).join("\n");
  }

  function loadThemePreference() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
      if (stored === "infinity") {
        return DEFAULT_THEME;
      }
      if (stored.startsWith("custom-")) {
        const themes = loadCustomThemes();
        if (!themes.some((theme) => theme.id === stored)) {
          return DEFAULT_THEME;
        }
      }
      return stored;
    } catch (error) {
      return DEFAULT_THEME;
    }
  }

  const themes = loadCustomThemes();
  ensureCustomThemeStyles(themes);
  const theme = loadThemePreference();
  document.documentElement.setAttribute("data-theme", theme || DEFAULT_THEME);
})();
