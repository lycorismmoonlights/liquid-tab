const STORAGE_KEYS = {
  browserMode: "liquid-tab-browser-mode",
  themeMode: "liquid-tab-theme-mode",
  style: "liquid-tab-style",
  engine: "liquid-tab-engine",
  reduceMotion: "liquid-tab-reduce-motion",
  showRecent: "liquid-tab-show-recent",
  showQuickLinks: "liquid-tab-show-quick-links",
  wallpaper: "liquid-tab-wallpaper",
  recent: "liquid-tab-recent"
};

const SEARCH_ENGINES = {
  google: "https://www.google.com/search?q=",
  duck: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q="
};

const LIQUID_SNAPSHOT_TARGET = ".scene__capture";
const LIQUID_TARGET_SELECTOR = ".liquid-lens--search, .liquid-lens--dock";
const TRUE_GLASS_HOST_SELECTOR = ".search-shell, .quick-card, #recent-shell, .dock-shell, .hero-tool";
const CROP_PRESETS = {
  default: {
    width: 1179,
    height: 2556,
    copy: "只有上传图片时才会出现。框选比例暂时按 iPhone 15 Pro 竖屏参考，拖动图片调整位置，再用下面的滑块缩放。"
  },
  chrome: {
    width: 1179,
    height: 1994,
    copy: "只有上传图片时才会出现。当前 Chrome 模式会按你给的截图可视区域比例裁切，自动避开上下浏览器栏，拖动图片调整位置，再用下面的滑块缩放。"
  },
  desktop: {
    width: 1600,
    height: 1000,
    copy: "只有上传图片时才会出现。当前桌面模式会按宽屏新标签页比例裁切，参考桌面 Chrome 的可视区域，拖动图片调整位置，再用下面的滑块缩放。"
  }
};
const MAX_WALLPAPER_LENGTH = 1800000;
const MAX_RECENT_ITEMS = 4;
const ADAPTIVE_DAY_VARS = [
  "--adaptive-hero-text-primary",
  "--adaptive-hero-text-secondary",
  "--adaptive-hero-eyebrow-color",
  "--adaptive-control-text-primary",
  "--adaptive-control-text-secondary",
  "--adaptive-control-text-muted",
  "--adaptive-recent-eyebrow-color",
  "--adaptive-search-placeholder",
  "--adaptive-surface-border",
  "--adaptive-surface-shadow",
  "--adaptive-surface-bg",
  "--adaptive-surface-highlight",
  "--adaptive-surface-stroke",
  "--adaptive-dock-bg",
  "--adaptive-dock-shadow",
  "--adaptive-chip-active-bg",
  "--adaptive-chip-active-border",
  "--adaptive-backdrop-saturate",
  "--adaptive-glass-tint",
  "--adaptive-glass-overlay",
  "--adaptive-glass-overlay-border",
  "--adaptive-glass-edge-shine",
  "--adaptive-glass-shadow",
  "--adaptive-glass-button-fill",
  "--adaptive-glass-button-border",
  "--adaptive-wordmark-shadow",
  "--adaptive-subtitle-shadow"
];
const ADAPTIVE_DAY_SAMPLE_ZONES = {
  hero: { x: 0.18, y: 0.06, width: 0.64, height: 0.24 },
  panel: { x: 0.08, y: 0.28, width: 0.84, height: 0.46 },
  overall: { x: 0, y: 0, width: 1, height: 1 }
};

function detectBrowserMode() {
  const ua = navigator.userAgent || "";
  return /CriOS/i.test(ua) ? "chrome" : "default";
}

const systemThemeQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
let hasWarnedAboutStorage = false;

function warnStorageAccess(operation, error) {
  if (hasWarnedAboutStorage) {
    return;
  }

  hasWarnedAboutStorage = true;
  console.warn(`Storage ${operation} failed. Falling back to in-memory state.`, error);
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    warnStorageAccess("read", error);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    warnStorageAccess("write", error);
    return false;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    warnStorageAccess("remove", error);
    return false;
  }
}

// Keep persisted state on a single schema so new settings use one read/write path.
const PERSISTED_STATE_FIELDS = {
  browserMode: {
    storageKey: STORAGE_KEYS.browserMode,
    defaultValue: () => detectBrowserMode()
  },
  themeMode: {
    storageKey: STORAGE_KEYS.themeMode,
    defaultValue: "system"
  },
  style: {
    storageKey: STORAGE_KEYS.style,
    defaultValue: "liquid"
  },
  engine: {
    storageKey: STORAGE_KEYS.engine,
    defaultValue: "google"
  },
  reduceMotion: {
    storageKey: STORAGE_KEYS.reduceMotion,
    defaultValue: false,
    read: (value) => value === "true",
    write: (value) => String(value)
  },
  showRecent: {
    storageKey: STORAGE_KEYS.showRecent,
    defaultValue: true,
    read: (value) => value !== "false",
    write: (value) => String(value)
  },
  showQuickLinks: {
    storageKey: STORAGE_KEYS.showQuickLinks,
    defaultValue: true,
    read: (value) => value !== "false",
    write: (value) => String(value)
  },
  wallpaper: {
    storageKey: STORAGE_KEYS.wallpaper,
    defaultValue: "",
    shouldClear: (value) => !value
  },
  recent: {
    storageKey: STORAGE_KEYS.recent,
    defaultValue: [],
    read: (value) => parseRecentEntries(value),
    write: (value) => JSON.stringify(value),
    shouldClear: (value) => !Array.isArray(value) || !value.length
  }
};

function getStateFieldConfig(fieldName) {
  return PERSISTED_STATE_FIELDS[fieldName] || null;
}

function resolveDefaultStateValue(config) {
  return typeof config.defaultValue === "function" ? config.defaultValue() : config.defaultValue;
}

function readStateField(fieldName) {
  const config = getStateFieldConfig(fieldName);
  if (!config) {
    return undefined;
  }

  const rawValue = readStorage(config.storageKey);
  if (rawValue === null) {
    return resolveDefaultStateValue(config);
  }

  return typeof config.read === "function" ? config.read(rawValue) : rawValue;
}

function writeStateField(fieldName, value) {
  const config = getStateFieldConfig(fieldName);
  if (!config) {
    return true;
  }

  if (typeof config.shouldClear === "function" && config.shouldClear(value)) {
    return removeStorage(config.storageKey);
  }

  const serializedValue = typeof config.write === "function" ? config.write(value) : value;
  return writeStorage(config.storageKey, serializedValue);
}

function createInitialState() {
  return {
    browserMode: readStateField("browserMode"),
    themeMode: readStateField("themeMode"),
    style: readStateField("style"),
    engine: readStateField("engine"),
    reduceMotion: readStateField("reduceMotion"),
    showRecent: readStateField("showRecent"),
    showQuickLinks: readStateField("showQuickLinks"),
    wallpaper: readStateField("wallpaper"),
    recent: readStateField("recent")
  };
}

let stateWriteDepth = 0;

function withStateWrite(fn) {
  stateWriteDepth += 1;

  try {
    return fn();
  } finally {
    stateWriteDepth = Math.max(0, stateWriteDepth - 1);
  }
}

function createGuardedState(initialState) {
  const warnedFields = new Set();

  return new Proxy(initialState, {
    set(target, property, value) {
      if (stateWriteDepth === 0 && typeof property === "string" && !warnedFields.has(property)) {
        warnedFields.add(property);
        console.warn(`Direct state write to "${property}" detected. Use stateStore.write/patch/toggle instead.`);
      }

      target[property] = value;
      return true;
    }
  });
}

const state = createGuardedState(createInitialState());

const stateStore = {
  read(fieldName) {
    return state[fieldName];
  },
  write(fieldName, value, options = {}) {
    withStateWrite(() => {
      state[fieldName] = value;
    });

    if (options.persist === false) {
      return true;
    }

    return writeStateField(fieldName, value);
  },
  patch(nextValues, options = {}) {
    return Object.entries(nextValues).every(([fieldName, value]) => this.write(fieldName, value, options));
  },
  toggle(fieldName, options = {}) {
    return this.write(fieldName, !this.read(fieldName), options);
  },
  persist(fieldName, value) {
    return writeStateField(fieldName, value);
  },
  replaceRecent(entries) {
    this.write("recent", entries.slice(0, MAX_RECENT_ITEMS));
    renderRecentEntries();
  },
  clearRecent() {
    this.replaceRecent([]);
  }
};

