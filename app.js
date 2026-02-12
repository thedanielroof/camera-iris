const form = document.getElementById("generation-form");
const modeInput = document.getElementById("mode");
const modelInput = document.getElementById("model");
const a2eSection = document.getElementById("a2eSection");
const generateBtn = document.getElementById("generateBtn");
const generateBtnEye = generateBtn?.querySelector(".btn-eye")?.outerHTML || "";
const statusText = document.getElementById("statusText");
const resultGrid = document.getElementById("resultGrid");
const resultCardTemplate = document.getElementById("resultCardTemplate");
const jobCount = document.getElementById("jobCount");
const assetCount = document.getElementById("assetCount");
const widthInput = document.getElementById("width");
const heightInput = document.getElementById("height");
const aspectRatioInput = document.getElementById("aspectRatio");
const promptInput = document.getElementById("prompt");
const sizeButtons = document.querySelectorAll(".size-btn");
const countButtons = document.querySelectorAll(".count-btn");
const outputCountInput = document.getElementById("outputCount");
const modelButtons = document.querySelectorAll(".model-btn");
const modeButtons = document.querySelectorAll(".mode-btn");
const saveFolderSelect = document.getElementById("saveFolder");
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
const feedAddPostBtn = document.getElementById("feedAddPostBtn");
const feedPostText = document.getElementById("feedPostText");
const feedPostFile = document.getElementById("feedPostFile");
const feedPostSubmit = document.getElementById("feedPostSubmit");
const NOTIFY_STORAGE_KEY = "cameraIrisNotifyEnabled";
const SAVE_FOLDER_STORAGE_KEY = "cameraIrisSaveFolderId";
const CREDITS_STORAGE_KEY = "cameraIrisCredits";
const PROFILE_EMAIL_KEY = "cameraIrisProfileEmail";
const PROFILE_PLAN_KEY = "cameraIrisProfilePlan";
const PROFILE_NAME_KEY = "cameraIrisProfileName";
const PROFILE_PASSWORD_KEY = "cameraIrisProfilePassword";
const PROFILE_ACCOUNT_KEY = "cameraIrisProfileAccount";
const PROFILE_AVATAR_KEY = "cameraIrisProfileAvatar";
const PROFILE_AVATAR_UPLOAD_KEY = "cameraIrisProfileAvatarUpload";
const PROFILE_POSTS_KEY = "cameraIrisProfilePosts";
const FRIENDS_KEY = "cameraIrisFriends";
const FEED_REFRESH_KEY = "cameraIrisFeedRefresh";
const DELETED_IDS_KEY = "cameraIrisDeletedIds";
const THEME_STORAGE_KEY = "cameraIrisTheme";
const CUSTOM_THEMES_KEY = "cameraIrisCustomThemes";
const DEFAULT_THEME = "matrix";
const DEFAULT_CREDITS = 120;
const DEFAULT_PLAN = "unlimited";
let notifyEnabled = false;

const runtime = {
  jobs: 0,
  assets: 0,
};

const DEFAULT_API_BASE = window.location.origin;
const DEFAULT_MOCK_MODE = false;
const DEFAULT_QUALITY = 80;
const DEFAULT_ENDPOINTS = {
  nanoImage: "/api/v1/nano-banana-pro/images",
  a2eImage: "/api/v1/a2e/images",
  a2eVideo: "/api/v1/a2e/videos",
  geminiImage: "/api/v1/gemini/images",
};

function getInputValue(id, fallback = "") {
  const el = document.getElementById(id);
  if (!el) {
    return fallback;
  }
  return typeof el.value === "string" ? el.value.trim() : fallback;
}

function getCheckboxValue(id, fallback = false) {
  const el = document.getElementById(id);
  return el ? Boolean(el.checked) : fallback;
}

const MEDIA_STORAGE_KEY = "cameraIrisMediaLibrary";
const BLOB_DB_NAME = "cameraIrisBlobStore";
const BLOB_STORE_NAME = "blobs";
const NO_FOLDER_ID = "none";
const LEGACY_UNSORTED_ID = "unsorted";
const RENDERS_FOLDER_ID = "renders";
const TRASH_FOLDER_ID = "trash";

function openBlobDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BLOB_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(BLOB_STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveBlobData(id, data) {
  try {
    const db = await openBlobDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE_NAME, "readwrite");
      tx.objectStore(BLOB_STORE_NAME).put(data, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { /* ignore */ }
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
    ],
    assets: [],
  };
}

function ensureRendersFolder(library) {
  if (!library.folders.some((f) => f.id === RENDERS_FOLDER_ID)) {
    library.folders.unshift({ id: RENDERS_FOLDER_ID, name: "Renders" });
    saveMediaLibrary(library);
  }
  return library;
}

function loadMediaLibrary() {
  if (typeof localStorage === "undefined") {
    return createDefaultLibrary();
  }

  try {
    const raw = localStorage.getItem(MEDIA_STORAGE_KEY);
    if (!raw) {
      return createDefaultLibrary();
    }
    const parsed = JSON.parse(raw);
    const folders = Array.isArray(parsed?.folders)
      ? parsed.folders.filter((folder) => folder?.id && folder.id !== LEGACY_UNSORTED_ID)
      : [];
    const assets = Array.isArray(parsed?.assets)
      ? parsed.assets.map((asset) => {
          const next = { ...asset };
          if (!next.folderId || next.folderId === LEGACY_UNSORTED_ID) {
            next.folderId = NO_FOLDER_ID;
          }
          return next;
        })
      : [];

    const library = {
      version: 1,
      folders,
      assets,
    };
    ensureRendersFolder(library);
    return library;
  } catch (error) {
    console.warn("Failed to read media library", error);
    return createDefaultLibrary();
  }
}

function saveMediaLibrary(library) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(library));
  } catch (error) {
    console.warn("Failed to save media library", error);
  }
}

function saveProfilePostIds(ids) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(PROFILE_POSTS_KEY, JSON.stringify(ids));
  } catch (error) {
    // ignore storage failures
  }
}

