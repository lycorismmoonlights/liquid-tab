const STORAGE_KEYS = {
  style: "liquid-tab-style",
  engine: "liquid-tab-engine",
  reduceMotion: "liquid-tab-reduce-motion",
  wallpaper: "liquid-tab-wallpaper",
  recent: "liquid-tab-recent"
};

const SEARCH_ENGINES = {
  google: "https://www.google.com/search?q=",
  duck: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q="
};

const LIQUID_SNAPSHOT_TARGET = ".scene__capture";
const MAX_WALLPAPER_DIMENSION = 1600;
const MAX_WALLPAPER_LENGTH = 1800000;
const MAX_RECENT_ITEMS = 4;

const state = {
  style: localStorage.getItem(STORAGE_KEYS.style) || "liquid",
  engine: localStorage.getItem(STORAGE_KEYS.engine) || "google",
  reduceMotion: localStorage.getItem(STORAGE_KEYS.reduceMotion) === "true",
  wallpaper: localStorage.getItem(STORAGE_KEYS.wallpaper) || "",
  recent: []
};

const body = document.body;
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const pasteButton = document.getElementById("paste-button");
const tabsSheet = document.getElementById("tabs-sheet");
const settingsSheet = document.getElementById("settings-sheet");
const sheetBackdrop = document.getElementById("sheet-backdrop");
const motionToggle = document.getElementById("motion-toggle");
const tabBadge = document.getElementById("tab-badge");
const wallpaperLayer = document.getElementById("wallpaper-layer");
const wallpaperInput = document.getElementById("wallpaper-input");
const wallpaperUpload = document.getElementById("wallpaper-upload");
const wallpaperReset = document.getElementById("wallpaper-reset");
const wallpaperMeta = document.getElementById("wallpaper-meta");
const recentList = document.getElementById("recent-list");
const recentEmpty = document.getElementById("recent-empty");
const recentClear = document.getElementById("recent-clear");

let liquidLenses = [];
let liquidGlassReady = false;
let liquidSnapshotFrame = 0;
let wallpaperBusy = false;
let wallpaperMessage = "";

function parseRecentEntries(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => entry && typeof entry.url === "string" && typeof entry.title === "string")
      .slice(0, MAX_RECENT_ITEMS);
  } catch (error) {
    return [];
  }
}

function getHostLabel(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace(/^www\./, "");
  } catch (error) {
    return url;
  }
}

