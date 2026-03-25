const STORAGE_KEYS = {
  style: "liquid-tab-style",
  engine: "liquid-tab-engine",
  reduceMotion: "liquid-tab-reduce-motion"
};

const SEARCH_ENGINES = {
  google: "https://www.google.com/search?q=",
  duck: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q="
};

const state = {
  style: localStorage.getItem(STORAGE_KEYS.style) || "liquid",
  engine: localStorage.getItem(STORAGE_KEYS.engine) || "google",
  reduceMotion: localStorage.getItem(STORAGE_KEYS.reduceMotion) === "true"
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
let liquidLenses = [];
let liquidGlassReady = false;

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
  syncLiquidGlass();
}

function getLiquidPreset() {
  if (state.style === "transparent") {
    return {
      refraction: 0,
      bevelDepth: 0.035,
      bevelWidth: 0.12,
      frost: 0.6,
      shadow: true,
      specular: false,
      magnify: 1
    };
  }

  return {
    refraction: 0,
    bevelDepth: 0.052,
    bevelWidth: 0.211,
    frost: 2,
    shadow: true,
    specular: !state.reduceMotion,
    magnify: 1.01
  };
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
}

function initLiquidGlass() {
  if (liquidGlassReady || typeof window.liquidGL !== "function" || typeof window.html2canvas !== "function") {
    return;
  }

  try {
    const effect = window.liquidGL({
      snapshot: "body",
      target: ".liquid-lens",
      resolution: 1.5,
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
    window.location.href = normalizeUrl(value);
    return;
  }

  const engineUrl = SEARCH_ENGINES[state.engine] || SEARCH_ENGINES.google;
  window.location.href = `${engineUrl}${encodeURIComponent(value)}`;
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSheets();
  }
});

tabBadge.textContent = String(document.querySelectorAll(".quick-card").length).padStart(2, "0");

applyState();

if (document.readyState === "complete") {
  initLiquidGlass();
} else {
  window.addEventListener("load", initLiquidGlass, { once: true });
}