function loadProfileName() {
  try {
    const stored = localStorage.getItem(PROFILE_NAME_KEY);
    if (stored && stored.trim()) {
      return stored.trim();
    }
    const raw = localStorage.getItem(PROFILE_ACCOUNT_KEY);
    const account = raw ? JSON.parse(raw) : null;
    if (account?.name) {
      return account.name;
    }
    if (account?.email) {
      return account.email.split("@")[0] || account.email;
    }
    return "You";
  } catch (error) {
    return "You";
  }
}

function loadProfileAvatarUpload() {
  try {
    const stored = localStorage.getItem(PROFILE_AVATAR_UPLOAD_KEY) || "";
    if (stored) {
      return stored;
    }
    const raw = localStorage.getItem(PROFILE_ACCOUNT_KEY);
    const account = raw ? JSON.parse(raw) : null;
    return account?.avatar || "";
  } catch (error) {
    return "";
  }
}

function loadProfileAvatarId() {
  try {
    return localStorage.getItem(PROFILE_AVATAR_KEY) || "";
  } catch (error) {
    return "";
  }
}

function pickProfileAvatar(library) {
  const uploaded = loadProfileAvatarUpload();
  if (uploaded) {
    return uploaded;
  }
  const avatarId = loadProfileAvatarId();
  const candidates = (library?.assets || []).filter(
    (asset) => asset && asset.kind !== "video" && (asset.poster || asset.src),
  );
  if (avatarId) {
    const match = candidates.find((asset) => asset.id === avatarId);
    if (match) {
      return match.poster || match.src || "";
    }
  }
  const fallback = candidates[0];
  return fallback ? fallback.poster || fallback.src || "" : "";
}

