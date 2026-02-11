const MEDIA_STORAGE_KEY = "cameraIrisMediaLibrary";
const BLOB_DB_NAME = "cameraIrisBlobStore";
const BLOB_STORE_NAME = "blobs";
const NO_FOLDER_ID = "none";
const LEGACY_UNSORTED_ID = "unsorted";
const ALL_MEDIA_ID = "all";
const RENDERS_FOLDER_ID = "renders";
const TRASH_FOLDER_ID = "trash";
const DELETED_IDS_KEY = "cameraIrisDeletedIds";

function loadDeletedIds() {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch (e) { return new Set(); }
}

function markAsDeleted(id) {
  try {
    const ids = loadDeletedIds();
    ids.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...ids]));
  } catch (e) { /* ignore */ }
}

function openBlobDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BLOB_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(BLOB_STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadBlobData(id) {
  try {
    const db = await openBlobDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE_NAME, "readonly");
      const req = tx.objectStore(BLOB_STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || "");
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return ""; }
}

async function deleteBlobData(id) {
  try {
    const db = await openBlobDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE_NAME, "readwrite");
      tx.objectStore(BLOB_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { /* ignore */ }
}

const folderList = document.getElementById("folderList");
const mediaGrid = document.getElementById("mediaGrid");
const mediaHeading = document.getElementById("mediaHeading");
const mediaSubheading = document.getElementById("mediaSubheading");
const mediaEmpty = document.getElementById("mediaEmpty");
const newFolderName = document.getElementById("newFolderName");
const createFolderBtn = document.getElementById("createFolderBtn");
const creditsBtn = document.getElementById("creditsBtn");
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
const profileNameInput = document.getElementById("profileNameInput");
const profileEmail = document.getElementById("profileEmail");
const profilePassword = document.getElementById("profilePassword");
const profilePlan = document.getElementById("profilePlan");
const profileSaveBtn = document.getElementById("profileSaveBtn");
const notifyBtn = document.getElementById("notifyBtn");
const themeBtn = document.getElementById("themeBtn");
const themeMenu = document.getElementById("themeMenu");
const themeOptions = document.querySelectorAll(".theme-option");
const themeCreateBtn = document.querySelector(".theme-create");
const themeCreatePanel = document.querySelector(".theme-create-panel");
const themeCreateInput = document.querySelector(".theme-create-input");
const themeCreateAdd = document.querySelector(".theme-create-add");
const themeCreateDelete = document.querySelector(".theme-create-delete");
const addBtn = document.getElementById("topAdd");
const addMenu = document.getElementById("addMenu");
const inviteBtn = document.getElementById("inviteBtn");
const postBtn = document.getElementById("postBtn");
const postPreview = document.getElementById("postPreview");
const postPreviewClose = document.getElementById("postPreviewClose");
const postPreviewImg = document.getElementById("postPreviewImg");
const postPreviewVideo = document.getElementById("postPreviewVideo");
const postZoomIn = document.getElementById("postZoomIn");
const postZoomOut = document.getElementById("postZoomOut");
const NOTIFY_STORAGE_KEY = "cameraIrisNotifyEnabled";
const THEME_STORAGE_KEY = "cameraIrisTheme";
const CUSTOM_THEMES_KEY = "cameraIrisCustomThemes";
const CREDITS_STORAGE_KEY = "cameraIrisCredits";
const PROFILE_EMAIL_KEY = "cameraIrisProfileEmail";
const PROFILE_PLAN_KEY = "cameraIrisProfilePlan";
const PROFILE_NAME_KEY = "cameraIrisProfileName";
const PROFILE_PASSWORD_KEY = "cameraIrisProfilePassword";
const PROFILE_ACCOUNT_KEY = "cameraIrisProfileAccount";
const DEFAULT_THEME = "matrix";
const DEFAULT_CREDITS = 120;
const DEFAULT_PLAN = "unlimited";
let notifyEnabled = false;

let activeFolderId = ALL_MEDIA_ID;
let library = loadLibrary();
let previewScale = 1;
let previewTranslate = { x: 0, y: 0 };
let previewDrag = { active: false, startX: 0, startY: 0, originX: 0, originY: 0, target: null };

function applyPreviewTransform() {
  const transform = `translate(${previewTranslate.x}px, ${previewTranslate.y}px) scale(${previewScale})`;
  if (postPreviewImg) {
    postPreviewImg.style.transform = transform;
  }
  if (postPreviewVideo) {
    postPreviewVideo.style.transform = transform;
  }
}

function setPreviewScale(nextScale) {
  previewScale = Math.max(0.5, Math.min(3, nextScale));
  applyPreviewTransform();
}

function openPostPreview(asset) {
  if (!postPreview || !postPreviewImg || !postPreviewVideo) {
    return;
  }
  previewTranslate = { x: 0, y: 0 };
  setPreviewScale(1.15);
  postPreviewImg.classList.add("hidden");
  postPreviewVideo.classList.add("hidden");
  postPreviewVideo.pause();
  postPreviewVideo.removeAttribute("src");
  postPreviewVideo.load();

  if (asset?.kind === "video" && asset?.src) {
    postPreviewVideo.src = asset.src;
    postPreviewVideo.classList.remove("hidden");
    postPreviewVideo.play().catch(() => {});
  } else {
    const imgSrc = asset?._loadedSrc || asset?.poster || asset?.src || "";
    postPreviewImg.src = imgSrc;
    postPreviewImg.classList.remove("hidden");

    // Load full-res from IndexedDB if needed
    if (!imgSrc && asset?.blobRef) {
      loadBlobData(asset.blobRef).then((data) => {
        if (data) postPreviewImg.src = data;
      });
    }
  }

  postPreview.classList.remove("hidden");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setPreviewScale(1);
    });
  });
}

