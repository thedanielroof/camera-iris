(() => {
  const themeBtn = document.getElementById("themeBtn");
  const themeMenu = document.getElementById("themeMenu");
  if (!themeBtn || !themeMenu) {
    return;
  }

  const THEME_STORAGE_KEY = "cameraIrisTheme";
  const DEFAULT_THEME = "matrix";
  const themeOptions = Array.from(themeMenu.querySelectorAll(".theme-option"));

  function loadThemePreference() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
      if (stored === "infinity") {
        return DEFAULT_THEME;
      }
      return stored;
    } catch (error) {
      return DEFAULT_THEME;
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme || DEFAULT_THEME);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme || DEFAULT_THEME);
    } catch (error) {
      // ignore storage failures
    }
  }

  function setActiveTheme(theme) {
    themeOptions.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === theme);
    });
  }

  function setMenuOpen(isOpen) {
    themeMenu.classList.toggle("hidden", !isOpen);
    themeBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  const initialTheme = loadThemePreference();
  applyTheme(initialTheme);
  setActiveTheme(initialTheme);

  themeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    setMenuOpen(themeMenu.classList.contains("hidden"));
  });

  themeMenu.addEventListener("click", (event) => {
    const option = event.target.closest(".theme-option");
    if (!option) {
      return;
    }
    const theme = option.dataset.theme || DEFAULT_THEME;
    applyTheme(theme);
    setActiveTheme(theme);
    setMenuOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (themeMenu.contains(event.target) || themeBtn.contains(event.target)) {
      return;
    }
    setMenuOpen(false);
  });
})();
