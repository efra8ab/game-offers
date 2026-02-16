import axios from "axios";

const CHEAPSHARK_BASE_URL = "https://www.cheapshark.com/api/1.0";
const http = axios.create({
  baseURL: CHEAPSHARK_BASE_URL,
  timeout: 20000,
  headers: {
    "User-Agent": "game-offers/1.0 (local dev)",
    "Accept": "application/json",
  },
});

let storeCache = {
  fetchedAt: 0,
  map: null,
};

const STORE_CACHE_TTL_MS = 1000 * 60 * 60;

async function fetchStoreMap() {
  const response = await http.get("/stores");
  const list = response?.data;
  if (!Array.isArray(list)) {
    throw new Error("Unexpected CheapShark stores response shape");
  }

  const map = {};
  for (const store of list) {
    if (!store?.storeID) continue;
    map[store.storeID] = store.storeName || "Unknown";
  }

  return map;
}

async function getStoreMap() {
  const now = Date.now();
  if (storeCache.map && now - storeCache.fetchedAt < STORE_CACHE_TTL_MS) {
    return storeCache.map;
  }

  const map = await fetchStoreMap();
  storeCache = { map, fetchedAt: now };
  return map;
}

async function getGameBySteamAppId(appid) {
  const id = String(appid || "").trim();
  if (!id) return null;

  let response;
  try {
    response = await http.get("/games", {
      params: {
        steamAppID: id,
        limit: 1,
      },
    });
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }

  const list = response?.data;
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  return list[0];
}

async function getGameLookup(gameId) {
  const id = String(gameId || "").trim();
  if (!id) return null;

  let response;
  try {
    response = await http.get("/games", {
      params: {
        id,
      },
    });
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }

  return response?.data || null;
}

async function getDealLookup(dealId) {
  const id = String(dealId || "").trim();
  if (!id) return null;

  let response;
  try {
    response = await http.get("/deals", {
      params: {
        id,
      },
    });
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }

  return response?.data || null;
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function computeSavingsPercent(salePrice, retailPrice) {
  const sale = numberOrNull(salePrice);
  const retail = numberOrNull(retailPrice);
  if (!sale && sale !== 0) return null;
  if (!retail || retail <= 0) return null;
  return Math.round((1 - sale / retail) * 100);
}

function pickLowestDeal(deals) {
  if (!Array.isArray(deals)) return null;
  let best = null;
  let bestPrice = null;

  for (const deal of deals) {
    const price = numberOrNull(deal?.price ?? deal?.salePrice);
    if (price === null) continue;
    if (bestPrice === null || price < bestPrice) {
      best = deal;
      bestPrice = price;
    }
  }

  return best;
}

export async function getCheapsharkDealForSteamApp(appid) {
  const game = await getGameBySteamAppId(appid);
  if (!game) {
    return {
      data: null,
      reason: "CheapShark has no mapping for this Steam app.",
    };
  }

  const [deal, lookup, storeMap] = await Promise.all([
    game.cheapestDealID ? getDealLookup(game.cheapestDealID) : null,
    getGameLookup(game.gameID),
    getStoreMap(),
  ]);

  const lookupDeals = Array.isArray(lookup?.deals) ? lookup.deals : [];
  const bestLookupDeal = pickLowestDeal(lookupDeals);
  const gameInfo = deal?.gameInfo || {};
  const storeID = gameInfo.storeID || bestLookupDeal?.storeID || null;
  const storeName = storeID ? storeMap[storeID] || "Unknown" : "Unknown";
  const salePrice =
    gameInfo.salePrice ??
    deal?.salePrice ??
    bestLookupDeal?.price ??
    bestLookupDeal?.salePrice ??
    null;
  const retailPrice =
    gameInfo.retailPrice ??
    deal?.retailPrice ??
    bestLookupDeal?.retailPrice ??
    null;
  const savings =
    gameInfo.savings ??
    computeSavingsPercent(salePrice, retailPrice);
  const dealID = deal?.dealID || bestLookupDeal?.dealID || game.cheapestDealID || null;

  const cheapestPriceEver = lookup?.cheapestPriceEver || null;
  const hasDealData = Boolean(salePrice || retailPrice || storeID);
  const hasHistory = Boolean(cheapestPriceEver?.price);

  if (!hasDealData && !hasHistory) {
    return {
      data: null,
      reason: "CheapShark has no current deals or price history for this game.",
    };
  }

  return {
    data: {
      steamAppID: String(appid),
      gameID: game.gameID || null,
      title: game.external || lookup?.info?.title || gameInfo.name || "",
      cheapest: game.cheapest || null,
      cheapestDealID: game.cheapestDealID || null,
      deal: {
        dealID,
        storeID,
        storeName,
        salePrice,
        retailPrice,
        savings,
        dealLink: dealID
          ? `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(
              dealID
            )}`
          : null,
      },
      cheapestPriceEver,
    },
    reason: null,
  };
}

export async function listCheapsharkDeals(options = {}) {
  const {
    pageNumber = 0,
    pageSize = 24,
    sortBy = "DealRating",
    desc = true,
    onSale = true,
  } = options;

  const response = await http.get("/deals", {
    params: {
      pageNumber,
      pageSize,
      sortBy,
      desc: desc ? 1 : 0,
      onSale: onSale ? 1 : 0,
    },
  });

  const list = response?.data;
  if (!Array.isArray(list)) {
    throw new Error("Unexpected CheapShark deals response shape");
  }

  const storeMap = await getStoreMap();
  const totalPages = Number(response?.headers?.["x-total-page-count"] ?? 0);

  const deals = list.map((deal) => ({
    dealID: deal.dealID || null,
    storeID: deal.storeID || null,
    storeName: deal.storeID ? storeMap[deal.storeID] || "Unknown" : "Unknown",
    title: deal.title || "",
    salePrice: numberOrNull(deal.salePrice),
    normalPrice: numberOrNull(deal.normalPrice),
    savings: numberOrNull(deal.savings),
    dealRating: numberOrNull(deal.dealRating),
    thumb: deal.thumb || "",
    steamAppID: deal.steamAppID || null,
    metacriticScore: deal.metacriticScore || null,
    steamRatingText: deal.steamRatingText || null,
    steamRatingPercent: deal.steamRatingPercent || null,
    releaseDate: deal.releaseDate ? Number(deal.releaseDate) : null,
    dealLink: deal.dealID
      ? `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(
          deal.dealID
        )}`
      : null,
  }));

  return {
    deals,
    pageNumber: Number(pageNumber),
    pageSize: Number(pageSize),
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : null,
  };
}