function getInitials(name) {
  if (!name) {
    return "CI";
  }
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return "CI";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getFriendAvatar(friend) {
  if (!friend) {
    return "";
  }
  return (
    friend.avatar ||
    friend.avatarUrl ||
    friend.avatar_url ||
    friend.photo ||
    friend.photoUrl ||
    friend.profilePhoto ||
    friend.profile_image ||
    friend.image ||
    ""
  );
}

function loadProfilePostIds() {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(PROFILE_POSTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function loadFriends() {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function buildFriendFeedItems(friend) {
  const rawMedia = Array.isArray(friend?.media)
    ? friend.media
    : Array.isArray(friend?.posts)
      ? friend.posts
      : Array.isArray(friend?.assets)
        ? friend.assets
        : [];
  if (!rawMedia.length) {
    return [];
  }
  const owner = friend.name || friend.handle || "Friend";
  const handle = friend.handle ? (friend.handle.startsWith("@") ? friend.handle : `@${friend.handle}`) : "";
  const ownerAvatar = getFriendAvatar(friend);
  return rawMedia.map((item) => ({
    id: item.id || createId("friend"),
    kind: item.kind || item.type || "image",
    title: item.title || item.name || "Friend Post",
    src: item.src || item.url || "",
    poster: item.poster || item.thumbnail || "",
    link: item.link || item.url || "",
    caption: item.caption || item.text || "",
    createdAt: item.createdAt || item.date || "",
    owner,
    ownerHandle: handle,
    ownerAvatar,
  }));
}

function collectFeedItems() {
  const library = loadMediaLibrary();
  const deletedIds = loadDeletedIds();

  // Scrub: permanently remove any trashed or deleted assets from library on every read
  const before = library.assets.length;
  library.assets = (library.assets || []).filter(
    (a) => a && a.folderId !== TRASH_FOLDER_ID && !deletedIds.has(a.id)
  );
  if (library.assets.length !== before) {
    saveMediaLibrary(library);
  }

  // Scrub profile post IDs too
  try {
    const raw = localStorage.getItem(PROFILE_POSTS_KEY);
    if (raw) {
      const ids = JSON.parse(raw);
      const clean = ids.filter((id) => !deletedIds.has(id));
      if (clean.length !== ids.length) {
        localStorage.setItem(PROFILE_POSTS_KEY, JSON.stringify(clean));
      }
    }
  } catch (e) {}

  const profileName = loadProfileName();
  const profileAvatar = pickProfileAvatar(library);
  const postSources = new Set(["profile-upload", "profile-text", "feed-post", "generated"]);
  const profileAssets = library.assets
    .filter((asset) => postSources.has(asset?.meta?.source) || asset.kind === "text")
    .map((asset) => ({
      ...asset,
      owner: profileName,
      ownerHandle: "",
      ownerAvatar: profileAvatar,
    }));
  return profileAssets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function renderResultCard(item, { prepend = true } = {}) {
  const card = resultCardTemplate.content.firstElementChild.cloneNode(true);
  const ownerRow = card.querySelector(".result-owner-row");
  const ownerName = card.querySelector(".result-owner-name");
  const ownerAvatar = card.querySelector(".result-owner-img");
  const ownerInitials = card.querySelector(".result-owner-initials");
  const mediaWrap = card.querySelector(".result-media-wrap");
  const caption = card.querySelector(".result-caption");

  if (ownerName) {
    const ownerLabel = item.ownerHandle ? `${item.owner} ${item.ownerHandle}` : (item.owner || "");
    ownerName.textContent = ownerLabel;
    if (ownerRow) {
      ownerRow.classList.toggle("hidden", !ownerLabel);
    }
    if (ownerInitials) {
      ownerInitials.textContent = getInitials(ownerLabel);
    }
  }
  if (ownerAvatar) {
    if (item.ownerAvatar) {
      ownerAvatar.src = item.ownerAvatar;
      ownerAvatar.classList.remove("hidden");
      if (ownerInitials) {
        ownerInitials.classList.add("hidden");
      }
    } else {
      ownerAvatar.classList.add("hidden");
      if (ownerInitials) {
        ownerInitials.classList.remove("hidden");
      }
    }
  }

  const captionText = item.caption || "";
  const hasMedia = item.kind === "video"
    ? Boolean(item.src || item.poster || item.blobRef)
    : Boolean(item.src || item.poster || item.blobRef);
  const isTextOnly = item.kind === "text" || (!hasMedia && captionText);

  if (isTextOnly) {
    const textBlock = document.createElement("div");
    textBlock.className = "result-text";
    textBlock.textContent = captionText;
    mediaWrap.appendChild(textBlock);
  } else if (item.kind === "video") {
    if (item.src) {
      const video = document.createElement("video");
      video.controls = true;
      video.preload = "metadata";
      video.src = item.src;
      mediaWrap.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = item.poster || buildMockSvg({
        prompt: "Video Preview",
        model: "a2e-ai",
        mode: "video",
        output: { width: 1024, height: 1024 },
      }, 1);
      img.alt = "Video preview";
      mediaWrap.appendChild(img);
    }
  } else {
    const img = document.createElement("img");
    const fallback = buildMockSvg({
      prompt: "Image Preview",
      model: "nano-banana-pro",
      mode: "image",
      output: { width: 1024, height: 1024 },
    }, 1);
    img.alt = item.title || "Generated image";

    // Apply developing reveal animation for freshly generated images
    if (item._reveal) {
      img.classList.add("developing-reveal");
    }

    // Download button helper
    function addDownloadBtn(wrap, getSrc) {
      const dl = document.createElement("button");
      dl.type = "button";
      dl.className = "result-download-btn";
      dl.title = "Download";
      dl.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      dl.addEventListener("click", (e) => {
        e.stopPropagation();
        const src = getSrc();
        if (!src) return;
        const a = document.createElement("a");
        a.href = src;
        a.download = (item.title || "image") + ".png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
      wrap.appendChild(dl);
    }

    // Load large images from IndexedDB when blobRef is set
    if (!item.src && item.blobRef) {
      img.src = fallback;
      mediaWrap.classList.add("developing");
      mediaWrap.innerHTML = `<div class="developing-placeholder"><div class="developing-spinner"></div><span>Loading...</span></div>`;
      loadBlobData(item.blobRef).then((data) => {
        mediaWrap.classList.remove("developing");
        mediaWrap.innerHTML = "";
        if (data) {
          img.src = data;
          img.classList.add("developing-reveal");
        } else {
          img.src = fallback;
        }
        img.addEventListener("click", () => openFullscreen(img.src));
        mediaWrap.appendChild(img);
        addDownloadBtn(mediaWrap, () => img.src);
      });
    } else {
      img.src = item.src || item.poster || fallback;
      img.addEventListener("click", () => openFullscreen(img.src));
      mediaWrap.appendChild(img);
      addDownloadBtn(mediaWrap, () => img.src);
    }
  }

  caption.textContent = captionText;
  caption.classList.toggle("hidden", isTextOnly || !captionText);

  if (prepend) {
    resultGrid.prepend(card);
  } else {
    resultGrid.appendChild(card);
  }
}

function renderFeed({ quiet = false, revealAge = 0 } = {}) {
  if (!resultGrid) {
    return;
  }
  const items = collectFeedItems();
  resultGrid.innerHTML = "";
  if (items.length === 0) {
    if (!quiet) {
      setStatus("", "default");
    }
    return;
  }
  const now = Date.now();
  items.forEach((item) => {
    // Apply reveal animation to items created within revealAge ms
    if (revealAge > 0 && item.createdAt) {
      const age = now - new Date(item.createdAt).getTime();
      if (age < revealAge) {
        item._reveal = true;
      }
    }
    renderResultCard(item, { prepend: false });
  });
  if (!quiet) {
    setStatus("", "default");
  }
}

function loadSaveFolderPreference() {
  if (!saveFolderSelect) {
    return RENDERS_FOLDER_ID;
  }
  try {
    const stored = localStorage.getItem(SAVE_FOLDER_STORAGE_KEY);
    if (!stored || stored === LEGACY_UNSORTED_ID) {
      return RENDERS_FOLDER_ID;
    }
    return stored;
  } catch (error) {
    return RENDERS_FOLDER_ID;
  }
}

function saveSaveFolderPreference(value) {
  if (!saveFolderSelect) {
    return;
  }
  try {
    localStorage.setItem(SAVE_FOLDER_STORAGE_KEY, value);
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

function populateSaveFolderOptions() {
  if (!saveFolderSelect) {
    return;
  }

  const library = loadMediaLibrary();
  const preferred = loadSaveFolderPreference();
  const available = new Set(library.folders.map((folder) => folder.id));
  const selected = available.has(preferred) ? preferred : RENDERS_FOLDER_ID;

  saveFolderSelect.innerHTML = "";
  const noneOption = document.createElement("option");
  noneOption.value = NO_FOLDER_ID;
  noneOption.textContent = "No folder";
  if (selected === NO_FOLDER_ID) {
    noneOption.selected = true;
  }
  saveFolderSelect.appendChild(noneOption);

  library.folders.filter((folder) => folder.id !== TRASH_FOLDER_ID).forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = folder.name;
    if (folder.id === selected) {
      option.selected = true;
    }
    saveFolderSelect.appendChild(option);
  });
}

function getSelectedFolderId() {
  if (!saveFolderSelect) {
    return NO_FOLDER_ID;
  }
  return saveFolderSelect.value || NO_FOLDER_ID;
}

function persistGeneratedAssets(outputs, settings) {
  const library = loadMediaLibrary();
  const preferredFolderId = settings?.storage?.folderId || RENDERS_FOLDER_ID;
  const folderId = library.folders.some((folder) => folder.id === preferredFolderId)
    ? preferredFolderId
    : RENDERS_FOLDER_ID;
  const createdAt = new Date().toISOString();
  const DATA_URL_THRESHOLD = 50000;

  const assetsToStore = outputs.map((item) => {
    const assetId = createId("asset");
    const srcData = item.src || "";
    const isLarge = srcData.length > DATA_URL_THRESHOLD;

    // Store large data URLs in IndexedDB instead of localStorage
    if (isLarge) {
      saveBlobData(assetId, srcData);
    }

    const linkData = item.link || "";
    const isLargeLink = linkData.length > DATA_URL_THRESHOLD;

    return {
      id: assetId,
      kind: item.kind || "image",
      title: item.title || "Generated Asset",
      src: isLarge ? "" : srcData,
      blobRef: isLarge ? assetId : "",
      poster:
        item.poster ||
        (item.kind === "video" && !item.src
          ? buildMockSvg(
              {
                prompt: settings.prompt || "Video Preview",
                model: settings.model,
                mode: "video",
                output: { width: settings.output.width, height: settings.output.height },
              },
              1,
            )
          : ""),
      link: isLargeLink ? "" : linkData,
      caption: item.caption || settings.prompt || "",
      createdAt,
      folderId,
      meta: {
        source: "generated",
        model: settings.model,
        mode: settings.mode,
        prompt: settings.prompt,
        width: settings.output.width,
        height: settings.output.height,
      },
    };
  });

  library.assets = assetsToStore.concat(library.assets);
  saveMediaLibrary(library);
}

function addFeedPost({ text = "", file = null } = {}) {
  const captionText = text.trim();
  if (!captionText && !file) {
    setStatus("Write a post or attach media before posting.", "error");
    return;
  }

  if (file && (!file.type || (!file.type.startsWith("image/") && !file.type.startsWith("video/")))) {
    setStatus("Only image or video uploads are supported for posts.", "error");
    return;
  }

  const library = loadMediaLibrary();
  const safeLibrary = {
    version: library.version || 1,
    folders: Array.isArray(library.folders) ? library.folders : [],
    assets: Array.isArray(library.assets) ? library.assets : [],
  };

  const createdAt = new Date().toISOString();

  const finalizePost = (asset) => {
    safeLibrary.assets = [asset, ...safeLibrary.assets];
    saveMediaLibrary(safeLibrary);

    const postedIds = loadProfilePostIds();
    saveProfilePostIds([asset.id, ...postedIds]);

    try {
      localStorage.setItem(FEED_REFRESH_KEY, String(Date.now()));
    } catch (error) {
      // ignore storage failures
    }

    renderFeed({ quiet: true });
    updateCounters();
    if (feedPostText) {
      feedPostText.value = "";
    }
    if (feedPostFile) {
      feedPostFile.value = "";
    }
    if (window.addInAppNotification) {
      const owner = loadProfileName() || "Someone";
      window.addInAppNotification(`${owner} shared a post.`, "post");
    }
    setStatus("Post added to your timeline.", "success");
  };

  if (!file) {
    finalizePost({
      id: createId("text"),
      kind: "text",
      title: "Text Post",
      src: "",
      poster: "",
      caption: captionText,
      createdAt,
      folderId: NO_FOLDER_ID,
      meta: { source: "feed-post" },
    });
    return;
  }

  const isVideo = file.type.startsWith("video/");
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = typeof reader.result === "string" ? reader.result : "";
    const uploadId = createId("upload");
    const isLarge = dataUrl.length > 50000;
    if (isLarge) {
      saveBlobData(uploadId, dataUrl);
    }
    finalizePost({
      id: uploadId,
      kind: isVideo ? "video" : "image",
      title: file.name || "Uploaded Media",
      src: isLarge ? "" : dataUrl,
      blobRef: isLarge ? uploadId : "",
      poster: "",
      caption: captionText,
      createdAt,
      folderId: NO_FOLDER_ID,
      meta: { source: "feed-post" },
    });
  };
  reader.readAsDataURL(file);
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function setStatus(message, tone = "default") {
  statusText.textContent = message;

  if (tone === "error") {
    statusText.style.color = "var(--danger)";
    return;
  }

  if (tone === "success") {
    statusText.style.color = "var(--success)";
    return;
  }

  statusText.style.color = "var(--text-dim)";
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
    setStatus("Notifications are not supported in this browser.", "error");
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
    setStatus("Notifications are blocked by your browser settings.", "error");
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
    setStatus("Notifications permission was not granted.", "error");
    updateNotifyButton();
  }
}

function notifyCompletion(outputsLength, mode) {
  if (!notifyEnabled || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }
  const label = mode === "video" ? "video" : "image";
  const countLabel = outputsLength === 1 ? label : `${label}s`;
  new Notification("Generation complete", {
    body: `Rendered ${outputsLength} ${countLabel}.`,
  });
}

function updateCounters() {
  if (jobCount) {
    jobCount.textContent = String(runtime.jobs);
  }
  if (assetCount) {
    assetCount.textContent = String(runtime.assets);
  }
}

function syncModelPanels() {
  if (!modeInput || !modelInput) {
    return;
  }
  const format = document.getElementById("format");
  if (!format || !a2eSection) {
    return;
  }
  const mode = modeInput.value;
  let model = modelInput.value;

  if (mode === "video" && model === "nano-banana-pro") {
    model = "a2e-ai";
    modelInput.value = model;
    setStatus("Nano Banana Pro is image-only in this build. Switched to a2e AI for video mode.");
    updateModelButtons(model);
  }

  if (mode === "video" && model === "gemini") {
    model = "a2e-ai";
    modelInput.value = model;
    setStatus("Gemini Imagen is image-only. Switched to a2e AI for video mode.");
    updateModelButtons(model);
  }

  a2eSection.classList.toggle("hidden", model !== "a2e-ai");

  if (mode === "video") {
    format.value = "mp4";
  } else if (mode === "image" && format.value === "mp4") {
    format.value = "png";
  }
}

function collectSettings() {
  return {
    connection: {
      baseUrl: DEFAULT_API_BASE,
      mockMode: getCheckboxValue("mockMode", DEFAULT_MOCK_MODE),
      endpoints: {
        nanoImage: DEFAULT_ENDPOINTS.nanoImage,
        a2eImage: DEFAULT_ENDPOINTS.a2eImage,
        a2eVideo: DEFAULT_ENDPOINTS.a2eVideo,
        geminiImage: DEFAULT_ENDPOINTS.geminiImage,
      },
    },
    mode: modeInput.value,
    model: modelInput.value,
    prompt: document.getElementById("prompt").value.trim(),
    output: {
      count: asNumber(getInputValue("outputCount", "2"), 2),
      seed: asNumber(getInputValue("seed", "42"), 42),
      aspectRatio: document.getElementById("aspectRatio").value,
      format: document.getElementById("format").value,
      width: asNumber(document.getElementById("width").value, 1024),
      height: asNumber(document.getElementById("height").value, 1024),
      steps: asNumber(getInputValue("steps", "30"), 30),
      guidance: asNumber(getInputValue("guidance", "7.5"), 7.5),
      sampler: getInputValue("sampler", "dpmpp-2m"),
      scheduler: getInputValue("scheduler", "karras"),
      quality: DEFAULT_QUALITY,
    },
    post: {
      removeBackground: getCheckboxValue("removeBackground", false),
      watermark: getCheckboxValue("watermark", false),
      faceRestore: getCheckboxValue("faceRestore", false),
      tiling: getCheckboxValue("tiling", false),
    },
    storage: {
      folderId: getSelectedFolderId(),
    },
    nano: {
      style: getInputValue("nanoStyle", "cinematic"),
      camera: getInputValue("nanoCamera", "35mm-prime"),
      lighting: getInputValue("nanoLighting", "golden-hour"),
      colorScience: getInputValue("nanoColorScience", "warm-iris"),
      upscaler: getInputValue("nanoUpscaler", "none"),
      denoise: asNumber(getInputValue("nanoDenoise", "0.35"), 0.35),
      layerBlend: asNumber(getInputValue("nanoLayerBlend", "0.5"), 0.5),
      clipSkip: asNumber(getInputValue("nanoClipSkip", "2"), 2),
      promptAssist: getCheckboxValue("nanoPromptAssist", true),
      hyperDetail: getCheckboxValue("nanoHyperDetail", true),
      faceLock: getCheckboxValue("nanoFaceLock", false),
      textureBoost: getCheckboxValue("nanoTextureBoost", true),
      hiresFix: getCheckboxValue("nanoHiresFix", true),
      controlDepth: getCheckboxValue("nanoControlDepth", false),
      controlPose: getCheckboxValue("nanoControlPose", false),
      controlEdges: getCheckboxValue("nanoControlEdges", false),
      vaeFix: getCheckboxValue("nanoVaeFix", true),
    },
    a2e: {
      style: document.getElementById("a2eStyle").value,
      referenceBoost: asNumber(getInputValue("a2eReferenceBoost", "1"), 1),
      motionStrength: asNumber(getInputValue("a2eMotionStrength", "0.55"), 0.55),
      duration: asNumber(document.getElementById("a2eDuration").value, 6),
      fps: asNumber(document.getElementById("a2eFps").value, 24),
      cameraMotion: document.getElementById("a2eCameraMotion").value,
      uncensored: document.getElementById("a2eUncensored").checked,
      loop: document.getElementById("a2eLoop").checked,
      stabilize: document.getElementById("a2eStabilize").checked,
      matureDetailEnhance: document.getElementById("a2eNSFWEnhance").checked,
    },
  };
}

function getEndpoint(settings) {
  if (settings.model === "nano-banana-pro") {
    return settings.connection.endpoints.nanoImage;
  }

  if (settings.model === "gemini") {
    return settings.connection.endpoints.geminiImage;
  }

  if (settings.mode === "video") {
    return settings.connection.endpoints.a2eVideo;
  }

  return settings.connection.endpoints.a2eImage;
}

function buildPayload(settings, referenceAsset) {
  const payload = {
    app: "CAMERA IRIS",
    provider: "higgsfield-ai",
    mode: settings.mode,
    model: settings.model,
    prompt: settings.prompt,
    count: settings.output.count,
    seed: settings.output.seed,
    aspect_ratio: settings.output.aspectRatio,
    width: settings.output.width,
    height: settings.output.height,
    format: settings.output.format,
    steps: settings.output.steps,
    guidance: settings.output.guidance,
    sampler: settings.output.sampler,
    scheduler: settings.output.scheduler,
    quality: settings.output.quality,
    postprocess: settings.post,
  };

  if (settings.model === "nano-banana-pro") {
    payload.features = {
      prompt_assist: settings.nano.promptAssist,
      hyper_detail: settings.nano.hyperDetail,
      face_lock: settings.nano.faceLock,
      texture_boost: settings.nano.textureBoost,
      hires_fix: settings.nano.hiresFix,
      depth_control: settings.nano.controlDepth,
      pose_control: settings.nano.controlPose,
      edge_control: settings.nano.controlEdges,
      vae_fix: settings.nano.vaeFix,
      style_pack: settings.nano.style,
      camera_profile: settings.nano.camera,
      lighting_rig: settings.nano.lighting,
      color_science: settings.nano.colorScience,
      upscaler: settings.nano.upscaler,
      denoise: settings.nano.denoise,
      layer_blend: settings.nano.layerBlend,
      clip_skip: settings.nano.clipSkip,
    };
  }

  if (settings.model === "a2e-ai") {
    payload.features = {
      style_mode: settings.a2e.style,
      reference_boost: settings.a2e.referenceBoost,
      motion_strength: settings.a2e.motionStrength,
      camera_motion: settings.a2e.cameraMotion,
      uncensored_mode: settings.a2e.uncensored,
      seamless_loop: settings.a2e.loop,
      motion_stabilize: settings.a2e.stabilize,
      mature_detail_enhance: settings.a2e.matureDetailEnhance,
    };

    payload.safety_profile = settings.a2e.uncensored ? "uncensored" : "standard";

    if (settings.mode === "video") {
      payload.video = {
        duration_seconds: settings.a2e.duration,
        fps: settings.a2e.fps,
      };
    }
  }

  if (referenceAsset) {
    payload.reference = {
      name: referenceAsset.name,
      type: referenceAsset.type,
      data_url: referenceAsset.dataUrl,
    };
  }

  return payload;
}

function toApiUrl(baseUrl, endpoint) {
  if (!baseUrl) {
    throw new Error("API Base URL is required when mock mode is disabled.");
  }

  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  return new URL(endpoint, baseUrl).toString();
}

function normalizeApiResponse(raw, settings) {
  const rows = [];

  const candidates = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.outputs)
      ? raw.outputs
      : Array.isArray(raw)
        ? raw
        : raw
          ? [raw]
          : [];

  candidates.forEach((item, idx) => {
    if (typeof item === "string") {
      rows.push({
        kind: settings.mode,
        title: `${settings.model} #${idx + 1}`,
        src: item,
        link: item,
        caption: "API response string",
      });
      return;
    }

    const imageUrl = item?.url || item?.image_url;
    const videoUrl = item?.video_url || item?.asset_url;
    const base64 = item?.b64_json;

    if (base64) {
      const source = `data:image/png;base64,${base64}`;
      rows.push({
        kind: "image",
        title: `${settings.model} #${idx + 1}`,
        src: source,
        link: source,
        caption: "Base64 image output",
      });
      return;
    }

    if (videoUrl) {
      rows.push({
        kind: "video",
        title: `${settings.model} Video #${idx + 1}`,
        src: videoUrl,
        link: videoUrl,
        caption: item?.caption || "Video output",
      });
      return;
    }

    if (imageUrl) {
      rows.push({
        kind: "image",
        title: `${settings.model} #${idx + 1}`,
        src: imageUrl,
        link: imageUrl,
        caption: item?.caption || settings.prompt || "Image output",
      });
      return;
    }
  });

  if (rows.length > 0) {
    return rows;
  }

  if (settings.mode === "video" && raw?.job_id) {
    return [
      {
        kind: "video",
        title: `${settings.model} Video Job`,
        src: "",
        link: "",
        caption: `Video job queued. Job ID: ${raw.job_id}`,
      },
    ];
  }

  return [
    {
      kind: "image",
      title: `${settings.model} Result`,
      src: buildMockSvg(settings, 1),
      link: "",
      caption: "Response parsed with fallback preview",
    },
  ];
}

async function callApi(settings, payload) {
  const endpoint = getEndpoint(settings);
  const url = toApiUrl(settings.connection.baseUrl, endpoint);

  const headers = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`API ${response.status}: ${bodyText || response.statusText}`);
  }

  const data = await response.json();
  return normalizeApiResponse(data, settings);
}

function buildMockSvg(settings, index) {
  const promptText = (settings.prompt || "No prompt").replace(/[<>]/g, "").slice(0, 72);
  const subText = `${settings.model} | ${settings.mode} | ${settings.output.width}x${settings.output.height}`;
  const label = `CAMERA IRIS ${index}`;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 900'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#3a1a05'/>
        <stop offset='50%' stop-color='#ff8d1c'/>
        <stop offset='100%' stop-color='#1f0e03'/>
      </linearGradient>
      <radialGradient id='spot' cx='50%' cy='45%' r='55%'>
        <stop offset='0%' stop-color='#ffc277' stop-opacity='0.95'/>
        <stop offset='100%' stop-color='#ff8f1f' stop-opacity='0'/>
      </radialGradient>
    </defs>
    <rect width='900' height='900' fill='url(#g)' />
    <rect width='900' height='900' fill='url(#spot)' />
    <circle cx='450' cy='450' r='260' fill='none' stroke='#ffd7ad' stroke-width='3' stroke-opacity='0.6'/>
    <circle cx='450' cy='450' r='180' fill='none' stroke='#ffe6cc' stroke-width='2' stroke-opacity='0.48'/>
    <text x='50%' y='14%' text-anchor='middle' fill='#ffe8cd' font-family='Arial, sans-serif' font-size='46' letter-spacing='4'>${label}</text>
    <text x='50%' y='82%' text-anchor='middle' fill='#fff1de' font-family='Arial, sans-serif' font-size='28'>${promptText}</text>
    <text x='50%' y='89%' text-anchor='middle' fill='#ffe2c0' font-family='Arial, sans-serif' font-size='22'>${subText}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runMockGeneration(settings, payload) {
  const count = Math.min(Math.max(settings.output.count, 1), 8);
  const results = [];
  await delay(600);

  for (let i = 1; i <= count; i += 1) {
    const poster = buildMockSvg(settings, i);

    if (settings.mode === "video") {
      results.push({
        kind: "video",
        title: `${settings.model} Video #${i}`,
        src: "",
        poster,
        link: "",
        caption: `Mock ${settings.a2e.duration}s clip queued | camera: ${settings.a2e.cameraMotion} | uncensored: ${settings.a2e.uncensored}`,
      });
      continue;
    }

    results.push({
      kind: "image",
      title: `${settings.model} Image #${i}`,
      src: poster,
      link: poster,
      caption: `Mock render | style: ${settings.model === "nano-banana-pro" ? settings.nano.style : settings.a2e.style}`,
    });
  }

  payload.mock_job_id = `mock-${Date.now()}`;
  return results;
}

function renderResults(results) {
  results.forEach((item) => {
    renderResultCard({ ...item, owner: loadProfileName() }, { prepend: true });
  });
}


function setBusy(isBusy) {
  if (!generateBtn) {
    return;
  }
  generateBtn.disabled = isBusy;
  const label = isBusy ? "Generating..." : "Generate";
  if (generateBtnEye) {
    generateBtn.innerHTML = `${generateBtnEye}<span>${label}</span>`;
  } else {
    generateBtn.textContent = label;
  }
}

function readReferenceData(fileInput) {
  const file = fileInput.files?.[0];

  if (!file) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
      });
    };
    reader.onerror = () => reject(new Error("Could not read reference file."));
    reader.readAsDataURL(file);
  });
}