function closePostPreview() {
  if (!postPreview || !postPreviewImg || !postPreviewVideo) {
    return;
  }
  previewTranslate = { x: 0, y: 0 };
  postPreview.classList.add("hidden");
  postPreviewImg.src = "";
  postPreviewImg.style.transform = "";
  postPreviewVideo.style.transform = "";
  previewDrag.active = false;
  previewDrag.target = null;
  postPreviewVideo.pause();
  postPreviewVideo.removeAttribute("src");
  postPreviewVideo.load();
}

function startPreviewDrag(event, target) {
  if (!target) {
    return;
  }
  if (event.button !== undefined && event.button !== 0) {
    return;
  }
  previewDrag.active = true;
  previewDrag.startX = event.clientX;
  previewDrag.startY = event.clientY;
  previewDrag.originX = previewTranslate.x;
  previewDrag.originY = previewTranslate.y;
  previewDrag.target = target;
  target.classList.add("dragging");
  try {
    target.setPointerCapture(event.pointerId);
  } catch (error) {
    // ignore pointer capture failures
  }
}

function movePreviewDrag(event) {
  if (!previewDrag.active) {
    return;
  }
  const dx = event.clientX - previewDrag.startX;
  const dy = event.clientY - previewDrag.startY;
  previewTranslate = {
    x: previewDrag.originX + dx / (previewScale || 1),
    y: previewDrag.originY + dy / (previewScale || 1),
  };
  applyPreviewTransform();
}

function endPreviewDrag() {
  if (!previewDrag.active) {
    return;
  }
  previewDrag.active = false;
  if (previewDrag.target) {
    previewDrag.target.classList.remove("dragging");
  }
  previewDrag.target = null;
}

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createDefaultLibrary() {
  return {
    version: 1,
    folders: [
      { id: RENDERS_FOLDER_ID, name: "Renders" },
      { id: TRASH_FOLDER_ID, name: "Trash" },
    ],
    assets: [],
  };
}

function ensureRendersFolder(folders) {
  if (!folders.some((f) => f.id === RENDERS_FOLDER_ID)) {
    folders.unshift({ id: RENDERS_FOLDER_ID, name: "Renders" });
  }
  if (!folders.some((f) => f.id === TRASH_FOLDER_ID)) {
    folders.push({ id: TRASH_FOLDER_ID, name: "Trash" });
  }
  return folders;
}

function normalizeLibrary(raw) {
  const base = createDefaultLibrary();

  if (!raw || typeof raw !== "object") {
    return base;
  }

  const folders = ensureRendersFolder(
    Array.isArray(raw.folders)
      ? raw.folders.filter((folder) => folder?.id && folder.id !== LEGACY_UNSORTED_ID)
      : []
  );
  const assets = Array.isArray(raw.assets)
    ? raw.assets.map((asset) => {
        const next = { ...asset };
        if (!next.folderId || next.folderId === LEGACY_UNSORTED_ID) {
          next.folderId = NO_FOLDER_ID;
        }
        return next;
      })
    : [];

  return {
    version: 1,
    folders,
    assets,
  };
}

function loadLibrary() {
  if (typeof localStorage === "undefined") {
    return createDefaultLibrary();
  }

  try {
    const raw = localStorage.getItem(MEDIA_STORAGE_KEY);
    return normalizeLibrary(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.warn("Failed to load media library", error);
    return createDefaultLibrary();
  }
}

function saveLibrary(next) {
  library = normalizeLibrary(next);
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(library));
  } catch (error) {
    console.warn("Failed to save media library", error);
  }
}

