"use strict";

const { getRemoteSuggestions, normalizeQuery } = require("./_lib/search-suggest");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, {
      ok: false,
      error: {
        code: "method_not_allowed",
        message: "Only GET is supported."
      }
    });
    return;
  }

  const query = normalizeQuery(req.query?.q || "");
  const engine = normalizeQuery(req.query?.engine || "google").toLowerCase() || "google";
  const locale = normalizeQuery(req.query?.locale || "zh-CN") || "zh-CN";

  if (!query) {
    sendJson(res, 200, {
      ok: true,
      query: "",
      roots: [],
      suggestions: [],
      stats: {
        searchCount: 0,
        contentCount: 0,
        rootCount: 0
      }
    });
    return;
  }

  try {
    const payload = await getRemoteSuggestions({ query, engine, locale });
    sendJson(res, 200, {
      ok: true,
      ...payload
    });
  } catch (error) {
    console.warn("Suggestion API failed.", error);
    sendJson(res, 500, {
      ok: false,
      error: {
        code: "suggest_unavailable",
        message: "Suggestion service is temporarily unavailable."
      }
    });
  }
};