function getInitials(title) {
  const cleaned = title.replace(/https?:\/\//gi, "").trim();
  if (!cleaned) {
    return "?";
  }

  const words = cleaned.split(/[\s./_-]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.slice(0, 2).toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase();
}

function formatRecentMeta(entry) {
  if (entry.type === "search") {
    return `${entry.engineLabel || "搜索"} · ${entry.meta || "刚刚访问"}`;
  }

  return entry.meta || getHostLabel(entry.url);
}

function renderRecentEntries() {
  if (!recentList || !recentEmpty || !recentClear) {
    return;
  }

  recentList.textContent = "";

  if (!state.recent.length) {
    recentEmpty.hidden = false;
    recentClear.hidden = true;
    return;
  }

  recentEmpty.hidden = true;
  recentClear.hidden = false;

  state.recent.forEach((entry) => {
    const item = document.createElement("a");
    item.className = "recent-item";
    item.href = entry.url;
    item.rel = "noreferrer";
    item.dataset.recentLink = "";
    item.dataset.recentTitle = entry.title;
    item.dataset.recentMeta = entry.meta || "";
    item.dataset.recentType = entry.type || "link";

    const icon = document.createElement("span");
    icon.className = "recent-item__icon";
    icon.textContent = getInitials(entry.title);

    const copy = document.createElement("span");
    copy.className = "recent-item__copy";

    const title = document.createElement("span");
    title.className = "recent-item__title";
    title.textContent = entry.title;

    const meta = document.createElement("span");
    meta.className = "recent-item__meta";
    meta.textContent = formatRecentMeta(entry);

    const arrow = document.createElement("span");
    arrow.className = "recent-item__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    copy.append(title, meta);
    item.append(icon, copy, arrow);

    recentList.appendChild(item);
  });
}

function persistRecentEntries() {
  localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(state.recent));
}

function addRecentEntry(entry) {
  if (!entry || !entry.url || !entry.title) {
    return;
  }

  const normalizedEntry = {
    title: entry.title.trim(),
    url: entry.url,
    meta: entry.meta || getHostLabel(entry.url),
    type: entry.type || "link",
    engineLabel: entry.engineLabel || ""
  };

  state.recent = [
    normalizedEntry,
    ...state.recent.filter((item) => item.url !== normalizedEntry.url)
  ].slice(0, MAX_RECENT_ITEMS);

  persistRecentEntries();
  renderRecentEntries();
}

function syncWallpaperControls() {
  wallpaperUpload.disabled = wallpaperBusy;
  wallpaperReset.disabled = wallpaperBusy || !state.wallpaper;

  if (wallpaperMessage) {
    wallpaperMeta.textContent = wallpaperMessage;
    return;
  }

  wallpaperMeta.textContent = state.wallpaper
    ? "已使用自定义壁纸，只保存在当前浏览器。"
    : "当前使用默认壁纸。上传的图片只保存在这台设备的浏览器里。";
}

function setWallpaperBusy(isBusy) {
  wallpaperBusy = isBusy;
  syncWallpaperControls();
}

function setWallpaperMessage(message = "") {
  wallpaperMessage = message;
  syncWallpaperControls();
}

function applyState() {
  body.dataset.style = state.style;
  body.classList.toggle("is-reduced-motion", state.reduceMotion);
  motionToggle.checked = state.reduceMotion;

  document.querySelectorAll("[data-style-choice]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.styleChoice === state.style);
  });

  document.querySelectorAll("[data-engine-choice]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.engineChoice === state.engine);
  });

  localStorage.setItem(STORAGE_KEYS.style, state.style);
  localStorage.setItem(STORAGE_KEYS.engine, state.engine);
  localStorage.setItem(STORAGE_KEYS.reduceMotion, String(state.reduceMotion));
  syncWallpaperControls();
  syncLiquidGlass();
}

function getLiquidPreset() {
  if (state.style === "transparent") {
    return {
      refraction: 0,
      bevelDepth: 0.02,
      bevelWidth: 0.08,
      frost: 0.08,
      shadow: false,
      specular: false,
      magnify: 1
    };
  }

  return {
    refraction: 0,
    bevelDepth: 0.036,
    bevelWidth: 0.14,
    frost: 0.42,
    shadow: false,
    specular: !state.reduceMotion,
    magnify: 1.002
  };
}

function refreshLiquidGlassSnapshot() {
  if (!liquidLenses.length) {
    return;
  }

  const firstLens = liquidLenses[0];
  const renderer = firstLens && firstLens.renderer;
  if (!renderer || typeof renderer.captureSnapshot !== "function") {
    return;
  }

  if (liquidSnapshotFrame) {
    cancelAnimationFrame(liquidSnapshotFrame);
  }

  liquidSnapshotFrame = requestAnimationFrame(() => {
    liquidSnapshotFrame = requestAnimationFrame(async () => {
      try {
        await renderer.captureSnapshot();
        if (typeof renderer.render === "function") {
          renderer.render();
        }
      } catch (error) {
        console.warn("liquidGL snapshot refresh failed.", error);
      }
    });
  });
}

function syncLiquidGlass() {
  if (!liquidLenses.length) {
    return;
  }

  const preset = getLiquidPreset();
  liquidLenses.forEach((lens) => {
    if (!lens || !lens.options) {
      return;
    }

    Object.assign(lens.options, preset);

    if (typeof lens.setShadow === "function") {
      lens.setShadow(preset.shadow);
    }
  });

  refreshLiquidGlassSnapshot();
}