function loadNotifyPreference() {
  try {
    return localStorage.getItem(NOTIFY_STORAGE_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function saveNotifyPreference(value) {
  try {
    localStorage.setItem(NOTIFY_STORAGE_KEY, value ? "true" : "false");
  } catch (error) {
    // ignore storage failures
  }
}

function updateNotifyButton() {
  if (!notifyBtn) {
    return;
  }
  if (!("Notification" in window)) {
    notifyBtn.disabled = true;
    notifyBtn.classList.remove("active");
    notifyBtn.setAttribute("aria-label", "Notifications unavailable");
    notifyBtn.title = "Notifications unavailable";
    return;
  }

  const permission = Notification.permission;
  notifyEnabled = permission === "granted" && loadNotifyPreference();

  if (permission === "denied") {
    notifyBtn.disabled = true;
    notifyBtn.classList.remove("active");
    notifyBtn.setAttribute("aria-label", "Notifications blocked");
    notifyBtn.title = "Notifications blocked";
    return;
  }

  notifyBtn.disabled = false;
  notifyBtn.classList.toggle("active", notifyEnabled);
  notifyBtn.setAttribute("aria-label", notifyEnabled ? "Notifications on" : "Enable notifications");
  notifyBtn.title = notifyEnabled ? "Notifications on" : "Enable notifications";
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

function saveThemePreference(value) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch (error) {
    // ignore storage failures
  }
}

function loadCredits() {
  try {
    const stored = localStorage.getItem(CREDITS_STORAGE_KEY);
    const parsed = Number(stored);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
    localStorage.setItem(CREDITS_STORAGE_KEY, String(DEFAULT_CREDITS));
    return DEFAULT_CREDITS;
  } catch (error) {
    return DEFAULT_CREDITS;
  }
}

function updateCreditsButton() {
  if (!creditsBtn) {
    return;
  }
  const value = loadCredits();
  const valueEl = creditsBtn.querySelector(".credits-value");
  if (valueEl) {
    valueEl.textContent = String(value);
  } else {
    creditsBtn.textContent = `Subscription ${value}`;
  }
  creditsBtn.setAttribute("aria-label", `Subscription credits: ${value}`);
  creditsBtn.title = `Subscription credits: ${value}`;
}

function applyTheme(theme) {
  const mappedTheme = theme === "nebula" ? "purple" : theme;
  const nextTheme = mappedTheme === "infinity" ? DEFAULT_THEME : (mappedTheme || DEFAULT_THEME);
  document.documentElement.setAttribute("data-theme", nextTheme);
  saveThemePreference(nextTheme);
  const options = document.querySelectorAll(".theme-option");
  options.forEach((option) => {
    option.classList.toggle("active", option.dataset.theme === nextTheme);
  });
}

function setThemeMenuOpen(isOpen) {
  if (!themeMenu || !themeBtn) {
    return;
  }
  themeMenu.classList.toggle("hidden", !isOpen);
  themeBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  if (!isOpen && themeCreatePanel) {
    themeCreatePanel.classList.add("hidden");
  }
}

function handleThemeButtonClick(event) {
  event.stopPropagation();
  if (!themeMenu) {
    return;
  }
  setThemeMenuOpen(themeMenu.classList.contains("hidden"));
}

function handleThemeOptionClick(event) {
  const target = event.currentTarget;
  if (!target || !target.dataset.theme) {
    return;
  }
  applyTheme(target.dataset.theme);
  setThemeMenuOpen(false);
}

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

function saveCustomThemes(themes) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch (error) {
    // ignore storage failures
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

function renderCustomThemes() {
  if (!themeMenu) {
    return;
  }
  const panel = themeMenu.querySelector(".theme-create-panel");
  if (!panel) {
    return;
  }
  const list = themeMenu.querySelector(".theme-options");
  themeMenu.querySelectorAll(".theme-option.custom-theme").forEach((btn) => btn.remove());
  const themes = loadCustomThemes();
  const fragment = document.createDocumentFragment();
  themes.forEach((theme) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-option custom-theme";
    btn.dataset.theme = theme.id;
    btn.textContent = theme.name || theme.prompt || "Custom";
    btn.addEventListener("click", handleThemeOptionClick);
    fragment.appendChild(btn);
  });
  if (list) {
    list.prepend(fragment);
  } else {
    panel.after(fragment);
  }
}

function addCustomThemeFromPrompt() {
  if (!themeCreateInput) {
    return;
  }
  const prompt = themeCreateInput.value.trim();
  if (!prompt) {
    return;
  }
  const themes = loadCustomThemes();
  const existing = themes.find((theme) => (theme.name || "").toLowerCase() === prompt.toLowerCase());
  if (existing) {
    applyTheme(existing.id);
    return;
  }
  const id = `custom-${hashString(prompt).toString(36)}-${Date.now().toString(36)}`;
  const name = prompt.length > 24 ? `${prompt.slice(0, 24)}…` : prompt;
  const next = [{ id, name, prompt }, ...themes];
  saveCustomThemes(next);
  ensureCustomThemeStyles(next);
  renderCustomThemes();
  applyTheme(id);
  themeCreateInput.value = "";
}

function deleteCustomThemeFromPrompt() {
  const current = document.documentElement.getAttribute("data-theme") || "";
  const prompt = themeCreateInput ? themeCreateInput.value.trim().toLowerCase() : "";
  let themes = loadCustomThemes();
  let removedId = "";
  if (prompt) {
    const index = themes.findIndex((theme) => (theme.name || "").toLowerCase() === prompt);
    if (index >= 0) {
      removedId = themes[index].id;
      themes.splice(index, 1);
    }
  } else if (current.startsWith("custom-")) {
    const index = themes.findIndex((theme) => theme.id === current);
    if (index >= 0) {
      removedId = themes[index].id;
      themes.splice(index, 1);
    }
  }
  if (!removedId) {
    return;
  }
  saveCustomThemes(themes);
  ensureCustomThemeStyles(themes);
  renderCustomThemes();
  if (current === removedId) {
    applyTheme(DEFAULT_THEME);
  }
}

function setAddMenuOpen(isOpen) {
  if (!addMenu || !addBtn) {
    return;
  }
  addMenu.classList.toggle("hidden", !isOpen);
  addBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function handleAddButtonClick(event) {
  event.stopPropagation();
  if (!addMenu) {
    return;
  }
  setAddMenuOpen(addMenu.classList.contains("hidden"));
}

function copyInviteLink(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve) => {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "absolute";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    resolve();
  });
}

function buildInviteLink() {
  try {
    return new URL("index.html", window.location.href).toString();
  } catch (error) {
    return window.location.href;
  }
}

function openInviteEmail(link) {
  const email = window.prompt("Enter an email to invite:", "");
  if (email === null) {
    return false;
  }
  const defaultMessage = `Join me on CAMERA IRIS.\n\n${link}`;
  const message = window.prompt("Write a message for the invite email:", defaultMessage);
  if (message === null) {
    return false;
  }
  const trimmed = message.trim();
  const finalMessage = trimmed.includes(link)
    ? trimmed
    : `${trimmed ? `${trimmed}\n\n` : ""}${link}`;
  const subject = "Join me on CAMERA IRIS";
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalMessage)}`;
  window.location.href = mailto;
  return true;
}

function handleInviteClick(event) {
  event.stopPropagation();
  if (!inviteBtn) {
    return;
  }
  const link = buildInviteLink();
  copyInviteLink(link).then(() => {
    const original = inviteBtn.textContent;
    inviteBtn.textContent = "Copied!";
    setTimeout(() => {
      inviteBtn.textContent = original;
    }, 1200);
  });
  openInviteEmail(link);
  setAddMenuOpen(false);
}

function handlePostClick(event) {
  event.stopPropagation();
  const input = document.getElementById("profileAddInput");
  if (input) {
    input.click();
    setAddMenuOpen(false);
    return;
  }
  try {
    localStorage.setItem("cameraIrisOpenPostUpload", "true");
  } catch (error) {
    // ignore storage failures
  }
  window.location.href = "profile.html";
}

function loadProfile() {
  let name = "";
  let email = "";
  let plan = DEFAULT_PLAN;
  let password = "";
  let planSet = false;

  try {
    name = localStorage.getItem(PROFILE_NAME_KEY) || "";
  } catch (error) {
    name = "";
  }

  try {
    email = localStorage.getItem(PROFILE_EMAIL_KEY) || "";
  } catch (error) {
    email = "";
  }

  try {
    const storedPlan = localStorage.getItem(PROFILE_PLAN_KEY);
    if (storedPlan) {
      plan = storedPlan;
      planSet = true;
    }
  } catch (error) {
    plan = DEFAULT_PLAN;
  }

  try {
    password = localStorage.getItem(PROFILE_PASSWORD_KEY) || "";
  } catch (error) {
    password = "";
  }

  try {
    const raw = localStorage.getItem(PROFILE_ACCOUNT_KEY);
    const account = raw ? JSON.parse(raw) : null;
    if (account) {
      if (!name && account.name) {
        name = account.name;
      }
      if (!email && account.email) {
        email = account.email;
      }
      if (!password && account.password) {
        password = account.password;
      }
      if (!planSet && account.plan) {
        plan = account.plan;
      }
    }
  } catch (error) {
    // ignore storage failures
  }

  return { name, email, plan, password };
}

function saveProfile() {
  const nameValue = profileNameInput ? profileNameInput.value.trim() : "";
  const emailValue = profileEmail ? profileEmail.value.trim() : "";
  const passwordValue = profilePassword ? profilePassword.value : "";
  const planValue = profilePlan ? profilePlan.value || DEFAULT_PLAN : DEFAULT_PLAN;

  if (profileNameInput) {
    try {
      if (nameValue) {
        localStorage.setItem(PROFILE_NAME_KEY, nameValue);
      } else {
        localStorage.removeItem(PROFILE_NAME_KEY);
      }
    } catch (error) {
      // ignore storage failures
    }
  }

  if (profileEmail) {
    try {
      if (emailValue) {
        localStorage.setItem(PROFILE_EMAIL_KEY, emailValue);
      } else {
        localStorage.removeItem(PROFILE_EMAIL_KEY);
      }
    } catch (error) {
      // ignore storage failures
    }
  }

  if (profilePassword) {
    try {
      if (passwordValue) {
        localStorage.setItem(PROFILE_PASSWORD_KEY, passwordValue);
      } else {
        localStorage.removeItem(PROFILE_PASSWORD_KEY);
      }
    } catch (error) {
      // ignore storage failures
    }
  }

  if (profilePlan) {
    try {
      localStorage.setItem(PROFILE_PLAN_KEY, planValue);
    } catch (error) {
      // ignore storage failures
    }
  }

  try {
    if (nameValue || emailValue || passwordValue) {
      const raw = localStorage.getItem(PROFILE_ACCOUNT_KEY);
      const existing = raw ? JSON.parse(raw) : null;
      const createdAt = existing?.createdAt || new Date().toISOString();
      const account = {
        name: nameValue,
        email: emailValue,
        password: passwordValue,
        plan: planValue,
        createdAt,
        lastLoginAt: new Date().toISOString(),
      };
      localStorage.setItem(PROFILE_ACCOUNT_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(PROFILE_ACCOUNT_KEY);
    }
  } catch (error) {
    // ignore storage failures
  }

  updateProfileButton();
}

function updateProfileButton() {
  if (!profileBtn) {
    return;
  }
  const { name, email, plan } = loadProfile();
  const base = name || email || "Account";
  const label = `${base} (${plan})`;
  profileBtn.setAttribute("aria-label", label);
  profileBtn.title = label;
}

function applyProfile() {
  const { name, email, plan, password } = loadProfile();
  if (profileNameInput) {
    profileNameInput.value = name;
  }
  if (profileEmail) {
    profileEmail.value = email;
  }
  if (profilePassword) {
    profilePassword.value = password;
  }
  if (profilePlan) {
    profilePlan.value = plan;
  }
  updateProfileButton();
}

function setProfileMenuOpen(isOpen) {
  if (!profileMenu || !profileBtn) {
    return;
  }
  profileMenu.classList.toggle("hidden", !isOpen);
  profileBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function handleProfileButtonClick(event) {
  event.stopPropagation();
  if (!profileMenu) {
    return;
  }
  setProfileMenuOpen(profileMenu.classList.contains("hidden"));
}

async function handleNotifyClick() {
  if (!("Notification" in window) || !notifyBtn) {
    return;
  }

  if (Notification.permission === "granted") {
    notifyEnabled = !notifyEnabled;
    saveNotifyPreference(notifyEnabled);
    updateNotifyButton();
    if (notifyEnabled) {
      new Notification("Notifications enabled", { body: "You will be notified when a generation completes." });
    }
    return;
  }

  if (Notification.permission === "denied") {
    updateNotifyButton();
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    notifyEnabled = true;
    saveNotifyPreference(true);
    updateNotifyButton();
    new Notification("Notifications enabled", { body: "You will be notified when a generation completes." });
  } else {
    updateNotifyButton();
  }
}

function countAssets(folderId) {
  if (folderId === ALL_MEDIA_ID) {
    return library.assets.filter((a) => a.folderId !== TRASH_FOLDER_ID).length;
  }
  return library.assets.filter((asset) => asset.folderId === folderId).length;
}

function formatDate(iso) {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderFolders() {
  folderList.innerHTML = "";

  const allRow = document.createElement("div");
  allRow.className = "media-folder-item";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `media-folder-btn ${activeFolderId === ALL_MEDIA_ID ? "active" : ""}`;
  allButton.dataset.folderId = ALL_MEDIA_ID;
  allButton.innerHTML = `<span>All Media</span><small>${countAssets(ALL_MEDIA_ID)}</small>`;
  allRow.appendChild(allButton);
  folderList.appendChild(allRow);

  library.folders.forEach((folder) => {
    if (folder.id === TRASH_FOLDER_ID) return; // rendered separately at bottom
    const row = document.createElement("div");
    row.className = "media-folder-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `media-folder-btn ${activeFolderId === folder.id ? "active" : ""}`;
    button.dataset.folderId = folder.id;
    button.innerHTML = `<span>${folder.name}</span><small>${countAssets(folder.id)}</small>`;

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.className = "media-folder-rename";
    renameButton.dataset.folderId = folder.id;
    renameButton.textContent = "Rename";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "media-folder-delete";
    deleteButton.dataset.folderId = folder.id;
    deleteButton.title = "Delete folder";
    deleteButton.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    row.appendChild(button);
    row.appendChild(renameButton);
    row.appendChild(deleteButton);
    folderList.appendChild(row);
  });

  // Trash folder at the bottom
  const trashCount = countAssets(TRASH_FOLDER_ID);
  const trashRow = document.createElement("div");
  trashRow.className = "media-folder-item media-folder-trash";

  const trashButton = document.createElement("button");
  trashButton.type = "button";
  trashButton.className = `media-folder-btn media-folder-btn-trash ${activeFolderId === TRASH_FOLDER_ID ? "active" : ""}`;
  trashButton.dataset.folderId = TRASH_FOLDER_ID;
  trashButton.innerHTML = `<span><svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-right:6px" aria-hidden="true"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Trash</span><small>${trashCount}</small>`;

  trashRow.appendChild(trashButton);

  if (trashCount > 0) {
    const emptyTrashBtn = document.createElement("button");
    emptyTrashBtn.type = "button";
    emptyTrashBtn.className = "media-folder-delete media-empty-trash";
    emptyTrashBtn.title = "Empty trash";
    emptyTrashBtn.textContent = "Empty";
    emptyTrashBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!window.confirm(`Permanently delete all ${trashCount} item(s) in Trash?`)) return;
      const trashAssets = library.assets.filter((a) => a.folderId === TRASH_FOLDER_ID);
      const trashIds = new Set(trashAssets.map((a) => a.id));
      trashAssets.forEach((a) => { markAsDeleted(a.id); if (a.blobRef) deleteBlobData(a.blobRef); });
      library.assets = library.assets.filter((a) => a.folderId !== TRASH_FOLDER_ID);
      saveLibrary(library);
      // Clean up profile post IDs for all trashed items
      try {
        const postsKey = "cameraIrisProfilePosts";
        const raw = localStorage.getItem(postsKey);
        if (raw) {
          const ids = JSON.parse(raw).filter((id) => !trashIds.has(id));
          localStorage.setItem(postsKey, JSON.stringify(ids));
        }
      } catch (ex) {}
      try { localStorage.setItem("cameraIrisFeedRefresh", String(Date.now())); } catch (ex) {}
      renderFolders();
      renderMedia();
    });
    trashRow.appendChild(emptyTrashBtn);
  }

  folderList.appendChild(trashRow);
}

