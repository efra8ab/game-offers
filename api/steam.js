import axios from "axios";

// Steam Store (storefront) search endpoint (no key needed)
// We'll pass the search term via query params (term=...)
const STEAM_STORE_SEARCH_URL = "https://store.steampowered.com/api/storesearch/";

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