async function handleGenerate(event) {
  event.preventDefault();
  syncModelPanels();

  const settings = collectSettings();
  const totalCount = Math.min(Math.max(settings.output.count, 1), 8);

  if (!settings.prompt) {
    setStatus("Prompt is required before generation.", "error");
    return;
  }

  setBusy(true);

  // Create placeholder cards for each render
  const placeholders = [];
  for (let i = 0; i < totalCount; i++) {
    const card = resultCardTemplate.content.firstElementChild.cloneNode(true);
    const wrap = card.querySelector(".result-media-wrap");
    const caption = card.querySelector(".result-caption");
    const ownerRow = card.querySelector(".result-owner-row");
    if (ownerRow) ownerRow.classList.add("hidden");
    if (wrap) {
      wrap.classList.add("developing");
      wrap.innerHTML = `
        <div class="developing-placeholder">
          <div class="developing-spinner"></div>
          <span>Rendering ${i + 1} of ${totalCount}...</span>
          <div class="developing-progress"><div class="developing-progress-bar"></div></div>
        </div>`;
    }
    if (caption) caption.textContent = settings.prompt;
    resultGrid.prepend(card);
    placeholders.push(card);
  }

  setStatus(`Generating ${totalCount} image${totalCount > 1 ? "s" : ""}...`);

  try {
    const reference = await readReferenceData(document.getElementById("referenceInput"));
    let allOutputs = [];

    if (settings.connection.mockMode) {
      const payload = buildPayload(settings, reference);
      allOutputs = await runMockGeneration(settings, payload);
    } else {
      // Fire parallel API calls — one per image for maximum speed
      const BATCH_SIZE = 5; // max concurrent requests
      const batches = [];
      for (let i = 0; i < totalCount; i += BATCH_SIZE) {
        batches.push(totalCount - i < BATCH_SIZE ? totalCount - i : BATCH_SIZE);
      }

      let completed = 0;
      for (const batchCount of batches) {
        const promises = [];
        for (let j = 0; j < batchCount; j++) {
          const singleSettings = { ...settings, output: { ...settings.output, count: 1 } };
          const payload = buildPayload(singleSettings, reference);
          promises.push(
            callApi(singleSettings, payload).then((results) => {
              completed++;
              setStatus(`Rendered ${completed} of ${totalCount}...`);
              return results;
            }).catch((err) => {
              completed++;
              console.error(`Render ${completed} failed:`, err);
              return [];
            })
          );
        }
        const batchResults = await Promise.all(promises);
        batchResults.forEach((results) => {
          allOutputs = allOutputs.concat(results);
        });
      }
    }

    persistGeneratedAssets(allOutputs, settings);

    // Remove all placeholders and rebuild feed from localStorage
    placeholders.forEach((p) => p.remove());
    renderFeed({ quiet: true, revealAge: 10000 });

    runtime.jobs += 1;
    runtime.assets += allOutputs.length;
    updateCounters();

    setStatus(`Completed job #${runtime.jobs}. Rendered ${allOutputs.length} asset(s).`, "success");
    notifyCompletion(allOutputs.length, settings.mode);
  } catch (error) {
    console.error(error);
    placeholders.forEach((p) => p.remove());
    setStatus(error.message || "Generation failed.", "error");
  } finally {
    setBusy(false);
  }
}


function applyModeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get("mode");
  const imageNavBtn = document.getElementById("navImageBtn");
  const videoNavBtn = document.getElementById("navVideoBtn");
  const isVideo = requestedMode === "video";

  if (modeInput) {
    modeInput.value = isVideo ? "video" : "image";
  }
  if (modelInput) {
    if (isVideo) {
      modelInput.value = "a2e-ai";
    } else {
      modelInput.value = "nano-banana-pro";
    }
  }

  updateNavButtons(imageNavBtn, videoNavBtn, isVideo);
  if (!modeInput || !modelInput) {
    return;
  }
  updateModeButtons(modeInput.value);
  updateModelButtons(modelInput.value);
  syncModelPanels();
}

function applySizePreset(size) {
  if (widthInput) {
    widthInput.value = String(size);
  }
  if (heightInput) {
    heightInput.value = String(size);
  }
  if (aspectRatioInput) {
    aspectRatioInput.value = "1:1";
  }
}

function updateNavButtons(imageNavBtn, videoNavBtn, explicitIsVideo) {
  const imageButton = imageNavBtn || document.getElementById("navImageBtn");
  const videoButton = videoNavBtn || document.getElementById("navVideoBtn");
  if (!imageButton || !videoButton) {
    return;
  }
  const isVideo =
    typeof explicitIsVideo === "boolean"
      ? explicitIsVideo
      : modeInput
        ? modeInput.value === "video"
        : false;
  imageButton.classList.toggle("active", !isVideo);
  videoButton.classList.toggle("active", isVideo);
}