function createFolderOption(folderId, selectedId) {
  const option = document.createElement("option");
  const folder = library.folders.find((item) => item.id === folderId);
  option.value = folderId;
  option.textContent = folder ? folder.name : "No folder";
  if (folderId === selectedId) {
    option.selected = true;
  }
  return option;
}

function createFolderSelect(asset) {
  const wrapper = document.createElement("div");
  wrapper.className = "media-folder-select";

  const label = document.createElement("label");
  label.textContent = "Folder";
  label.className = "media-folder-label";

  const select = document.createElement("select");
  select.appendChild(createFolderOption(NO_FOLDER_ID, asset.folderId));

  library.folders
    .filter((folder) => folder.id !== TRASH_FOLDER_ID)
    .forEach((folder) => {
      select.appendChild(createFolderOption(folder.id, asset.folderId));
    });

  select.addEventListener("change", () => {
    asset.folderId = select.value;
    saveLibrary(library);
    renderFolders();
    renderMedia();
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  return wrapper;
}

function renderMedia() {
  mediaGrid.innerHTML = "";

  // Scrub permanently deleted items from library on every render
  const deletedIds = loadDeletedIds();
  const before = library.assets.length;
  library.assets = library.assets.filter((a) => !deletedIds.has(a.id) || a.folderId === TRASH_FOLDER_ID);
  if (library.assets.length !== before) {
    saveLibrary(library);
  }

  const assets = library.assets
    .filter((asset) => {
      if (activeFolderId === ALL_MEDIA_ID) return asset.folderId !== TRASH_FOLDER_ID;
      return asset.folderId === activeFolderId;
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  if (assets.length === 0) {
    mediaEmpty.classList.remove("hidden");
  } else {
    mediaEmpty.classList.add("hidden");
  }

  mediaHeading.textContent = activeFolderId === ALL_MEDIA_ID
    ? "All Media"
    : activeFolderId === TRASH_FOLDER_ID
      ? "Trash"
      : (library.folders.find((folder) => folder.id === activeFolderId)?.name || "Folder");
  mediaSubheading.textContent = `${assets.length} asset${assets.length === 1 ? "" : "s"}`;

  assets.forEach((asset) => {
    const card = document.createElement("article");
    card.className = "media-card";

    const header = document.createElement("header");
    header.className = "media-card-head";

    const badge = document.createElement("span");
    badge.className = "media-badge";
    badge.textContent = asset.kind || "asset";

    header.appendChild(badge);

    const thumb = document.createElement("div");
    thumb.className = "media-thumb";

    if (asset.kind === "text") {
      const textCard = document.createElement("div");
      textCard.className = "media-text-card";
      textCard.textContent = asset.caption || "Text post";
      thumb.appendChild(textCard);
    } else if (asset.kind === "video" && asset.src) {
      const video = document.createElement("video");
      video.controls = true;
      video.preload = "metadata";
      video.src = asset.src;
      thumb.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = asset.poster || asset.src || "";
      img.alt = asset.title || "Generated media";
      img.addEventListener("click", () => {
        openPostPreview(asset);
      });
      thumb.appendChild(img);

      // Load large images from IndexedDB
      if (!asset.src && asset.blobRef) {
        loadBlobData(asset.blobRef).then((data) => {
          if (data) {
            img.src = data;
            asset._loadedSrc = data;
          }
        });
      }
    }

    const meta = document.createElement("div");
    meta.className = "media-meta";

    const time = document.createElement("span");
    time.textContent = asset.createdAt ? `Saved ${formatDate(asset.createdAt)}` : "";

    meta.appendChild(time);
    meta.appendChild(createFolderSelect(asset));

    const actions = document.createElement("div");
    actions.className = "media-actions";

    if (asset.link) {
      const link = document.createElement("a");
      link.className = "media-open";
      link.href = asset.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open";
      actions.appendChild(link);
    }

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.className = "media-rename";
    renameButton.textContent = "Rename";
    renameButton.addEventListener("click", () => {
      const currentName = asset.title || "Generated Asset";
      const next = window.prompt("Rename file", currentName);
      if (next === null) {
        return;
      }
      const name = next.trim();
      if (!name) {
        return;
      }
      asset.title = name;
      saveLibrary(library);
      renderMedia();
    });
    actions.appendChild(renameButton);

    const isInTrash = asset.folderId === TRASH_FOLDER_ID;
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "media-delete";
    deleteButton.textContent = isInTrash ? "Delete Forever" : "Delete";
    deleteButton.addEventListener("click", () => {
      if (isInTrash) {
        // Permanently delete from Trash
        const label = asset.title ? `Permanently delete "${asset.title}"?` : "Permanently delete this asset?";
        if (!window.confirm(label)) return;
        if (asset.blobRef) deleteBlobData(asset.blobRef);
        markAsDeleted(asset.id);
        library.assets = library.assets.filter((item) => item.id !== asset.id);
        saveLibrary(library);
        // Clean up profile post IDs reference
        try {
          const postsKey = "cameraIrisProfilePosts";
          const raw = localStorage.getItem(postsKey);
          if (raw) {
            const ids = JSON.parse(raw).filter((id) => id !== asset.id);
            localStorage.setItem(postsKey, JSON.stringify(ids));
          }
        } catch (e) {}
      } else {
        // Move to Trash — record in deleted history so it never shows in feed again
        markAsDeleted(asset.id);
        asset.folderId = TRASH_FOLDER_ID;
        saveLibrary(library);
        // Clean up profile post IDs so it disappears from feed/history
        try {
          const postsKey = "cameraIrisProfilePosts";
          const raw = localStorage.getItem(postsKey);
          if (raw) {
            const ids = JSON.parse(raw).filter((id) => id !== asset.id);
            localStorage.setItem(postsKey, JSON.stringify(ids));
          }
        } catch (e) {}
      }
      // Signal other tabs (generator page) to refresh their feed
      try {
        localStorage.setItem("cameraIrisFeedRefresh", String(Date.now()));
        localStorage.setItem("cameraIrisMediaLibrary", JSON.stringify(library));
      } catch (e) {}
      renderFolders();
      renderMedia();
    });
    actions.appendChild(deleteButton);

    // Show a Restore button when viewing Trash
    if (isInTrash) {
      const restoreButton = document.createElement("button");
      restoreButton.type = "button";
      restoreButton.className = "media-rename";
      restoreButton.textContent = "Restore";
      restoreButton.addEventListener("click", () => {
        asset.folderId = RENDERS_FOLDER_ID;
        saveLibrary(library);
        try {
          localStorage.setItem("cameraIrisFeedRefresh", String(Date.now()));
          localStorage.setItem("cameraIrisMediaLibrary", JSON.stringify(library));
        } catch (e) {}
        renderFolders();
        renderMedia();
      });
      actions.appendChild(restoreButton);
    }

    meta.appendChild(actions);

    card.appendChild(header);
    card.appendChild(thumb);
    card.appendChild(meta);

    mediaGrid.appendChild(card);
  });
}

function handleFolderClick(event) {
  const deleteButton = event.target.closest(".media-folder-delete");
  if (deleteButton) {
    const folderId = deleteButton.dataset.folderId;
    const folder = library.folders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }
    const assetCount = library.assets.filter((a) => a.folderId === folderId).length;
    const msg = assetCount > 0
      ? `Delete "${folder.name}"? Its ${assetCount} asset(s) will be moved to "No folder".`
      : `Delete "${folder.name}"?`;
    if (!window.confirm(msg)) {
      return;
    }
    library.folders = library.folders.filter((item) => item.id !== folderId);
    library.assets.forEach((asset) => {
      if (asset.folderId === folderId) {
        asset.folderId = NO_FOLDER_ID;
      }
    });
    saveLibrary(library);
    if (activeFolderId === folderId) {
      activeFolderId = ALL_MEDIA_ID;
    }
    renderFolders();
    renderMedia();
    return;
  }

  const renameButton = event.target.closest(".media-folder-rename");
  if (renameButton) {
    const folderId = renameButton.dataset.folderId;
    const folder = library.folders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }
    const next = window.prompt("Rename folder", folder.name);
    if (next === null) {
      return;
    }
    const name = next.trim();
    if (!name) {
      return;
    }
    const exists = library.folders.some((item) => item.id !== folder.id && item.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      window.alert("A folder with that name already exists.");
      return;
    }
    folder.name = name;
    saveLibrary(library);
    renderFolders();
    renderMedia();
    return;
  }

  const button = event.target.closest(".media-folder-btn");
  if (!button) return;
  activeFolderId = button.dataset.folderId || ALL_MEDIA_ID;
  renderFolders();
  renderMedia();
}

function handleCreateFolder() {
  const name = newFolderName.value.trim();
  if (!name) {
    newFolderName.focus();
    return;
  }

  const exists = library.folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    newFolderName.value = "";
    newFolderName.focus();
    return;
  }

  library.folders.push({
    id: createId("folder"),
    name,
    createdAt: new Date().toISOString(),
  });
  saveLibrary(library);
  newFolderName.value = "";
  renderFolders();
}

createFolderBtn.addEventListener("click", handleCreateFolder);
newFolderName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleCreateFolder();
  }
});
folderList.addEventListener("click", handleFolderClick);

