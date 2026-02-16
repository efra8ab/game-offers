import axios from "axios";

// Steam Store (storefront) search endpoint (no key needed)
// We'll pass the search term via query params (term=...)
const STEAM_STORE_SEARCH_URL = "https://store.steampowered.com/api/storesearch/";
const STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails/";

export async function searchSteamGames(query, limit = 20) {
  const term = (query || "").trim();
  if (!term) return [];

  const response = await axios.get(STEAM_STORE_SEARCH_URL, {
    timeout: 20000,
    params: {
      term,
      l: "english",
      cc: "US",
    },
    headers: {
      "User-Agent": "game-offers/1.0 (local dev)",
      "Accept": "application/json",
    },
  });

  // Expected shape: { total: number, items: [...] }
  const items = response?.data?.items;
  if (!Array.isArray(items)) {
    throw new Error("Unexpected Steam Store search response shape");
  }

  return items.slice(0, limit).map((item) => ({
    appid: item.id,
    name: item.name,
    tiny_image: item.tiny_image,
  }));
}

export async function getSteamAppDetails(appid) {
  const id = String(appid || "").trim();
  if (!id) {
    throw new Error("Missing appid");
  }

  const response = await axios.get(STEAM_APP_DETAILS_URL, {
    timeout: 20000,
    params: {
      appids: id,
      l: "english",
      cc: "US",
    },
    headers: {
      "User-Agent": "game-offers/1.0 (local dev)",
      "Accept": "application/json",
    },
  });

  const payload = response?.data?.[id];
  if (!payload || payload.success !== true) {
    throw new Error("Steam appdetails lookup failed");
  }

  const data = payload.data || {};

  return {
    appid: Number(id),
    name: data.name || "",
    short_description: data.short_description || "",
    header_image: data.header_image || "",
    background: data.background || data.background_raw || "",
    website: data.website || "",
    developers: Array.isArray(data.developers) ? data.developers : [],
    publishers: Array.isArray(data.publishers) ? data.publishers : [],
    release_date: data.release_date || null,
    genres: Array.isArray(data.genres) ? data.genres : [],
    price_overview: data.price_overview || null,
    platforms: data.platforms || null,
    metacritic: data.metacritic || null,
    is_free: Boolean(data.is_free),
    steam_link: `https://store.steampowered.com/app/${id}/`,
  };
}