function updateModeButtons(modeValue, preferredButton = null) {
  if (!modeButtons.length) {
    return;
  }
  const target =
    preferredButton ||
    Array.from(modeButtons).find((button) => button.dataset.mode === modeValue) ||
    null;
  if (!target) {
    modeButtons.forEach((button) => {
      button.classList.remove("active");
    });
    return;
  }
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button === target);
  });
}

function updateModelButtons(modelValue, preferredButton = null) {
  if (!modelButtons.length) {
    return;
  }
  let targetButton = preferredButton;
  if (!targetButton) {
    const defaultMatch = Array.from(modelButtons).find(
      (button) => button.dataset.model === modelValue && button.dataset.default === "true"
    );
    targetButton =
      defaultMatch || Array.from(modelButtons).find((button) => button.dataset.model === modelValue) || null;
  }
  modelButtons.forEach((button) => {
    button.classList.toggle("active", button === targetButton);
  });
}

modelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modelValue = button.dataset.model;
    if (!modelValue) {
      return;
    }
    modelInput.value = modelValue;
    updateModelButtons(modelValue, button);
    syncModelPanels();
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modeValue = button.dataset.mode;
    if (!modeValue) {
      return;
    }
    modeInput.value = modeValue;
    updateModeButtons(modeValue, button);
    updateNavButtons();
    syncModelPanels();
  });
});

sizeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const size = Number(button.dataset.size);
    if (!Number.isFinite(size)) {
      return;
    }
    applySizePreset(size);
    sizeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn === button);
    });
  });
});

countButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const count = button.dataset.count;
    if (outputCountInput) {
      outputCountInput.value = count;
    }
    countButtons.forEach((btn) => {
      btn.classList.toggle("active", btn === button);
    });
  });
});

if (modeInput) {
  modeInput.addEventListener("change", syncModelPanels);
}
if (modelInput) {
  modelInput.addEventListener("change", syncModelPanels);
}
if (form) {
  form.addEventListener("submit", handleGenerate);
}
if (promptInput && form) {
  promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit(generateBtn || undefined);
      } else {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    }
  });
}
if (saveFolderSelect) {
  saveFolderSelect.addEventListener("change", () => {
    saveSaveFolderPreference(getSelectedFolderId());
  });
}
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
if (feedAddPostBtn) {
  feedAddPostBtn.addEventListener("click", () => {
    if (feedPostText) {
      feedPostText.scrollIntoView({ behavior: "smooth", block: "center" });
      feedPostText.focus();
    }
  });
}
if (feedPostSubmit) {
  feedPostSubmit.addEventListener("click", () => {
    addFeedPost({
      text: feedPostText ? feedPostText.value : "",
      file: feedPostFile ? feedPostFile.files?.[0] || null : null,
    });
  });
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
    setThemeMenuOpen(false);
    setAddMenuOpen(false);
    setProfileMenuOpen(false);
  }
});