if (notifyBtn) {
  notifyBtn.addEventListener("click", handleNotifyClick);
}
if (profileBtn) {
  profileBtn.addEventListener("click", handleProfileButtonClick);
}
if (profileMenu) {
  profileMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}
if (profileSaveBtn) {
  profileSaveBtn.addEventListener("click", () => {
    saveProfile();
    setProfileMenuOpen(false);
  });
}
if (themeBtn) {
  themeBtn.addEventListener("click", handleThemeButtonClick);
}
if (themeMenu) {
  themeMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}
if (themeCreateBtn) {
  themeCreateBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!themeCreatePanel) {
      return;
    }
    themeCreatePanel.classList.toggle("hidden");
    if (!themeCreatePanel.classList.contains("hidden") && themeCreateInput) {
      themeCreateInput.focus();
    }
  });
}
if (themeCreateInput) {
  themeCreateInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomThemeFromPrompt();
    }
  });
}
if (themeCreateAdd) {
  themeCreateAdd.addEventListener("click", (event) => {
    event.stopPropagation();
    addCustomThemeFromPrompt();
  });
}
if (themeCreateDelete) {
  themeCreateDelete.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteCustomThemeFromPrompt();
  });
}
if (addBtn) {
  addBtn.addEventListener("click", handleAddButtonClick);
}
if (addMenu) {
  addMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}