const body = document.body;
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const pasteButton = document.getElementById("paste-button");
const widgetPicker = document.getElementById("widget-picker");
const quickGrid = document.querySelector(".quick-grid");
const recentShell = document.getElementById("recent-shell");
const tabsSheet = document.getElementById("tabs-sheet");
const settingsSheet = document.getElementById("settings-sheet");
const sheetBackdrop = document.getElementById("sheet-backdrop");
const motionToggle = document.getElementById("motion-toggle");
const tabBadge = document.getElementById("tab-badge");
const desktopTabs = document.getElementById("desktop-tabs");
const desktopSettings = document.getElementById("desktop-settings");
const desktopCustomize = document.getElementById("desktop-customize");
const parallaxEnable = document.getElementById("parallax-enable");
const parallaxStatus = document.getElementById("parallax-status");
const wallpaperLayer = document.getElementById("wallpaper-layer");
const wallpaperInput = document.getElementById("wallpaper-input");
const wallpaperUpload = document.getElementById("wallpaper-upload");
const wallpaperReset = document.getElementById("wallpaper-reset");
const wallpaperMeta = document.getElementById("wallpaper-meta");
const recentList = document.getElementById("recent-list");
const recentEmpty = document.getElementById("recent-empty");
const recentClear = document.getElementById("recent-clear");
const cropper = document.getElementById("cropper");
const cropperFrame = document.getElementById("cropper-frame");
const cropperSurface = document.getElementById("cropper-surface");
const cropperImage = document.getElementById("cropper-image");
const cropperZoom = document.getElementById("cropper-zoom");
const cropperCancel = document.getElementById("cropper-cancel");
const cropperApply = document.getElementById("cropper-apply");
const cropperCopy = cropper ? cropper.querySelector(".cropper__copy") : null;
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

let liquidLenses = [];
let liquidGlassReady = false;
let liquidSnapshotFrame = 0;
let trueGlassContainers = [];
let trueGlassReady = false;
let trueGlassSnapshotFrame = 0;
let trueGlassSnapshotPending = false;
let trueGlassRealtimeFrame = 0;
let wallpaperBusy = false;
let wallpaperMessage = "";
let cropState = null;
let adaptiveDayAppearanceKey = "";
let adaptiveDayAppearanceToken = 0;
let parallaxFrame = 0;
const parallaxState = {
  targetX: 0,
  targetY: 0,
  currentX: 0,
  currentY: 0,
  baseBeta: null,
  baseGamma: null,
  baseMotionX: null,
  baseMotionY: null,
  deviceActive: false,
  sensorSource: "",
  status: "idle",
  orientationAttached: false,
  motionAttached: false,
  permissionRequested: false,
  primerAttached: false,
  primerCleanup: null,
  pointerAttached: false
};

function getCropPreset() {
  if (isDesktopLayout()) {
    return CROP_PRESETS.desktop;
  }

  return state.browserMode === "chrome" ? CROP_PRESETS.chrome : CROP_PRESETS.default;
}

function getTrueGlassSnapshotTarget() {
  return document.querySelector(LIQUID_SNAPSHOT_TARGET) || document.body;
}

function syncCropperPreset() {
  const preset = getCropPreset();
  cropperFrame.style.setProperty("--crop-frame-width", String(preset.width));
  cropperFrame.style.setProperty("--crop-frame-height", String(preset.height));

  if (cropperCopy) {
    cropperCopy.textContent = preset.copy;
  }
}

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

function syncComponentPicker() {
  if (!widgetPicker) {
    return;
  }

  widgetPicker.querySelectorAll("[data-component-choice]").forEach((button) => {
    const choice = button.dataset.componentChoice;
    const isEnabled = choice === "quick_links" ? state.showQuickLinks : state.showRecent;
    button.classList.toggle("is-active", isEnabled);
    button.setAttribute("aria-pressed", String(isEnabled));
  });
}

