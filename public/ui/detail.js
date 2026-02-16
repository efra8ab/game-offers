import { hasItem, toggleItem } from "../utils/storage.js";

const titleEl = document.querySelector("#title");
const summaryEl = document.querySelector("#summary");
const coverEl = document.querySelector("#cover");
const priceEl = document.querySelector("#price");
const discountEl = document.querySelector("#discount");
const releaseEl = document.querySelector("#release");
const developersEl = document.querySelector("#developers");
const publishersEl = document.querySelector("#publishers");
const platformsEl = document.querySelector("#platforms");
const metacriticEl = document.querySelector("#metacritic");
const genresEl = document.querySelector("#genres");
const statusEl = document.querySelector("#status");
const steamLinkEl = document.querySelector("#steamLink");
const btnWishlistEl = document.querySelector("#btnWishlist");
const btnOwnedEl = document.querySelector("#btnOwned");
const btnCompareEl = document.querySelector("#btnCompare");
const dealSectionEl = document.querySelector("#dealSection");
const dealPriceEl = document.querySelector("#dealPrice");
const dealRetailEl = document.querySelector("#dealRetail");
const dealSavingsEl = document.querySelector("#dealSavings");
const dealStoreEl = document.querySelector("#dealStore");
const dealLowestEl = document.querySelector("#dealLowest");
const dealStatusEl = document.querySelector("#dealStatus");
const dealLinkEl = document.querySelector("#dealLink");

let currentGame = null;

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function formatPrice(priceOverview, isFree) {
  if (isFree) return "Free";
  if (!priceOverview) return "Price unavailable";
  if (priceOverview.final_formatted) return priceOverview.final_formatted;
  if (typeof priceOverview.final === "number") {
    return `$${(priceOverview.final / 100).toFixed(2)}`;
  }
  return "Price unavailable";
}

function formatRelease(release) {
  if (!release) return "Unknown";
  if (release.coming_soon) {
    return release.date ? `Coming soon (${release.date})` : "Coming soon";
  }
  return release.date || "Unknown";
}

function formatPlatforms(platforms) {
  if (!platforms) return "Unknown";
  const items = [];
  if (platforms.windows) items.push("Windows");
  if (platforms.mac) items.push("Mac");
  if (platforms.linux) items.push("Linux");
  return items.length ? items.join(", ") : "Unknown";
}

function renderGenres(genres) {
  if (!genresEl) return;
  genresEl.innerHTML = "";
  if (!genres || genres.length === 0) return;

  for (const genre of genres) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = genre.description || genre;
    genresEl.appendChild(chip);
  }
}

function formatUsd(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = Number(value);
  if (Number.isFinite(num)) return `$${num.toFixed(2)}`;
  return String(value);
}

function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = Number(value);
  if (Number.isFinite(num)) return `${Math.round(num)}%`;
  return String(value);
}