if (inviteBtn) {
  inviteBtn.addEventListener("click", handleInviteClick);
}
if (postBtn) {
  postBtn.addEventListener("click", handlePostClick);
}
if (postPreview) {
  postPreview.addEventListener("click", (event) => {
    if (event.target === postPreview) {
      closePostPreview();
    }
  });
}
if (postPreviewClose) {
  postPreviewClose.addEventListener("click", closePostPreview);
}
if (postZoomIn) {
  postZoomIn.addEventListener("click", () => {
    setPreviewScale(previewScale + 0.2);
  });
}
if (postZoomOut) {
  postZoomOut.addEventListener("click", () => {
    setPreviewScale(previewScale - 0.2);
  });
}
if (postPreviewImg) {
  postPreviewImg.addEventListener("pointerdown", (event) => startPreviewDrag(event, postPreviewImg));
  postPreviewImg.addEventListener("pointermove", movePreviewDrag);
  postPreviewImg.addEventListener("pointerup", endPreviewDrag);
  postPreviewImg.addEventListener("pointercancel", endPreviewDrag);
}
if (postPreviewVideo) {
  postPreviewVideo.addEventListener("pointerdown", (event) => startPreviewDrag(event, postPreviewVideo));
  postPreviewVideo.addEventListener("pointermove", movePreviewDrag);
  postPreviewVideo.addEventListener("pointerup", endPreviewDrag);
  postPreviewVideo.addEventListener("pointercancel", endPreviewDrag);
}
themeOptions.forEach((option) => {
  option.addEventListener("click", handleThemeOptionClick);
});
document.addEventListener("click", () => {
  setThemeMenuOpen(false);
  setAddMenuOpen(false);
  setProfileMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePostPreview();
    setThemeMenuOpen(false);
    setAddMenuOpen(false);
    setProfileMenuOpen(false);
  }
});