function initLiquidGlass() {
  if (liquidGlassReady || typeof window.liquidGL !== "function" || typeof window.html2canvas !== "function") {
    return;
  }

  try {
    const effect = window.liquidGL({
      snapshot: LIQUID_SNAPSHOT_TARGET,
      target: ".liquid-lens",
      resolution: 2,
      tilt: false,
      reveal: state.reduceMotion ? "none" : "fade",
      ...getLiquidPreset(),
      on: {
        init() {
          body.classList.add("liquid-gl-enabled");
        }
      }
    });

    liquidLenses = Array.isArray(effect) ? effect.filter(Boolean) : [effect].filter(Boolean);
    liquidGlassReady = liquidLenses.length > 0;

    if (typeof window.liquidGL.syncWith === "function") {
      window.liquidGL.syncWith();
    }

    syncLiquidGlass();
  } catch (error) {
    console.warn("liquidGL init failed, falling back to CSS glass.", error);
  }
}

function looksLikeUrl(value) {
  return /^(https?:\/\/|[\w-]+\.[\w.-]{2,})(\/.*)?$/i.test(value);
}

function normalizeUrl(value) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function submitSearch(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    searchInput.focus();
    return;
  }

  if (looksLikeUrl(value)) {
    const normalizedUrl = normalizeUrl(value);
    addRecentEntry({
      title: getHostLabel(normalizedUrl),
      url: normalizedUrl,
      meta: "网址直达",
      type: "link"
    });
    window.location.href = normalizedUrl;
    return;
  }

  const engineUrl = SEARCH_ENGINES[state.engine] || SEARCH_ENGINES.google;
  const searchUrl = `${engineUrl}${encodeURIComponent(value)}`;
  const engineLabel = state.engine === "duck" ? "DuckDuckGo" : state.engine === "bing" ? "Bing" : "Google";

  addRecentEntry({
    title: value,
    url: searchUrl,
    meta: "搜索记录",
    type: "search",
    engineLabel
  });

  window.location.href = searchUrl;
}

function closeSheets() {
  tabsSheet.hidden = true;
  settingsSheet.hidden = true;
  sheetBackdrop.hidden = true;
}

function openSheet(sheet) {
  tabsSheet.hidden = true;
  settingsSheet.hidden = true;
  sheet.hidden = false;
  sheetBackdrop.hidden = false;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败，请换一张试试。"));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败，请换一张试试。"));
    image.src = source;
  });
}

function renderImageToCanvas(canvas, image, width, height) {
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
}

async function compressWallpaper(file) {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const canvas = document.createElement("canvas");

  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;
  const scale = Math.min(1, MAX_WALLPAPER_DIMENSION / Math.max(width, height));

  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  let quality = 0.86;
  let dataUrl = "";
  let attempts = 0;

  while (attempts < 8) {
    renderImageToCanvas(canvas, image, width, height);
    dataUrl = canvas.toDataURL("image/jpeg", quality);

    if (dataUrl.length <= MAX_WALLPAPER_LENGTH) {
      return dataUrl;
    }

    if (quality > 0.62) {
      quality = Math.max(0.62, quality - 0.08);
    } else {
      width = Math.max(480, Math.round(width * 0.88));
      height = Math.max(480, Math.round(height * 0.88));
    }

    attempts += 1;
  }

  throw new Error("这张图有点大，先裁一下或者换一张更小的。");
}

async function renderWallpaper(dataUrl) {
  if (!dataUrl) {
    wallpaperLayer.style.backgroundImage = "none";
    body.classList.remove("has-custom-wallpaper");
    refreshLiquidGlassSnapshot();
    return;
  }

  await loadImage(dataUrl);
  wallpaperLayer.style.backgroundImage = `url("${dataUrl}")`;
  body.classList.add("has-custom-wallpaper");
  refreshLiquidGlassSnapshot();
}