function formatUnixDate(seconds) {
  const num = Number(seconds);
  if (!Number.isFinite(num) || num <= 0) return "";
  const date = new Date(num * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function setDealStatus(message) {
  if (dealStatusEl) dealStatusEl.textContent = message;
}

function renderDealInfo(dealData, message) {
  if (!dealSectionEl) return;

  if (!dealData) {
    setDealStatus(message || "No deal data found for this game.");
    if (dealLinkEl) dealLinkEl.hidden = true;
    return;
  }

  const deal = dealData.deal || {};
  const cheapestEver = dealData.cheapestPriceEver || null;
  const hasDealPricing = Boolean(deal.salePrice || deal.retailPrice);

  if (dealPriceEl) dealPriceEl.textContent = formatUsd(deal.salePrice);
  if (dealRetailEl) dealRetailEl.textContent = formatUsd(deal.retailPrice);
  if (dealSavingsEl) dealSavingsEl.textContent = formatPercent(deal.savings);
  if (dealStoreEl) dealStoreEl.textContent = deal.storeName || "Unknown";

  if (dealLowestEl) {
    const price = cheapestEver?.price;
    const date = formatUnixDate(cheapestEver?.date);
    dealLowestEl.textContent = price
      ? `${formatUsd(price)}${date ? ` (${date})` : ""}`
      : "N/A";
  }

  if (dealLinkEl && deal.dealLink) {
    dealLinkEl.href = deal.dealLink;
    dealLinkEl.hidden = false;
  } else if (dealLinkEl) {
    dealLinkEl.hidden = true;
  }

  if (hasDealPricing) {
    setDealStatus("Cheapest tracked deal on CheapShark.");
  } else {
    setDealStatus("No current deal price found. Showing lowest price history.");
  }
}

function updateActionButtons() {
  if (!currentGame) return;
  if (btnWishlistEl) {
    btnWishlistEl.textContent = hasItem("wishlist", currentGame.appid)
      ? "Remove wishlist"
      : "Add to wishlist";
  }
  if (btnOwnedEl) {
    btnOwnedEl.textContent = hasItem("owned", currentGame.appid)
      ? "Remove owned"
      : "Add to owned";
  }
  if (btnCompareEl) {
    btnCompareEl.textContent = hasItem("compare", currentGame.appid)
      ? "Remove compare"
      : "Add to compare";
  }
}

async function loadGame() {
  const params = new URLSearchParams(window.location.search);
  const appid = params.get("appid");

  if (!appid) {
    setStatus("Missing appid. Go back and pick a game from search.");
    if (titleEl) titleEl.textContent = "No game selected";
    return;
  }

  setStatus("Loading game details...");
  setDealStatus("Loading deal info...");

  try {
    const [gameRes, dealRes] = await Promise.all([
      fetch(`/api/game?appid=${encodeURIComponent(appid)}`),
      fetch(`/api/deal?appid=${encodeURIComponent(appid)}`),
    ]);

    const data = await gameRes.json();
    const dealPayload = await dealRes.json().catch(() => null);
    const dealData = dealRes.ok ? dealPayload : null;
    const dealError = dealRes.ok
      ? null
      : dealPayload?.details || dealPayload?.error;

    if (!gameRes.ok) {
      setStatus(data.details || data.error || "Failed to load game details.");
      renderDealInfo(null, dealError);
      return;
    }

    if (titleEl) titleEl.textContent = data.name || "Untitled game";
    if (summaryEl) {
      summaryEl.textContent =
        data.short_description || "No description available.";
    }
    if (coverEl) {
      coverEl.src = data.header_image || "";
      coverEl.alt = data.name ? `${data.name} cover` : "Game cover";
    }
    if (priceEl) priceEl.textContent = formatPrice(data.price_overview, data.is_free);

    if (discountEl) {
      const discount = data.price_overview?.discount_percent;
      if (discount && discount > 0) {
        discountEl.hidden = false;
        discountEl.textContent = `-${discount}%`;
      } else {
        discountEl.hidden = true;
      }
    }

    if (releaseEl) releaseEl.textContent = formatRelease(data.release_date);
    if (developersEl) {
      developersEl.textContent = data.developers?.length
        ? data.developers.join(", ")
        : "Unknown";
    }
    if (publishersEl) {
      publishersEl.textContent = data.publishers?.length
        ? data.publishers.join(", ")
        : "Unknown";
    }
    if (platformsEl) platformsEl.textContent = formatPlatforms(data.platforms);
    if (metacriticEl) {
      metacriticEl.textContent = data.metacritic?.score
        ? `${data.metacritic.score}/100`
        : "N/A";
    }
    if (steamLinkEl && data.steam_link) {
      steamLinkEl.href = data.steam_link;
    }

    currentGame = {
      appid: data.appid,
      name: data.name,
      header_image: data.header_image,
      steam_link: data.steam_link,
    };
    updateActionButtons();

    renderGenres(data.genres);
    document.title = `${data.name || "Game Detail"} | Game Offers`;
    setStatus("Details loaded from Steam.");
    renderDealInfo(dealData, dealError);
  } catch (err) {
    setStatus("Network error. Is the server running?");
    setDealStatus("Network error loading deal info.");
  }
}

btnWishlistEl?.addEventListener("click", () => {
  if (!currentGame) return;
  toggleItem("wishlist", currentGame);
  updateActionButtons();
});

btnOwnedEl?.addEventListener("click", () => {
  if (!currentGame) return;
  toggleItem("owned", currentGame);
  updateActionButtons();
});

btnCompareEl?.addEventListener("click", () => {
  if (!currentGame) return;
  toggleItem("compare", currentGame);
  updateActionButtons();
});

loadGame();