saveLibrary(library);
updateNotifyButton();
updateCreditsButton();
ensureCustomThemeStyles(loadCustomThemes());
renderCustomThemes();
applyTheme(loadThemePreference());
applyProfile();
renderFolders();
renderMedia();

const root = document.documentElement;
let holeTargetX = 0.5;
let holeTargetY = 0.45;
let holeX = 0.5;
let holeY = 0.45;

function setHolePosition(x, y) {
  root.style.setProperty("--hole-x", `${x * 100}%`);
  root.style.setProperty("--hole-y", `${y * 100}%`);
  root.style.setProperty("--nebula-x", `${x * 100}%`);
  root.style.setProperty("--nebula-y", `${y * 100}%`);
}

function onPointerMove(event) {
  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  holeTargetX = Math.min(Math.max(event.clientX / width, 0.1), 0.9);
  holeTargetY = Math.min(Math.max(event.clientY / height, 0.1), 0.9);
}

function animateBlackhole() {
  holeX += (holeTargetX - holeX) * 0.08;
  holeY += (holeTargetY - holeY) * 0.08;
  setHolePosition(holeX, holeY);
  window.requestAnimationFrame(animateBlackhole);
}

setHolePosition(holeX, holeY);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerdown", onPointerMove);
animateBlackhole();