function persistWallpaper(dataUrl) {
  if (!dataUrl) {
    localStorage.removeItem(STORAGE_KEYS.wallpaper);
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.wallpaper, dataUrl);
  } catch (error) {
    throw new Error("这张壁纸存不下，换一张更小的试试。");
  }
}

async function setWallpaper(dataUrl) {
  persistWallpaper(dataUrl);
  state.wallpaper = dataUrl;
  await renderWallpaper(dataUrl);
  syncWallpaperControls();
}

async function restoreWallpaper() {
  syncWallpaperControls();

  if (!state.wallpaper) {
    return;
  }

  try {
    await renderWallpaper(state.wallpaper);
  } catch (error) {
    console.warn("Saved wallpaper could not be restored.", error);
    state.wallpaper = "";
    localStorage.removeItem(STORAGE_KEYS.wallpaper);
    setWallpaperMessage("上次保存的壁纸失效了，已经恢复默认。");
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSearch(searchInput.value);
});

pasteButton.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      searchInput.value = text.trim();
      searchInput.focus();
    }
  } catch (error) {
    searchInput.focus();
  }
});

document.querySelectorAll("[data-style-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    state.style = button.dataset.styleChoice;
    applyState();
  });
});

document.querySelectorAll("[data-engine-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    state.engine = button.dataset.engineChoice;
    applyState();
  });
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-recent-link]");
  if (!link || !(link instanceof HTMLAnchorElement)) {
    return;
  }

  addRecentEntry({
    title: (link.dataset.recentTitle || link.textContent || getHostLabel(link.href)).trim(),
    url: link.href,
    meta: link.dataset.recentMeta || getHostLabel(link.href),
    type: link.dataset.recentType || "link"
  });
});

wallpaperUpload.addEventListener("click", () => {
  wallpaperInput.click();
});

wallpaperReset.addEventListener("click", async () => {
  setWallpaperBusy(true);
  setWallpaperMessage("已恢复默认壁纸。");

  try {
    await setWallpaper("");
  } finally {
    setWallpaperBusy(false);
  }
});

wallpaperInput.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  wallpaperInput.value = "";

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setWallpaperMessage("这不是图片文件，换一张照片试试。");
    return;
  }

  setWallpaperBusy(true);
  setWallpaperMessage("正在处理壁纸...");

  try {
    const compressedWallpaper = await compressWallpaper(file);
    await setWallpaper(compressedWallpaper);
    setWallpaperMessage("自定义壁纸已更新，只保存在当前浏览器。");
  } catch (error) {
    console.warn("Wallpaper upload failed.", error);
    setWallpaperMessage(error.message || "壁纸上传失败，请换一张试试。");
  } finally {
    setWallpaperBusy(false);
  }
});

document.getElementById("nav-back").addEventListener("click", () => window.history.back());
document.getElementById("nav-forward").addEventListener("click", () => window.history.forward());
document.getElementById("nav-search").addEventListener("click", () => searchInput.focus());
document.getElementById("nav-tabs").addEventListener("click", () => openSheet(tabsSheet));
document.getElementById("nav-menu").addEventListener("click", () => openSheet(settingsSheet));
sheetBackdrop.addEventListener("click", closeSheets);

motionToggle.addEventListener("change", () => {
  state.reduceMotion = motionToggle.checked;
  applyState();
});

recentClear.addEventListener("click", () => {
  state.recent = [];
  localStorage.removeItem(STORAGE_KEYS.recent);
  renderRecentEntries();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSheets();
  }
});

tabBadge.textContent = String(document.querySelectorAll(".quick-card").length).padStart(2, "0");
state.recent = parseRecentEntries(localStorage.getItem(STORAGE_KEYS.recent));

applyState();
renderRecentEntries();

const wallpaperReady = restoreWallpaper();

if (document.readyState === "complete") {
  wallpaperReady.finally(initLiquidGlass);
} else {
  window.addEventListener("load", () => {
    wallpaperReady.finally(initLiquidGlass);
  }, { once: true });
}