function toggleComponentVisibility(componentId) {
  if (componentId === "quick_links") {
    stateStore.toggle("showQuickLinks");
  } else if (componentId === "recent_panel") {
    stateStore.toggle("showRecent");
  } else {
    return;
  }

  applyState();
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

  stateStore.replaceRecent([
    normalizedEntry,
    ...stateStore.read("recent").filter((item) => item.url !== normalizedEntry.url)
  ]);
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

function syncViewportHeight() {
  const viewportHeight = Math.round(window.innerHeight || document.documentElement.clientHeight || 0);
  if (viewportHeight > 0) {
    document.documentElement.style.setProperty("--viewport-height", `${viewportHeight}px`);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mixRgb(colorA, colorB, amount) {
  return {
    r: Math.round(colorA.r + (colorB.r - colorA.r) * amount),
    g: Math.round(colorA.g + (colorB.g - colorA.g) * amount),
    b: Math.round(colorA.b + (colorB.b - colorA.b) * amount)
  };
}

function rgbToCss(color, alpha = 1) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha.toFixed(3)})`;
}

function getRelativeLuminance(color) {
  const linearize = (channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  const red = linearize(color.r);
  const green = linearize(color.g);
  const blue = linearize(color.b);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getColorSaturation(color) {
  const red = color.r / 255;
  const green = color.g / 255;
  const blue = color.b / 255;
  const maxValue = Math.max(red, green, blue);
  const minValue = Math.min(red, green, blue);

  if (maxValue === 0) {
    return 0;
  }

  return (maxValue - minValue) / maxValue;
}

function sampleImageRegion(context, width, height, region) {
  const x = clamp(Math.floor(region.x * width), 0, width - 1);
  const y = clamp(Math.floor(region.y * height), 0, height - 1);
  const sampleWidth = clamp(Math.floor(region.width * width), 1, width - x);
  const sampleHeight = clamp(Math.floor(region.height * height), 1, height - y);
  const data = context.getImageData(x, y, sampleWidth, sampleHeight).data;

  let red = 0;
  let green = 0;
  let blue = 0;
  let luminance = 0;
  let saturation = 0;
  let count = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 16) {
      continue;
    }

    const color = {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2]
    };

    red += color.r;
    green += color.g;
    blue += color.b;
    luminance += getRelativeLuminance(color);
    saturation += getColorSaturation(color);
    count += 1;
  }

  if (!count) {
    return {
      rgb: { r: 255, g: 255, b: 255 },
      luminance: 1,
      saturation: 0
    };
  }

  return {
    rgb: {
      r: Math.round(red / count),
      g: Math.round(green / count),
      b: Math.round(blue / count)
    },
    luminance: luminance / count,
    saturation: saturation / count
  };
}

function clearAdaptiveDayAppearance() {
  ADAPTIVE_DAY_VARS.forEach((variable) => {
    body.style.removeProperty(variable);
  });
  adaptiveDayAppearanceKey = "";
}

function applyAdaptiveDayAppearance(palette) {
  Object.entries(palette).forEach(([variable, value]) => {
    body.style.setProperty(variable, value);
  });
}

function buildAdaptiveDayPalette(image) {
  const sampleCanvas = document.createElement("canvas");
  const sampleSize = 96;
  sampleCanvas.width = sampleSize;
  sampleCanvas.height = sampleSize;

  const context = sampleCanvas.getContext("2d", { alpha: false, willReadFrequently: true });
  context.drawImage(image, 0, 0, sampleSize, sampleSize);

  const heroSample = sampleImageRegion(context, sampleSize, sampleSize, ADAPTIVE_DAY_SAMPLE_ZONES.hero);
  const panelSample = sampleImageRegion(context, sampleSize, sampleSize, ADAPTIVE_DAY_SAMPLE_ZONES.panel);
  const overallSample = sampleImageRegion(context, sampleSize, sampleSize, ADAPTIVE_DAY_SAMPLE_ZONES.overall);

  const isTransparentStyle = state.style === "transparent";
  const paperWhite = { r: 248, g: 250, b: 255 };
  const clearWhite = { r: 255, g: 255, b: 255 };
  const deepInk = { r: 35, g: 43, b: 57 };
  const mediumInk = { r: 82, g: 92, b: 110 };
  const softInk = { r: 114, g: 123, b: 140 };
  const placeholderInk = { r: 126, g: 136, b: 152 };

  const heroNeedsDarkText = heroSample.luminance > 0.46;
  const accentTint = mixRgb(overallSample.rgb, paperWhite, 0.86);
  const accentGlow = mixRgb(panelSample.rgb, clearWhite, 0.82);
  const liquidEdge = mixRgb(heroSample.rgb, clearWhite, 0.84);
  const frostedTop = mixRgb(panelSample.rgb, paperWhite, 0.94);
  const frostedBottom = mixRgb(panelSample.rgb, paperWhite, 0.88);

  const topAlphaBase = isTransparentStyle ? 0.26 : 0.4;
  const bottomAlphaBase = isTransparentStyle ? 0.12 : 0.18;
  const tintAlphaBase = isTransparentStyle ? 0.14 : 0.2;
  const brightnessBoost = overallSample.luminance > 0.68 ? 0.04 : overallSample.luminance < 0.28 ? -0.02 : 0;
  const saturationBoost = overallSample.saturation > 0.42 ? 0.02 : 0;

  const topAlpha = clamp(topAlphaBase + brightnessBoost, isTransparentStyle ? 0.2 : 0.32, isTransparentStyle ? 0.34 : 0.5);
  const bottomAlpha = clamp(bottomAlphaBase + brightnessBoost * 0.45, isTransparentStyle ? 0.08 : 0.12, isTransparentStyle ? 0.18 : 0.24);
  const tintAlpha = clamp(tintAlphaBase + brightnessBoost * 0.5 + saturationBoost, isTransparentStyle ? 0.1 : 0.14, isTransparentStyle ? 0.2 : 0.26);
  const borderAlpha = clamp(0.34 + brightnessBoost * 0.7 + saturationBoost * 0.4, 0.28, 0.54);
  const buttonFillAlpha = clamp((isTransparentStyle ? 0.14 : 0.18) + brightnessBoost * 0.35, 0.12, 0.24);

  return {
    "--adaptive-hero-text-primary": heroNeedsDarkText ? rgbToCss(mixRgb(heroSample.rgb, deepInk, 0.88), 0.96) : "rgba(255, 255, 255, 0.98)",
    "--adaptive-hero-text-secondary": heroNeedsDarkText ? rgbToCss(mixRgb(heroSample.rgb, mediumInk, 0.84), 0.88) : "rgba(246, 248, 252, 0.88)",
    "--adaptive-hero-eyebrow-color": heroNeedsDarkText ? rgbToCss(mixRgb(heroSample.rgb, softInk, 0.82), 0.78) : "rgba(255, 245, 232, 0.74)",
    "--adaptive-control-text-primary": rgbToCss(mixRgb(panelSample.rgb, deepInk, 0.94), 0.96),
    "--adaptive-control-text-secondary": rgbToCss(mixRgb(panelSample.rgb, mediumInk, 0.9), 0.88),
    "--adaptive-control-text-muted": rgbToCss(mixRgb(panelSample.rgb, softInk, 0.9), 0.76),
    "--adaptive-recent-eyebrow-color": rgbToCss(mixRgb(panelSample.rgb, mediumInk, 0.82), 0.66),
    "--adaptive-search-placeholder": rgbToCss(mixRgb(panelSample.rgb, placeholderInk, 0.88), 0.82),
    "--adaptive-surface-border": rgbToCss(clearWhite, borderAlpha),
    "--adaptive-surface-shadow": isTransparentStyle ? "0 16px 30px rgba(17, 22, 33, 0.06), 0 6px 14px rgba(17, 22, 33, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.74)" : "0 22px 44px rgba(17, 22, 33, 0.1), 0 8px 20px rgba(17, 22, 33, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.84), inset 0 -1px 0 rgba(160, 177, 205, 0.16)",
    "--adaptive-surface-bg": `linear-gradient(180deg, ${rgbToCss(frostedTop, topAlpha)}, ${rgbToCss(frostedBottom, bottomAlpha)})`,
    "--adaptive-surface-highlight": `radial-gradient(136% 88% at 14% 0%, ${rgbToCss(accentGlow, isTransparentStyle ? 0.48 : 0.72)}, transparent 44%), radial-gradient(108% 74% at 90% 100%, ${rgbToCss(accentTint, isTransparentStyle ? 0.06 : 0.12)}, transparent 44%), linear-gradient(180deg, rgba(255, 255, 255, ${isTransparentStyle ? "0.46" : "0.78"}), rgba(255, 255, 255, ${isTransparentStyle ? "0.12" : "0.2"}) 40%, rgba(255, 255, 255, 0.03) 74%, ${rgbToCss(accentTint, isTransparentStyle ? 0.06 : 0.12)} 100%)`,
    "--adaptive-surface-stroke": rgbToCss(clearWhite, clamp(borderAlpha - 0.04, 0.24, 0.48)),
    "--adaptive-dock-bg": `linear-gradient(180deg, ${rgbToCss(frostedTop, clamp(topAlpha - 0.03, 0.16, 0.42))}, ${rgbToCss(frostedBottom, clamp(bottomAlpha - 0.02, 0.08, 0.2))})`,
    "--adaptive-dock-shadow": isTransparentStyle ? "0 16px 30px rgba(17, 22, 33, 0.06), 0 6px 14px rgba(17, 22, 33, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.72)" : "0 20px 40px rgba(17, 22, 33, 0.09), 0 8px 20px rgba(17, 22, 33, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.84), inset 0 -1px 0 rgba(160, 177, 205, 0.16)",
    "--adaptive-chip-active-bg": rgbToCss(clearWhite, clamp(buttonFillAlpha + 0.08, 0.18, 0.34)),
    "--adaptive-chip-active-border": rgbToCss(clearWhite, clamp(borderAlpha + 0.02, 0.3, 0.52)),
    "--adaptive-backdrop-saturate": isTransparentStyle ? "1.14" : "1.24",
    "--adaptive-glass-tint": rgbToCss(frostedTop, tintAlpha),
    "--adaptive-glass-overlay": `radial-gradient(136% 88% at 14% 0%, ${rgbToCss(accentGlow, isTransparentStyle ? 0.54 : 0.78)}, transparent 44%), radial-gradient(108% 76% at 90% 100%, ${rgbToCss(accentTint, isTransparentStyle ? 0.08 : 0.14)}, transparent 44%), linear-gradient(180deg, rgba(255, 255, 255, ${isTransparentStyle ? "0.48" : "0.82"}), rgba(255, 255, 255, ${isTransparentStyle ? "0.12" : "0.22"}) 38%, rgba(255, 255, 255, 0.03) 72%, ${rgbToCss(accentTint, isTransparentStyle ? 0.06 : 0.12)} 100%)`,
    "--adaptive-glass-overlay-border": rgbToCss(clearWhite, borderAlpha),
    "--adaptive-glass-edge-shine": `radial-gradient(136% 74% at 50% -18%, ${rgbToCss(liquidEdge, isTransparentStyle ? 0.6 : 0.88)}, transparent 48%), linear-gradient(180deg, rgba(255, 255, 255, ${isTransparentStyle ? "0.22" : "0.4"}), rgba(255, 255, 255, 0.06) 30%, rgba(255, 255, 255, 0.02) 56%, ${rgbToCss(accentTint, isTransparentStyle ? 0.06 : 0.14)} 100%)`,
    "--adaptive-glass-shadow": isTransparentStyle ? "0 18px 34px rgba(17, 22, 33, 0.06), 0 6px 14px rgba(17, 22, 33, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.72)" : "0 26px 48px rgba(17, 22, 33, 0.1), 0 10px 22px rgba(17, 22, 33, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.88), inset 0 -1px 0 rgba(165, 182, 214, 0.18)",
    "--adaptive-glass-button-fill": rgbToCss(clearWhite, buttonFillAlpha),
    "--adaptive-glass-button-border": rgbToCss(clearWhite, clamp(borderAlpha - 0.1, 0.2, 0.38)),
    "--adaptive-wordmark-shadow": heroNeedsDarkText ? "0 6px 18px rgba(255, 255, 255, 0.38)" : "0 10px 28px rgba(0, 0, 0, 0.24)",
    "--adaptive-subtitle-shadow": heroNeedsDarkText ? "0 2px 10px rgba(255, 255, 255, 0.3)" : "0 4px 16px rgba(0, 0, 0, 0.2)"
  };
}

function syncAdaptiveDayAppearance() {
  if (!state.wallpaper) {
    adaptiveDayAppearanceToken += 1;
    clearAdaptiveDayAppearance();
    return;
  }

  const nextKey = `${state.style}:${state.wallpaper.length}:${state.wallpaper.slice(0, 48)}`;
  if (adaptiveDayAppearanceKey === nextKey) {
    return;
  }

  adaptiveDayAppearanceToken += 1;
  const token = adaptiveDayAppearanceToken;

  loadImage(state.wallpaper)
    .then((image) => {
      if (token !== adaptiveDayAppearanceToken) {
        return;
      }

      applyAdaptiveDayAppearance(buildAdaptiveDayPalette(image));
      adaptiveDayAppearanceKey = nextKey;
    })
    .catch((error) => {
      if (token !== adaptiveDayAppearanceToken) {
        return;
      }

      console.warn("Adaptive wallpaper analysis failed.", error);
      clearAdaptiveDayAppearance();
    });
}

function resolveLayoutMode() {
  return window.innerWidth >= 980 ? "desktop" : "mobile";
}

function syncLayoutMode() {
  body.dataset.layout = resolveLayoutMode();
}

function isDesktopLayout() {
  return body.dataset.layout === "desktop";
}

function shouldUseAdvancedGlass() {
  return isDesktopLayout();
}

function hasSensorSupport() {
  return typeof window.DeviceOrientationEvent !== "undefined" || typeof window.DeviceMotionEvent !== "undefined";
}

function hasActiveOverlay() {
  return !tabsSheet.hidden || !settingsSheet.hidden || !cropper.hidden;
}

function syncParallaxControls() {
  if (!parallaxEnable || !parallaxStatus) {
    return;
  }

  if (isDesktopLayout()) {
    parallaxEnable.disabled = false;
    parallaxEnable.textContent = "重置桌面景深";
    parallaxStatus.textContent = "电脑端默认使用鼠标景深，不需要传感器授权。";
    return;
  }

  if (!hasSensorSupport()) {
    parallaxEnable.disabled = true;
    parallaxEnable.textContent = "当前不可用";
    parallaxStatus.textContent = "当前浏览器不支持运动传感器，所以没法启用重力景深。";
    return;
  }

  parallaxEnable.disabled = false;

  if (state.reduceMotion) {
    parallaxEnable.textContent = "启用景深";
    parallaxStatus.textContent = "当前已开启“降低动态效果”。点一下会先关闭它，再请求运动与方向权限。";
    return;
  }

  if (parallaxState.status === "pending") {
    parallaxEnable.textContent = "正在请求权限...";
    parallaxStatus.textContent = "等系统权限弹窗出现并点允许，然后回到首页轻轻倾斜手机。";
    return;
  }

  if (parallaxState.orientationAttached || parallaxState.motionAttached) {
    parallaxEnable.textContent = "重新校准景深";
    parallaxStatus.textContent = "景深已启用。点一下可以重置基准，然后回到首页轻轻倾斜手机试试。";
    return;
  }

  if (parallaxState.status === "denied") {
    parallaxEnable.textContent = "重新请求权限";
    parallaxStatus.textContent = "刚才没有拿到权限。再点一次试试；如果仍然没弹窗，请检查系统里 Safari 的“运动与方向访问”。";
    return;
  }

  parallaxEnable.textContent = "启用景深";
  parallaxStatus.textContent = "点一下这里，系统会请求运动与方向访问权限。";
}

function canUseParallax() {
  return !state.reduceMotion && !hasActiveOverlay() && document.visibilityState !== "hidden";
}

function writeParallaxVars(x, y) {
  body.style.setProperty("--depth-bg-x", `${(x * 14).toFixed(2)}px`);
  body.style.setProperty("--depth-bg-y", `${(y * 12).toFixed(2)}px`);
  body.style.setProperty("--depth-hero-x", `${(x * -4.8).toFixed(2)}px`);
  body.style.setProperty("--depth-hero-y", `${(y * -4.2).toFixed(2)}px`);
  body.style.setProperty("--depth-panel-x", `${(x * -3.2).toFixed(2)}px`);
  body.style.setProperty("--depth-panel-y", `${(y * -2.8).toFixed(2)}px`);
  body.style.setProperty("--depth-dock-x", `${(x * -2.1).toFixed(2)}px`);
  body.style.setProperty("--depth-dock-y", `${(y * -1.8).toFixed(2)}px`);
}

function queueParallaxFrame() {
  if (parallaxFrame) {
    return;
  }

  parallaxFrame = requestAnimationFrame(stepParallax);
}

function stepParallax() {
  parallaxFrame = 0;

  if (!canUseParallax()) {
    parallaxState.targetX = 0;
    parallaxState.targetY = 0;
  }

  const easing = canUseParallax() ? 0.14 : 0.2;
  parallaxState.currentX += (parallaxState.targetX - parallaxState.currentX) * easing;
  parallaxState.currentY += (parallaxState.targetY - parallaxState.currentY) * easing;

  if (Math.abs(parallaxState.targetX - parallaxState.currentX) < 0.002) {
    parallaxState.currentX = parallaxState.targetX;
  }

  if (Math.abs(parallaxState.targetY - parallaxState.currentY) < 0.002) {
    parallaxState.currentY = parallaxState.targetY;
  }

  writeParallaxVars(parallaxState.currentX, parallaxState.currentY);

  if (
    Math.abs(parallaxState.targetX - parallaxState.currentX) > 0.001 ||
    Math.abs(parallaxState.targetY - parallaxState.currentY) > 0.001 ||
    Math.abs(parallaxState.currentX) > 0.001 ||
    Math.abs(parallaxState.currentY) > 0.001
  ) {
    queueParallaxFrame();
  }
}

function setParallaxTarget(x, y) {
  if (!canUseParallax()) {
    return;
  }

  parallaxState.targetX = clamp(x, -1, 1);
  parallaxState.targetY = clamp(y, -1, 1);
  queueParallaxFrame();
}

function resetParallaxTarget() {
  parallaxState.targetX = 0;
  parallaxState.targetY = 0;
  queueParallaxFrame();
}

function resetParallaxBaseline() {
  parallaxState.baseBeta = null;
  parallaxState.baseGamma = null;
  parallaxState.baseMotionX = null;
  parallaxState.baseMotionY = null;
  parallaxState.sensorSource = "";
  syncParallaxControls();
}

function handlePointerParallax(event) {
  if (parallaxState.deviceActive || !canUseParallax() || !isDesktopLayout()) {
    return;
  }

  const width = window.innerWidth || 1;
  const height = window.innerHeight || 1;
  const x = ((event.clientX / width) * 2 - 1) * 0.72;
  const y = ((event.clientY / height) * 2 - 1) * 0.72;
  setParallaxTarget(x, y);
}

function attachPointerParallax() {
  if (parallaxState.pointerAttached) {
    return;
  }

  parallaxState.pointerAttached = true;
  window.addEventListener("mousemove", handlePointerParallax, { passive: true });
  window.addEventListener("mouseout", (event) => {
    if (!event.relatedTarget && !parallaxState.deviceActive) {
      resetParallaxTarget();
    }
  }, { passive: true });
}

function handleDeviceOrientation(event) {
  if (!canUseParallax() || isDesktopLayout()) {
    return;
  }

  if (typeof event.beta !== "number" || typeof event.gamma !== "number") {
    return;
  }

  if (parallaxState.baseBeta === null || parallaxState.baseGamma === null) {
    parallaxState.baseBeta = event.beta;
    parallaxState.baseGamma = event.gamma;
  }

  parallaxState.deviceActive = true;
  parallaxState.sensorSource = "orientation";
  const x = clamp((event.gamma - parallaxState.baseGamma) / 18, -1, 1);
  const y = clamp((event.beta - parallaxState.baseBeta) / 22, -1, 1);
  setParallaxTarget(x, y);
}

function attachDeviceOrientation() {
  if (parallaxState.orientationAttached || typeof window.DeviceOrientationEvent === "undefined") {
    return;
  }

  window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });
  parallaxState.orientationAttached = true;
  parallaxState.status = "granted";
  syncParallaxControls();
}

function handleDeviceMotion(event) {
  if (!canUseParallax() || isDesktopLayout() || parallaxState.sensorSource === "orientation") {
    return;
  }

  const acceleration = event.accelerationIncludingGravity || event.acceleration;
  if (!acceleration || typeof acceleration.x !== "number" || typeof acceleration.y !== "number") {
    return;
  }

  if (parallaxState.baseMotionX === null || parallaxState.baseMotionY === null) {
    parallaxState.baseMotionX = acceleration.x;
    parallaxState.baseMotionY = acceleration.y;
  }

  parallaxState.deviceActive = true;
  parallaxState.sensorSource = "motion";
  const x = clamp((acceleration.x - parallaxState.baseMotionX) / 3.2, -1, 1);
  const y = clamp((acceleration.y - parallaxState.baseMotionY) / 4.2, -1, 1);
  setParallaxTarget(x, y);
}

function attachDeviceMotion() {
  if (parallaxState.motionAttached || typeof window.DeviceMotionEvent === "undefined") {
    return;
  }

  window.addEventListener("devicemotion", handleDeviceMotion, { passive: true });
  parallaxState.motionAttached = true;
  parallaxState.status = "granted";
  syncParallaxControls();
}

function getPermissionRequester(eventType) {
  const constructor = eventType === "motion" ? window.DeviceMotionEvent : window.DeviceOrientationEvent;
  if (!constructor || typeof constructor.requestPermission !== "function") {
    return null;
  }

  return () => constructor.requestPermission();
}

function requestMotionPermission(force = false) {
  if ((parallaxState.permissionRequested && !force) || !hasSensorSupport()) {
    return Promise.resolve(false);
  }

  parallaxState.permissionRequested = true;
  parallaxState.status = "pending";
  syncParallaxControls();
  const requestMotion = getPermissionRequester("motion");
  const requestOrientation = getPermissionRequester("orientation");

  if (!requestMotion && !requestOrientation) {
    attachDeviceMotion();
    attachDeviceOrientation();
    parallaxState.permissionRequested = false;
    parallaxState.status = "granted";
    syncParallaxControls();
    return Promise.resolve(true);
  }

  return Promise.allSettled([
    requestMotion ? requestMotion() : Promise.resolve("granted"),
    requestOrientation ? requestOrientation() : Promise.resolve("granted")
  ])
    .then(([motionResult, orientationResult]) => {
      const motionGranted = motionResult.status === "fulfilled" && motionResult.value === "granted";
      const orientationGranted = orientationResult.status === "fulfilled" && orientationResult.value === "granted";

      if (motionGranted || !requestMotion) {
        attachDeviceMotion();
      }

      if (orientationGranted || !requestOrientation) {
        attachDeviceOrientation();
      }

      parallaxState.permissionRequested = false;

      if (parallaxState.motionAttached || parallaxState.orientationAttached) {
        parallaxState.status = "granted";
        syncParallaxControls();
        return true;
      }

      parallaxState.status = "denied";
      syncParallaxControls();
      return false;
    })
    .catch((error) => {
      parallaxState.permissionRequested = false;
      parallaxState.status = "denied";
      syncParallaxControls();
      console.warn("Motion permission request failed.", error);
      return false;
    });
}

function primeMotionPermission() {
  if (
    isDesktopLayout() ||
    parallaxState.primerAttached ||
    parallaxState.permissionRequested ||
    (parallaxState.orientationAttached && parallaxState.motionAttached) ||
    !hasSensorSupport()
  ) {
    return;
  }

  if (!getPermissionRequester("motion") && !getPermissionRequester("orientation")) {
    attachDeviceMotion();
    attachDeviceOrientation();
    return;
  }

  const request = () => {
    if (typeof parallaxState.primerCleanup === "function") {
      parallaxState.primerCleanup();
      parallaxState.primerCleanup = null;
    }

    parallaxState.primerAttached = false;

    if (!canUseParallax()) {
      primeMotionPermission();
      return;
    }

    requestMotionPermission();
  };

  parallaxState.primerAttached = true;
  parallaxState.primerCleanup = () => {
    window.removeEventListener("pointerdown", request);
    window.removeEventListener("touchstart", request);
    window.removeEventListener("pointerup", request);
    window.removeEventListener("touchend", request);
    window.removeEventListener("click", request);
  };

  window.addEventListener("pointerdown", request, { passive: true });
  window.addEventListener("touchstart", request, { passive: true });
  window.addEventListener("pointerup", request, { passive: true });
  window.addEventListener("touchend", request, { passive: true });
  window.addEventListener("click", request, { passive: true });
}

function syncParallax() {
  attachPointerParallax();

  if (!isDesktopLayout()) {
    primeMotionPermission();
  } else {
    parallaxState.deviceActive = false;
    resetParallaxBaseline();
  }

  if (!canUseParallax()) {
    resetParallaxTarget();
    syncParallaxControls();
    return;
  }

  syncParallaxControls();
  queueParallaxFrame();
}

function resolveTheme() {
  if (state.themeMode === "system") {
    return systemThemeQuery && systemThemeQuery.matches ? "night" : "day";
  }

  return state.themeMode;
}

function shouldUseGlassEffects() {
  return resolveTheme() !== "night";
}

function syncThemeColor() {
  if (!themeColorMeta) {
    return;
  }

  themeColorMeta.setAttribute("content", body.dataset.theme === "day" ? "#f5f8fc" : "#1f1f21");
}

function applyState() {
  syncLayoutMode();
  body.dataset.themeMode = state.themeMode;
  body.dataset.theme = resolveTheme();
  body.dataset.browserMode = state.browserMode;
  body.dataset.style = state.style;
  body.classList.toggle("night-solid-mode", !shouldUseGlassEffects());
  body.classList.toggle("is-reduced-motion", state.reduceMotion);
  motionToggle.checked = state.reduceMotion;

  if (quickGrid) {
    quickGrid.hidden = !state.showQuickLinks;
  }

  if (recentShell) {
    recentShell.hidden = !state.showRecent;
  }

  document.querySelectorAll("[data-theme-mode-choice]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeModeChoice === state.themeMode);
  });

  document.querySelectorAll("[data-browser-mode-choice]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.browserModeChoice === state.browserMode);
  });

  document.querySelectorAll("[data-style-choice]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.styleChoice === state.style);
  });

  document.querySelectorAll("[data-engine-choice]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.engineChoice === state.engine);
  });

  syncComponentPicker();
  syncThemeColor();
  syncAdaptiveDayAppearance();
  syncCropperPreset();
  syncCropLayout(true);
  syncWallpaperControls();
  syncLiquidGlass();
  syncParallax();
  syncParallaxControls();
}

function getTrueGlassControls() {
  const theme = resolveTheme();
  const isTransparent = state.style === "transparent";

  if (theme === "day") {
    return {
      blurRadius: isTransparent ? 6.4 : 7.4,
      edgeIntensity: isTransparent ? 0.012 : 0.015,
      rimIntensity: isTransparent ? 0.055 : 0.075,
      baseIntensity: isTransparent ? 0.004 : 0.006,
      edgeDistance: 0.14,
      rimDistance: 0.92,
      baseDistance: 0.1,
      cornerBoost: isTransparent ? 0.012 : 0.016,
      rippleEffect: isTransparent ? 0.02 : 0.03
    };
  }

  return {
    blurRadius: isTransparent ? 6.6 : 7.8,
    edgeIntensity: isTransparent ? 0.011 : 0.014,
    rimIntensity: isTransparent ? 0.054 : 0.072,
    baseIntensity: isTransparent ? 0.0035 : 0.0048,
    edgeDistance: 0.13,
    rimDistance: 0.88,
    baseDistance: 0.1,
    cornerBoost: isTransparent ? 0.014 : 0.02,
    rippleEffect: isTransparent ? 0.018 : 0.028
  };
}

function getTrueGlassTintOpacity(role = "secondary") {
  const theme = resolveTheme();
  const isTransparent = state.style === "transparent";

  if (theme === "day") {
    if (role === "primary") {
      return isTransparent ? 0.12 : 0.17;
    }

    return isTransparent ? 0.09 : 0.13;
  }

  if (role === "primary") {
    return isTransparent ? 0.045 : 0.068;
  }

  return isTransparent ? 0.03 : 0.045;
}

function getTrueGlassTypeForElement(element) {
  if (element.classList.contains("hero-tool")) {
    return "pill";
  }

  return "rounded";
}

function canUseTrueGlass() {
  if (!shouldUseAdvancedGlass()) {
    return false;
  }

  if (typeof window.Container !== "function" || typeof window.html2canvas !== "function") {
    return false;
  }

  const testCanvas = document.createElement("canvas");
  return Boolean(
    testCanvas.getContext("webgl") ||
    testCanvas.getContext("experimental-webgl")
  );
}

function getTrueGlassRoleForElement(element) {
  return element.classList.contains("search-shell") || element.classList.contains("dock-shell")
    ? "primary"
    : "secondary";
}

function applyTrueGlassUniforms(container) {
  if (!container || !container.gl_refs || !container.gl_refs.gl) {
    return;
  }

  const controls = window.glassControls || getTrueGlassControls();
  const gl = container.gl_refs.gl;

  if (container.gl_refs.blurRadiusLoc) {
    gl.uniform1f(container.gl_refs.blurRadiusLoc, controls.blurRadius);
  }

  if (container.gl_refs.edgeIntensityLoc) {
    gl.uniform1f(container.gl_refs.edgeIntensityLoc, controls.edgeIntensity);
  }

  if (container.gl_refs.rimIntensityLoc) {
    gl.uniform1f(container.gl_refs.rimIntensityLoc, controls.rimIntensity);
  }

  if (container.gl_refs.baseIntensityLoc) {
    gl.uniform1f(container.gl_refs.baseIntensityLoc, controls.baseIntensity);
  }

  if (container.gl_refs.edgeDistanceLoc) {
    gl.uniform1f(container.gl_refs.edgeDistanceLoc, controls.edgeDistance);
  }

  if (container.gl_refs.rimDistanceLoc) {
    gl.uniform1f(container.gl_refs.rimDistanceLoc, controls.rimDistance);
  }

  if (container.gl_refs.baseDistanceLoc) {
    gl.uniform1f(container.gl_refs.baseDistanceLoc, controls.baseDistance);
  }

  if (container.gl_refs.cornerBoostLoc) {
    gl.uniform1f(container.gl_refs.cornerBoostLoc, controls.cornerBoost);
  }

  if (container.gl_refs.rippleEffectLoc) {
    gl.uniform1f(container.gl_refs.rippleEffectLoc, controls.rippleEffect);
  }

  if (container.gl_refs.tintOpacityLoc) {
    gl.uniform1f(container.gl_refs.tintOpacityLoc, container.tintOpacity);
  }

  if (typeof container.render === "function") {
    container.render();
  }
}

function startTrueGlassRealtimeLoop() {
  if (trueGlassRealtimeFrame) {
    cancelAnimationFrame(trueGlassRealtimeFrame);
  }

  const roundMetric = (value) => Math.round(value * 2) / 2;

  const tick = () => {
    if (!trueGlassReady) {
      trueGlassRealtimeFrame = 0;
      return;
    }

    if (!shouldUseGlassEffects() || !shouldUseAdvancedGlass()) {
      trueGlassRealtimeFrame = requestAnimationFrame(tick);
      return;
    }

    if (document.visibilityState !== "hidden") {
      trueGlassContainers.forEach((container) => {
        if (!container || typeof container.render !== "function" || !container.element) {
          return;
        }

        if (container.element.dataset.trueGlassRole !== "primary") {
          return;
        }

        const rect = container.element.getBoundingClientRect();
        const visualViewport = window.visualViewport;
        const signature = [
          roundMetric(rect.top),
          roundMetric(rect.left),
          roundMetric(rect.width),
          roundMetric(rect.height),
          roundMetric(window.innerWidth),
          roundMetric(window.innerHeight),
          roundMetric(visualViewport ? visualViewport.offsetTop : 0),
          roundMetric(visualViewport ? visualViewport.offsetLeft : 0),
          roundMetric(visualViewport ? visualViewport.width : 0),
          roundMetric(visualViewport ? visualViewport.height : 0)
        ].join(":");

        if (container.lastRealtimeSignature !== signature) {
          container.lastRealtimeSignature = signature;
          container.render();
        }
      });
    }

    trueGlassRealtimeFrame = requestAnimationFrame(tick);
  };

  trueGlassRealtimeFrame = requestAnimationFrame(tick);
}

function initTrueGlassForElement(element) {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const computedStyle = window.getComputedStyle(element);
  const borderRadius = parseFloat(computedStyle.borderTopLeftRadius) || 24;
  const role = getTrueGlassRoleForElement(element);
  const type = getTrueGlassTypeForElement(element);

  element.classList.add("glass-container", "true-glass-host");
  element.dataset.trueGlassRole = role;

  if (computedStyle.position === "static") {
    element.style.position = "relative";
  }

  const container = new window.Container({
    borderRadius,
    type,
    tintOpacity: getTrueGlassTintOpacity(role),
    useViewportTexture: true
  });
  const detachedHost = container.element;
  const canvas = container.canvas;

  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }

  if (canvas) {
    canvas.classList.add("true-glass-canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.boxShadow = "none";
    element.insertBefore(canvas, element.firstChild);
  }

  container.element = element;

  if (detachedHost && detachedHost.isConnected) {
    detachedHost.remove();
  }

  requestAnimationFrame(() => {
    container.updateSizeFromDOM();
    applyTrueGlassUniforms(container);
  });

  return container;
}

function syncTrueGlass() {
  if (!trueGlassReady || !shouldUseGlassEffects() || !shouldUseAdvancedGlass()) {
    return;
  }

  window.glassControls = getTrueGlassControls();

  trueGlassContainers.forEach((container) => {
    if (!container || !container.element) {
      return;
    }

    container.tintOpacity = getTrueGlassTintOpacity(container.element.dataset.trueGlassRole || "secondary");
    container.updateSizeFromDOM();
    applyTrueGlassUniforms(container);
  });
}

async function captureTrueGlassSnapshot() {
  if (
    !trueGlassReady ||
    trueGlassSnapshotPending ||
    typeof window.html2canvas !== "function" ||
    !shouldUseGlassEffects() ||
    !shouldUseAdvancedGlass()
  ) {
    return;
  }

  trueGlassSnapshotPending = true;

  try {
    const snapshotTarget = getTrueGlassSnapshotTarget();
    const snapshotOptions = {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      ignoreElements(element) {
        return Boolean(
          element.classList &&
          (
            element.classList.contains("glass-container") ||
            element.classList.contains("glass-button") ||
            element.classList.contains("glass-button-text")
          )
        );
      }
    };

    if (snapshotTarget !== document.body) {
      snapshotOptions.width = snapshotTarget.clientWidth || window.innerWidth;
      snapshotOptions.height = snapshotTarget.clientHeight || window.innerHeight;
      snapshotOptions.windowWidth = window.innerWidth;
      snapshotOptions.windowHeight = window.innerHeight;
      snapshotOptions.scrollX = 0;
      snapshotOptions.scrollY = 0;
    }

    const snapshot = await window.html2canvas(snapshotTarget, snapshotOptions);
    const image = await loadImage(snapshot.toDataURL("image/png"));

    window.glassSnapshotTarget = snapshotTarget;
    window.Container.pageSnapshot = snapshot;

    trueGlassContainers.forEach((container) => {
      if (!container || !container.gl_refs || !container.gl_refs.gl || !container.gl_refs.texture) {
        return;
      }

      const gl = container.gl_refs.gl;
      gl.bindTexture(gl.TEXTURE_2D, container.gl_refs.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      if (container.gl_refs.textureSizeLoc) {
        gl.uniform2f(container.gl_refs.textureSizeLoc, image.width, image.height);
      }

      applyTrueGlassUniforms(container);
    });
  } catch (error) {
    console.warn("True glass snapshot refresh failed.", error);
  } finally {
    trueGlassSnapshotPending = false;
  }
}

function refreshTrueGlassSnapshot() {
  if (!trueGlassReady || !shouldUseGlassEffects() || !shouldUseAdvancedGlass()) {
    return;
  }

  if (trueGlassSnapshotFrame) {
    cancelAnimationFrame(trueGlassSnapshotFrame);
  }

  trueGlassSnapshotFrame = requestAnimationFrame(() => {
    trueGlassSnapshotFrame = requestAnimationFrame(() => {
      captureTrueGlassSnapshot();
    });
  });
}

function initTrueGlass() {
  if (trueGlassReady || !canUseTrueGlass() || !shouldUseGlassEffects()) {
    return false;
  }

  window.glassSnapshotTarget = getTrueGlassSnapshotTarget();
  window.glassControls = getTrueGlassControls();
  trueGlassContainers = Array.from(document.querySelectorAll(TRUE_GLASS_HOST_SELECTOR))
    .map((element) => initTrueGlassForElement(element))
    .filter(Boolean);

  trueGlassReady = trueGlassContainers.length > 0;

  if (!trueGlassReady) {
    return false;
  }

  body.classList.add("true-glass-enabled");

  requestAnimationFrame(() => {
    syncTrueGlass();
    refreshTrueGlassSnapshot();
    startTrueGlassRealtimeLoop();
  });

  return true;
}

function getLiquidPreset() {
  if (state.style === "transparent") {
    return {
      refraction: 0.002,
      bevelDepth: 0.012,
      bevelWidth: 0.05,
      frost: 0.02,
      shadow: false,
      specular: false,
      magnify: 1.0008
    };
  }

  return {
    refraction: 0.006,
    bevelDepth: 0.018,
    bevelWidth: 0.075,
    frost: 0.08,
    shadow: false,
    specular: !state.reduceMotion,
    magnify: 1.0016
  };
}

function refreshLiquidGlassSnapshot() {
  if (!shouldUseGlassEffects() || !shouldUseAdvancedGlass()) {
    return;
  }

  if (trueGlassReady) {
    refreshTrueGlassSnapshot();
    return;
  }

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
  const glassEnabled = shouldUseGlassEffects();
  const advancedGlassEnabled = glassEnabled && shouldUseAdvancedGlass();
  body.classList.toggle("night-solid-mode", !glassEnabled);
  body.classList.toggle("true-glass-enabled", trueGlassReady && advancedGlassEnabled);
  body.classList.toggle("liquid-gl-enabled", liquidGlassReady && advancedGlassEnabled);

  if (!advancedGlassEnabled) {
    if (trueGlassRealtimeFrame) {
      cancelAnimationFrame(trueGlassRealtimeFrame);
      trueGlassRealtimeFrame = 0;
    }

    if (trueGlassSnapshotFrame) {
      cancelAnimationFrame(trueGlassSnapshotFrame);
      trueGlassSnapshotFrame = 0;
    }

    if (liquidSnapshotFrame) {
      cancelAnimationFrame(liquidSnapshotFrame);
      liquidSnapshotFrame = 0;
    }

    return;
  }

  if (!trueGlassReady && !liquidGlassReady) {
    initLiquidGlass();
    return;
  }

  if (trueGlassReady) {
    if (!trueGlassRealtimeFrame) {
      startTrueGlassRealtimeLoop();
    }
    syncTrueGlass();
    return;
  }

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
  if (!shouldUseGlassEffects() || !shouldUseAdvancedGlass()) {
    return;
  }

  if (initTrueGlass()) {
    return;
  }

  if (liquidGlassReady || typeof window.liquidGL !== "function" || typeof window.html2canvas !== "function") {
    return;
  }

  try {
    const effect = window.liquidGL({
      snapshot: LIQUID_SNAPSHOT_TARGET,
      target: LIQUID_TARGET_SELECTOR,
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
  if (!cropper.hidden) {
    closeCropper();
    setWallpaperMessage("");
  }

  tabsSheet.hidden = true;
  settingsSheet.hidden = true;
  sheetBackdrop.hidden = true;
  syncParallax();
}

function openSheet(sheet) {
  if (sheet !== settingsSheet && !cropper.hidden) {
    closeCropper();
    setWallpaperMessage("");
  }

  tabsSheet.hidden = true;
  settingsSheet.hidden = true;
  sheet.hidden = false;
  sheetBackdrop.hidden = false;
  syncParallax();
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

function closeCropper() {
  if (cropState && cropState.objectUrl) {
    URL.revokeObjectURL(cropState.objectUrl);
  }

  cropState = null;
  cropper.hidden = true;
  cropperImage.removeAttribute("src");
  cropperImage.style.width = "";
  cropperImage.style.height = "";
  cropperImage.style.transform = "";
  cropperSurface.classList.remove("is-dragging");
  cropperZoom.value = "1";
  cropperApply.disabled = false;
  cropperCancel.disabled = false;
  syncParallax();
}

function getCropScale() {
  return cropState ? cropState.baseScale * cropState.zoom : 1;
}

function clampCropOffsets() {
  if (!cropState) {
    return;
  }

  const scale = getCropScale();
  const renderedWidth = cropState.image.naturalWidth * scale;
  const renderedHeight = cropState.image.naturalHeight * scale;
  const limitX = Math.max(0, (renderedWidth - cropState.frameWidth) / 2);
  const limitY = Math.max(0, (renderedHeight - cropState.frameHeight) / 2);

  cropState.offsetX = clamp(cropState.offsetX, -limitX, limitX);
  cropState.offsetY = clamp(cropState.offsetY, -limitY, limitY);
}

function renderCropPreview() {
  if (!cropState) {
    return;
  }

  const scale = getCropScale();
  cropperImage.style.width = `${cropState.image.naturalWidth * scale}px`;
  cropperImage.style.height = `${cropState.image.naturalHeight * scale}px`;
  cropperImage.style.transform = `translate3d(${cropState.offsetX}px, ${cropState.offsetY}px, 0) translate(-50%, -50%)`;
}

function syncCropLayout(preserveOffset = false) {
  if (!cropState || cropper.hidden) {
    return;
  }

  const frameRect = cropperFrame.getBoundingClientRect();
  if (!frameRect.width || !frameRect.height) {
    return;
  }

  const previousScale = getCropScale();
  const previousFrameWidth = cropState.frameWidth || frameRect.width;
  const previousFrameHeight = cropState.frameHeight || frameRect.height;

  cropState.frameWidth = frameRect.width;
  cropState.frameHeight = frameRect.height;
  cropState.baseScale = Math.max(
    cropState.frameWidth / cropState.image.naturalWidth,
    cropState.frameHeight / cropState.image.naturalHeight
  );

  if (preserveOffset && previousScale > 0) {
    const nextScale = getCropScale();
    cropState.offsetX *= cropState.frameWidth / previousFrameWidth;
    cropState.offsetY *= cropState.frameHeight / previousFrameHeight;
    if (nextScale !== previousScale) {
      cropState.offsetX *= nextScale / previousScale;
      cropState.offsetY *= nextScale / previousScale;
    }
  } else {
    cropState.offsetX = 0;
    cropState.offsetY = 0;
  }

  clampCropOffsets();
  renderCropPreview();
}

async function openCropper(file) {
  closeCropper();
  const objectUrl = URL.createObjectURL(file);

  setWallpaperBusy(true);
  setWallpaperMessage("正在准备裁切...");
  openSheet(settingsSheet);

  try {
    const image = await loadImage(objectUrl);

    cropState = {
      objectUrl,
      image,
      zoom: 1,
      baseScale: 1,
      offsetX: 0,
      offsetY: 0,
      frameWidth: 0,
      frameHeight: 0,
      pointerId: null,
      startX: 0,
      startY: 0,
      startOffsetX: 0,
      startOffsetY: 0
    };

    cropperZoom.value = "1";
    cropperImage.src = objectUrl;
    cropper.hidden = false;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        syncCropLayout();
        cropper.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    });

    setWallpaperMessage("拖动并裁切后再确认。");
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  } finally {
    setWallpaperBusy(false);
  }
}

function canvasToSizedWallpaper(canvas, preset) {
  let currentCanvas = canvas;
  let quality = 0.9;
  let attempts = 0;

  while (attempts < 8) {
    const dataUrl = currentCanvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_WALLPAPER_LENGTH) {
      return dataUrl;
    }

    if (quality > 0.62) {
      quality = Math.max(0.62, quality - 0.08);
    } else {
      const nextCanvas = document.createElement("canvas");
      nextCanvas.width = Math.max(720, Math.round(currentCanvas.width * 0.88));
      nextCanvas.height = Math.round(nextCanvas.width * (preset.height / preset.width));
      renderImageToCanvas(nextCanvas, currentCanvas, nextCanvas.width, nextCanvas.height);
      currentCanvas = nextCanvas;
      quality = 0.86;
    }

    attempts += 1;
  }

  throw new Error("这张图还是有点大，换一张更简单的试试。");
}

function exportCroppedWallpaper() {
  if (!cropState) {
    throw new Error("还没有可裁切的图片。");
  }

  const preset = getCropPreset();
  const scale = getCropScale();
  const image = cropState.image;
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  const sourceWidth = Math.min(image.naturalWidth, cropState.frameWidth / scale);
  const sourceHeight = Math.min(image.naturalHeight, cropState.frameHeight / scale);
  const sourceX = clamp(
    ((renderedWidth - cropState.frameWidth) / 2 - cropState.offsetX) / scale,
    0,
    image.naturalWidth - sourceWidth
  );
  const sourceY = clamp(
    ((renderedHeight - cropState.frameHeight) / 2 - cropState.offsetY) / scale,
    0,
    image.naturalHeight - sourceHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;

  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvasToSizedWallpaper(canvas, preset);
}

async function renderWallpaper(dataUrl) {
  if (!dataUrl) {
    wallpaperLayer.style.backgroundImage = "none";
    body.classList.remove("has-custom-wallpaper");
    clearAdaptiveDayAppearance();
    refreshLiquidGlassSnapshot();
    return;
  }

  await loadImage(dataUrl);
  wallpaperLayer.style.backgroundImage = `url("${dataUrl}")`;
  body.classList.add("has-custom-wallpaper");
  adaptiveDayAppearanceKey = "";
  syncAdaptiveDayAppearance();
  refreshLiquidGlassSnapshot();
}

function persistWallpaper(dataUrl) {
  if (!stateStore.persist("wallpaper", dataUrl)) {
    throw new Error("当前浏览器没法保存这张壁纸，请换一张更小的，或检查浏览器存储权限。");
  }
}

async function setWallpaper(dataUrl) {
  persistWallpaper(dataUrl);
  stateStore.write("wallpaper", dataUrl, { persist: false });
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
    stateStore.write("wallpaper", "", { persist: false });
    stateStore.persist("wallpaper", "");
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
    stateStore.write("style", button.dataset.styleChoice);
    applyState();
  });
});

document.querySelectorAll("[data-browser-mode-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    stateStore.write("browserMode", button.dataset.browserModeChoice);
    applyState();
  });
});

document.querySelectorAll("[data-theme-mode-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    stateStore.write("themeMode", button.dataset.themeModeChoice);
    applyState();
  });
});

document.querySelectorAll("[data-engine-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    stateStore.write("engine", button.dataset.engineChoice);
    applyState();
  });
});

document.querySelectorAll("[data-component-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    toggleComponentVisibility(button.dataset.componentChoice);
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

  try {
    await openCropper(file);
  } catch (error) {
    console.warn("Wallpaper upload failed.", error);
    setWallpaperMessage(error.message || "壁纸上传失败，请换一张试试。");
  }
});

cropperCancel.addEventListener("click", () => {
  closeCropper();
  setWallpaperMessage("");
});

cropperZoom.addEventListener("input", () => {
  if (!cropState) {
    return;
  }

  cropState.zoom = Number(cropperZoom.value);
  clampCropOffsets();
  renderCropPreview();
});

function startCropDrag(clientX, clientY, pointerId = null) {
  if (!cropState) {
    return;
  }

  cropState.pointerId = pointerId;
  cropState.startX = clientX;
  cropState.startY = clientY;
  cropState.startOffsetX = cropState.offsetX;
  cropState.startOffsetY = cropState.offsetY;
  cropperSurface.classList.add("is-dragging");
}

function moveCropDrag(clientX, clientY, pointerId = null) {
  if (!cropState) {
    return;
  }

  if (cropState.pointerId !== null && pointerId !== null && cropState.pointerId !== pointerId) {
    return;
  }

  cropState.offsetX = cropState.startOffsetX + (clientX - cropState.startX);
  cropState.offsetY = cropState.startOffsetY + (clientY - cropState.startY);
  clampCropOffsets();
  renderCropPreview();
}

function endCropDrag(pointerId = null) {
  if (!cropState) {
    return;
  }

  if (cropState.pointerId !== null && pointerId !== null && cropState.pointerId !== pointerId) {
    return;
  }

  cropState.pointerId = null;
  cropperSurface.classList.remove("is-dragging");
}

cropperSurface.addEventListener("pointerdown", (event) => {
  startCropDrag(event.clientX, event.clientY, event.pointerId);
  if (typeof cropperSurface.setPointerCapture === "function") {
    cropperSurface.setPointerCapture(event.pointerId);
  }
});

cropperSurface.addEventListener("pointermove", (event) => {
  moveCropDrag(event.clientX, event.clientY, event.pointerId);
});

cropperSurface.addEventListener("pointerup", (event) => {
  endCropDrag(event.pointerId);
  if (typeof cropperSurface.hasPointerCapture === "function" && cropperSurface.hasPointerCapture(event.pointerId)) {
    cropperSurface.releasePointerCapture(event.pointerId);
  }
});

cropperSurface.addEventListener("pointercancel", (event) => {
  endCropDrag(event.pointerId);
});

cropperSurface.addEventListener("touchstart", (event) => {
  if (cropState && cropState.pointerId !== null) {
    return;
  }

  const touch = event.touches[0];
  if (!touch) {
    return;
  }

  event.preventDefault();
  startCropDrag(touch.clientX, touch.clientY);
}, { passive: false });

cropperSurface.addEventListener("touchmove", (event) => {
  if (cropState && cropState.pointerId !== null) {
    return;
  }

  const touch = event.touches[0];
  if (!touch) {
    return;
  }

  event.preventDefault();
  moveCropDrag(touch.clientX, touch.clientY);
}, { passive: false });

cropperSurface.addEventListener("touchend", () => {
  endCropDrag();
}, { passive: false });

cropperSurface.addEventListener("touchcancel", () => {
  endCropDrag();
}, { passive: false });

cropperApply.addEventListener("click", async () => {
  if (!cropState) {
    return;
  }

  setWallpaperBusy(true);
  setWallpaperMessage("正在生成壁纸...");
  cropperApply.disabled = true;
  cropperCancel.disabled = true;

  try {
    const croppedWallpaper = exportCroppedWallpaper();
    closeCropper();
    await setWallpaper(croppedWallpaper);
    setWallpaperMessage("自定义壁纸已更新，只保存在当前浏览器。");
  } catch (error) {
    console.warn("Wallpaper crop failed.", error);
    setWallpaperMessage(error.message || "壁纸裁切失败，请换一张试试。");
    cropperApply.disabled = false;
    cropperCancel.disabled = false;
  } finally {
    setWallpaperBusy(false);
  }
});

document.getElementById("nav-back").addEventListener("click", () => window.history.back());
document.getElementById("nav-forward").addEventListener("click", () => window.history.forward());
document.getElementById("nav-search").addEventListener("click", () => searchInput.focus());
document.getElementById("nav-tabs").addEventListener("click", () => openSheet(tabsSheet));
document.getElementById("nav-menu").addEventListener("click", () => openSheet(settingsSheet));
document.getElementById("chrome-tabs").addEventListener("click", () => openSheet(tabsSheet));
document.getElementById("chrome-settings").addEventListener("click", () => openSheet(settingsSheet));
if (desktopTabs) {
  desktopTabs.addEventListener("click", () => openSheet(tabsSheet));
}
if (desktopSettings) {
  desktopSettings.addEventListener("click", () => openSheet(settingsSheet));
}
if (desktopCustomize) {
  desktopCustomize.addEventListener("click", () => openSheet(settingsSheet));
}
if (parallaxEnable) {
  parallaxEnable.addEventListener("click", async () => {
    if (isDesktopLayout()) {
      parallaxState.deviceActive = false;
      resetParallaxBaseline();
      resetParallaxTarget();
      syncParallax();
      return;
    }

    if (state.reduceMotion) {
      stateStore.write("reduceMotion", false);
      applyState();
    }

    parallaxState.deviceActive = false;
    resetParallaxBaseline();
    resetParallaxTarget();
    await requestMotionPermission(true);
    syncParallax();
  });
}
sheetBackdrop.addEventListener("click", closeSheets);

motionToggle.addEventListener("change", () => {
  stateStore.write("reduceMotion", motionToggle.checked);
  applyState();
});

recentClear.addEventListener("click", () => {
  stateStore.clearRecent();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!cropper.hidden) {
      closeCropper();
      setWallpaperMessage("");
      return;
    }

    closeSheets();
  }
});

function handleViewportResize() {
  syncLayoutMode();
  syncViewportHeight();
  syncCropLayout(true);
  syncLiquidGlass();
  syncParallax();
}

window.addEventListener("resize", handleViewportResize);
window.addEventListener("orientationchange", () => {
  resetParallaxBaseline();
  resetParallaxTarget();
});

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", handleViewportResize);
  window.visualViewport.addEventListener("scroll", handleViewportResize);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    resetParallaxTarget();
    return;
  }

  syncParallax();
});

if (systemThemeQuery) {
  const handleSystemThemeChange = () => {
    if (state.themeMode === "system") {
      applyState();
    }
  };

  if (typeof systemThemeQuery.addEventListener === "function") {
    systemThemeQuery.addEventListener("change", handleSystemThemeChange);
  } else if (typeof systemThemeQuery.addListener === "function") {
    systemThemeQuery.addListener(handleSystemThemeChange);
  }
}

tabBadge.textContent = String(document.querySelectorAll(".quick-card").length).padStart(2, "0");

handleViewportResize();
closeCropper();
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
