"use strict";

const MAX_QUERY_LENGTH = 96;
const MAX_ENGINE_SUGGESTIONS = 5;
const MAX_CONTENT_SUGGESTIONS = 4;
const MAX_RESULT_ITEMS = 8;
const REQUEST_TIMEOUT_MS = 1800;

const ENGINE_LABELS = {
  google: "Google",
  duck: "DuckDuckGo",
  bing: "Bing"
};

function normalizeQuery(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH) : "";
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function containsCjk(value) {
  return /[\u3400-\u9fff]/.test(value);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value) {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getEngineLabel(engine) {
  return ENGINE_LABELS[engine] || ENGINE_LABELS.google;
}

function getProviderIcon(provider) {
  return String(provider || "S").trim().charAt(0).toUpperCase() || "S";
}

function isReadableSuggestionText(value, query) {
  const normalizedValue = normalizeQuery(value);
  if (!normalizedValue || normalizedValue.includes("\uFFFD")) {
    return false;
  }

  const normalizedQuery = normalizeQuery(query);
  if (containsCjk(normalizedQuery) && !containsCjk(normalizedValue)) {
    return false;
  }

  return true;
}

function collapseTrailingDoubleConsonant(value) {
  return /([bcdfghjklmnpqrstvwxyz])\1$/i.test(value) ? value.slice(0, -1) : value;
}

function stemEnglishToken(token) {
  const lower = token.toLowerCase();
  const suffixes = [
    "ization",
    "ations",
    "ation",
    "ments",
    "ment",
    "ingly",
    "lessly",
    "ness",
    "less",
    "able",
    "ible",
    "edly",
    "iest",
    "ies",
    "ing",
    "ers",
    "ied",
    "est",
    "er",
    "ed",
    "ly",
    "es",
    "s"
  ];

  if (lower.length <= 3) {
    return lower;
  }

  for (const suffix of suffixes) {
    if (!lower.endsWith(suffix) || lower.length - suffix.length < 3) {
      continue;
    }

    if (suffix === "ies") {
      return `${lower.slice(0, -suffix.length)}y`;
    }

    if (suffix === "ied") {
      return `${lower.slice(0, -suffix.length)}y`;
    }

    if (suffix === "ers" || suffix === "s") {
      return lower.slice(0, -1);
    }

    const stem = lower.slice(0, -suffix.length);
    if (suffix === "es" && lower.endsWith("oes")) {
      return lower.slice(0, -1);
    }

    if (suffix === "ing" || suffix === "edly" || suffix === "ed" || suffix === "er" || suffix === "est") {
      return collapseTrailingDoubleConsonant(stem);
    }

    return stem;
  }

  return lower;
}

function buildQueryRoots(query) {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  const roots = [normalized];
  const normalizedSpaced = normalized.replace(/\s+/g, " ").trim();
  const tokens = normalizedSpaced.split(" ").filter(Boolean);

  if (tokens.length) {
    const lastToken = tokens[tokens.length - 1];
    if (/^[a-z][a-z-]+$/i.test(lastToken)) {
      const head = tokens.slice(0, -1).join(" ");
      const stem = stemEnglishToken(lastToken);

      if (stem && stem !== lastToken.toLowerCase()) {
        roots.push(head ? `${head} ${stem}` : stem);
      }
    }
  }

  const compact = normalizedSpaced.replace(/\s+/g, "");
  if (containsCjk(compact) && compact.length >= 3) {
    roots.push(compact.slice(0, -1));
    if (compact.length >= 4) {
      roots.push(compact.slice(0, -2));
    }
  }

  return unique(roots).slice(0, 4);
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchEngineSuggestions(engine, query) {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  if (engine === "duck") {
    const payload = await fetchJson(`https://duckduckgo.com/ac/?q=${encodeURIComponent(normalized)}&kl=cn-zh`);
    return Array.isArray(payload)
      ? payload.map((entry) => (typeof entry === "string" ? entry : entry?.phrase)).filter((entry) => typeof entry === "string")
      : [];
  }

  if (engine === "bing") {
    const payload = await fetchJson(`https://api.bing.com/osjson.aspx?query=${encodeURIComponent(normalized)}&cc=cn&setlang=zh-Hans`);
    return Array.isArray(payload?.[1]) ? payload[1].filter((entry) => typeof entry === "string") : [];
  }

  const payload = await fetchJson(`https://suggestqueries.google.com/complete/search?client=firefox&hl=zh-CN&q=${encodeURIComponent(normalized)}`);
  return Array.isArray(payload?.[1]) ? payload[1].filter((entry) => typeof entry === "string") : [];
}

async function fetchWikipediaResults(query, locale) {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }

  const payload = await fetchJson(
    `https://${locale}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(normalized)}&utf8=1&format=json&srlimit=${MAX_CONTENT_SUGGESTIONS}`
  );
  const results = Array.isArray(payload?.query?.search) ? payload.query.search : [];

  return results.map((entry) => ({
    title: stripHtml(entry.title),
    description: stripHtml(entry.snippet),
    url: entry.pageid
      ? `https://${locale}.wikipedia.org/?curid=${entry.pageid}`
      : `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(stripHtml(entry.title).replace(/\s+/g, "_"))}`
  }));
}

function createSearchSuggestionItems(values, { provider, query, badge, priority }) {
  const normalizedQuery = normalizeQuery(query).toLowerCase();
  const providerLabel = getEngineLabel(provider);

  return unique(values)
    .filter((value) => isReadableSuggestionText(value, query))
    .slice(0, MAX_ENGINE_SUGGESTIONS)
    .map((value) => {
      const normalizedValue = normalizeQuery(value);
      const lowerValue = normalizedValue.toLowerCase();
      const exact = lowerValue === normalizedQuery;
      const prefix = lowerValue.startsWith(normalizedQuery);

      return {
        label: normalizedValue,
        value: normalizedValue,
        action: "search",
        badge,
        icon: getProviderIcon(providerLabel),
        meta: `${providerLabel} · ${badge}`,
        provider: providerLabel,
        priority: priority + (exact ? 90 : prefix ? 42 : 0)
      };
    });
}

function createRootFallbackItems(roots, engine) {
  const engineLabel = getEngineLabel(engine);

  return roots.slice(1).map((root, index) => ({
    label: root,
    value: root,
    action: "search",
    badge: "词根",
    icon: getProviderIcon(engineLabel),
    meta: `${engineLabel} · 词根扩展`,
    provider: engineLabel,
    priority: 720 - index * 12
  }));
}

function createContentSuggestionItems(entries, { query, badge, priority }) {
  const normalizedQuery = normalizeQuery(query).toLowerCase();

  return entries
    .filter((entry) => entry && entry.title && entry.url)
    .slice(0, MAX_CONTENT_SUGGESTIONS)
    .map((entry) => {
      const lowerTitle = entry.title.toLowerCase();
      const exact = lowerTitle === normalizedQuery;
      const prefix = lowerTitle.startsWith(normalizedQuery);

      return {
        label: entry.title,
        value: entry.title,
        url: entry.url,
        action: "navigate",
        badge,
        icon: "W",
        meta: `Wikipedia · ${entry.description || "互联网内容结果"}`,
        provider: "Wikipedia",
        title: entry.title,
        recentMeta: "互联网内容",
        recentType: "link",
        priority: priority + (exact ? 70 : prefix ? 30 : 0)
      };
    });
}

function dedupeSuggestions(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.action}:${(item.url || item.value || item.label).toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortSuggestions(items) {
  return items
    .map((item, index) => ({ ...item, __index: index }))
    .sort((left, right) => (
      (right.priority || 0) - (left.priority || 0) ||
      left.label.length - right.label.length ||
      left.__index - right.__index
    ))
    .map(({ __index, ...item }) => item);
}

async function getRemoteSuggestions({ query, engine = "google", locale = "zh-CN" }) {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return {
      query: "",
      roots: [],
      suggestions: [],
      stats: {
        searchCount: 0,
        contentCount: 0,
        rootCount: 0
      }
    };
  }

  const safeEngine = ENGINE_LABELS[engine] ? engine : "google";
  const roots = buildQueryRoots(normalizedQuery);
  const primaryLocale = containsCjk(normalizedQuery) || locale.toLowerCase().startsWith("zh") ? "zh" : "en";
  const secondaryLocale = primaryLocale === "zh" ? "en" : "zh";
  const searchTasks = [
    fetchEngineSuggestions(safeEngine, roots[0]).then((values) => createSearchSuggestionItems(values, {
      provider: safeEngine,
      query: roots[0],
      badge: "联网",
      priority: 840
    }))
  ];

  if (safeEngine !== "bing") {
    searchTasks.push(
      fetchEngineSuggestions("bing", roots[0]).then((values) => createSearchSuggestionItems(values, {
        provider: "bing",
        query: roots[0],
        badge: "扩展",
        priority: 760
      }))
    );
  }
  const contentTasks = [
    fetchWikipediaResults(roots[0], primaryLocale).then((entries) => createContentSuggestionItems(entries, {
      query: roots[0],
      badge: "内容",
      priority: 740
    })),
    fetchWikipediaResults(roots[0], secondaryLocale).then((entries) => createContentSuggestionItems(entries, {
      query: roots[0],
      badge: "内容",
      priority: 680
    }))
  ];

  if (roots[1] && roots[1] !== roots[0]) {
    searchTasks.push(
      fetchEngineSuggestions(safeEngine, roots[1]).then((values) => createSearchSuggestionItems(values, {
        provider: safeEngine,
        query: roots[0],
        badge: "词根",
        priority: 790
      }))
    );

    contentTasks.push(
      fetchWikipediaResults(roots[1], primaryLocale).then((entries) => createContentSuggestionItems(entries, {
        query: roots[0],
        badge: "词根",
        priority: 700
      }))
    );
  }

  const settled = await Promise.allSettled([...searchTasks, ...contentTasks]);
  const merged = [];

  settled.forEach((result) => {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      merged.push(...result.value);
      return;
    }

    if (result.status === "rejected") {
      if (result.reason?.name === "AbortError") {
        return;
      }

      console.warn("Suggest provider failed.", result.reason);
    }
  });

  merged.push(...createRootFallbackItems(roots, safeEngine));

  const suggestions = sortSuggestions(dedupeSuggestions(merged)).slice(0, MAX_RESULT_ITEMS);

  return {
    query: normalizedQuery,
    roots,
    suggestions,
    stats: {
      searchCount: suggestions.filter((item) => item.action === "search").length,
      contentCount: suggestions.filter((item) => item.action === "navigate").length,
      rootCount: roots.length
    }
  };
}

module.exports = {
  buildQueryRoots,
  getRemoteSuggestions,
  normalizeQuery
};