// Fullscreen image preview
const fsOverlay = document.getElementById("fullscreenOverlay");
const fsImage = document.getElementById("fsImage");
const fsImageWrap = document.getElementById("fsImageWrap");
const fsZoomIn = document.getElementById("fsZoomIn");
const fsZoomOut = document.getElementById("fsZoomOut");
const fsZoomLevel = document.getElementById("fsZoomLevel");
const fsClose = document.getElementById("fsClose");
let fsScale = 1;
let fsPan = { x: 0, y: 0 };
let fsDrag = { active: false, startX: 0, startY: 0, originX: 0, originY: 0 };

function updateFsTransform() {
  if (fsImage) {
    fsImage.style.transform = `translate(${fsPan.x}px, ${fsPan.y}px) scale(${fsScale})`;
  }
  if (fsZoomLevel) {
    fsZoomLevel.textContent = `${Math.round(fsScale * 100)}%`;
  }
}

function openFullscreen(src) {
  if (!fsOverlay || !fsImage || !src) return;
  fsImage.src = src;
  fsScale = 1;
  fsPan = { x: 0, y: 0 };
  updateFsTransform();
  fsOverlay.classList.remove("hidden");
}

function closeFullscreen() {
  if (!fsOverlay) return;
  fsOverlay.classList.add("hidden");
  if (fsImage) fsImage.src = "";
  fsDrag.active = false;
}

if (fsClose) fsClose.addEventListener("click", closeFullscreen);
if (fsOverlay) fsOverlay.addEventListener("click", (e) => {
  if (e.target === fsOverlay || e.target === fsImageWrap) closeFullscreen();
});
if (fsZoomIn) fsZoomIn.addEventListener("click", (e) => {
  e.stopPropagation();
  fsScale = Math.min(fsScale + 0.25, 5);
  updateFsTransform();
});
if (fsZoomOut) fsZoomOut.addEventListener("click", (e) => {
  e.stopPropagation();
  fsScale = Math.max(fsScale - 0.25, 0.25);
  updateFsTransform();
});
if (fsImageWrap) {
  fsImageWrap.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    fsScale = Math.min(Math.max(fsScale + delta, 0.25), 5);
    updateFsTransform();
  }, { passive: false });

  fsImageWrap.addEventListener("mousedown", (e) => {
    if (e.target === fsImage || e.target === fsImageWrap) {
      fsDrag = { active: true, startX: e.clientX, startY: e.clientY, originX: fsPan.x, originY: fsPan.y };
      e.preventDefault();
    }
  });
  window.addEventListener("mousemove", (e) => {
    if (!fsDrag.active) return;
    fsPan.x = fsDrag.originX + (e.clientX - fsDrag.startX);
    fsPan.y = fsDrag.originY + (e.clientY - fsDrag.startY);
    updateFsTransform();
  });
  window.addEventListener("mouseup", () => { fsDrag.active = false; });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && fsOverlay && !fsOverlay.classList.contains("hidden")) {
    closeFullscreen();
  }
});

applyModeFromUrl();
populateSaveFolderOptions();
updateCounters();
updateNotifyButton();
updateCreditsButton();
ensureCustomThemeStyles(loadCustomThemes());
renderCustomThemes();
applyTheme(loadThemePreference());
applyProfile();
renderFeed();

window.addEventListener("storage", (event) => {
  if (!event) {
    return;
  }
  if ([FEED_REFRESH_KEY, MEDIA_STORAGE_KEY, PROFILE_POSTS_KEY, DELETED_IDS_KEY].includes(event.key)) {
    renderFeed({ quiet: true });
    populateSaveFolderOptions();
    updateCounters();
  }
});

// Re-render feed when navigating back to this page (picks up deletions from media page)
window.addEventListener("pageshow", () => {
  renderFeed({ quiet: true });
  populateSaveFolderOptions();
  updateCounters();
});

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

// Column resize handle
const colHandle = document.getElementById("columnResizeHandle");
const workspaceGrid = document.querySelector(".workspace-grid");
const controlPanel = document.querySelector(".control-panel");
const PANEL_WIDTH_KEY = "cameraIrisPanelWidth";

if (colHandle && workspaceGrid && controlPanel) {
  // Restore saved width
  try {
    const saved = localStorage.getItem(PANEL_WIDTH_KEY);
    if (saved) {
      const px = parseInt(saved, 10);
      if (px >= 260 && px <= window.innerWidth * 0.7) {
        workspaceGrid.style.setProperty("--panel-left-width", px + "px");
      }
    }
  } catch (e) {}

  let resizing = false;

  colHandle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    resizing = true;
    colHandle.classList.add("dragging");
    colHandle.setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  window.addEventListener("pointermove", (e) => {
    if (!resizing) return;
    const rect = workspaceGrid.getBoundingClientRect();
    let newWidth = e.clientX - rect.left;
    newWidth = Math.max(260, Math.min(newWidth, rect.width * 0.7));
    workspaceGrid.style.setProperty("--panel-left-width", newWidth + "px");
  });

  window.addEventListener("pointerup", () => {
    if (!resizing) return;
    resizing = false;
    colHandle.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    try {
      const w = controlPanel.getBoundingClientRect().width;
      localStorage.setItem(PANEL_WIDTH_KEY, String(Math.round(w)));
    } catch (e) {}
  });
}
