import {
  getList,
  hasItem,
  removeItem,
  toggleItem,
} from "../utils/storage.js";

const queryEl = document.querySelector("#query");
const btnEl = document.querySelector("#btnSearch");
const statusEl = document.querySelector("#status");
const resultsEl = document.querySelector("#results");
const wishlistEl = document.querySelector("#wishlist");
const ownedEl = document.querySelector("#owned");
const compareEl = document.querySelector("#compare");
const filterEl = document.querySelector("#filterText");
const sortEl = document.querySelector("#sortBy");
const dealsOnlyEl = document.querySelector("#filterDeals");

let lastResults = [];
let isLoadingDeals = false;

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatUsd(value) {
  const num = numberOrNull(value);
  if (num === null) return null;
  return `$${num.toFixed(2)}`;
}

function getDealPrice(game) {
  const sale = numberOrNull(game.deal?.salePrice);
  if (sale !== null) return sale;
  const retail = numberOrNull(game.deal?.retailPrice);
  if (retail !== null) return retail;
  return null;
}

function getDealSavings(game) {
  return numberOrNull(game.deal?.savings);
}

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function clearResults() {
  if (resultsEl) resultsEl.innerHTML = "";
}

function renderResults(results) {
  clearResults();

  for (const game of results) {
    const card = document.createElement("div");
    card.style.display = "flex";
    card.style.gap = "12px";
    card.style.alignItems = "center";
    card.style.padding = "10px";
    card.style.border = "1px solid #ddd";
    card.style.borderRadius = "8px";
    card.style.marginBottom = "10px";

    const img = document.createElement("img");
    img.src = game.tiny_image || "";
    img.alt = game.name || "Game image";
    img.width = 120;
    img.loading = "lazy";

    const info = document.createElement("div");

    const title = document.createElement("div");
    title.textContent = game.name || "(no title)";
    title.style.fontWeight = "600";

    const link = document.createElement("a");
    link.href = `/game.html?appid=${game.appid}`;
    link.textContent = "View details →";

    const priceRow = document.createElement("div");
    priceRow.style.marginTop = "6px";
    priceRow.style.fontSize = "0.9rem";
    priceRow.style.color = "#333";

    const sale = formatUsd(game.deal?.salePrice);
    const retail = formatUsd(game.deal?.retailPrice);
    const savings = getDealSavings(game);

    if (sale) {
      priceRow.textContent = `Deal ${sale}${
        savings !== null ? ` (save ${Math.round(savings)}%)` : ""
      }${retail ? ` · Reg ${retail}` : ""}`;
    } else if (isLoadingDeals) {
      priceRow.textContent = "Deal data loading...";
    } else if (retail) {
      priceRow.textContent = `Price ${retail}`;
    } else {
      priceRow.textContent = "No deal data";
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const wishlistBtn = document.createElement("button");
    wishlistBtn.className = "small-btn";
    wishlistBtn.textContent = hasItem("wishlist", game.appid)
      ? "Remove wishlist"
      : "Add to wishlist";

    const ownedBtn = document.createElement("button");
    ownedBtn.className = "small-btn";
    ownedBtn.textContent = hasItem("owned", game.appid)
      ? "Remove owned"
      : "Add to owned";

    const compareBtn = document.createElement("button");
    compareBtn.className = "small-btn";
    compareBtn.textContent = hasItem("compare", game.appid)
      ? "Remove compare"
      : "Add to compare";

    wishlistBtn.addEventListener("click", () => {
      const result = toggleItem("wishlist", game);
      wishlistBtn.textContent = result.added
        ? "Remove wishlist"
        : "Add to wishlist";
      renderStoredLists();
    });

    ownedBtn.addEventListener("click", () => {
      const result = toggleItem("owned", game);
      ownedBtn.textContent = result.added ? "Remove owned" : "Add to owned";
      renderStoredLists();
    });

    compareBtn.addEventListener("click", () => {
      const result = toggleItem("compare", game);
      compareBtn.textContent = result.added
        ? "Remove compare"
        : "Add to compare";
      renderStoredLists();
    });

    actions.appendChild(wishlistBtn);
    actions.appendChild(ownedBtn);
    actions.appendChild(compareBtn);

    info.appendChild(title);
    info.appendChild(link);
    info.appendChild(priceRow);
    info.appendChild(actions);

    card.appendChild(img);
    card.appendChild(info);

    resultsEl.appendChild(card);
  }
}

function applySort(results) {
  const sortValue = sortEl?.value || "relevance";
  if (sortValue === "name-asc") {
    return [...results].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }
  if (sortValue === "name-desc") {
    return [...results].sort((a, b) =>
      String(b.name || "").localeCompare(String(a.name || ""))
    );
  }
  if (sortValue === "price-asc") {
    return [...results].sort((a, b) => {
      const aPrice = getDealPrice(a);
      const bPrice = getDealPrice(b);
      if (aPrice === null && bPrice === null) return a.__index - b.__index;
      if (aPrice === null) return 1;
      if (bPrice === null) return -1;
      return aPrice - bPrice;
    });
  }
  if (sortValue === "price-desc") {
    return [...results].sort((a, b) => {
      const aPrice = getDealPrice(a);
      const bPrice = getDealPrice(b);
      if (aPrice === null && bPrice === null) return a.__index - b.__index;
      if (aPrice === null) return 1;
      if (bPrice === null) return -1;
      return bPrice - aPrice;
    });
  }
  if (sortValue === "discount-desc") {
    return [...results].sort((a, b) => {
      const aSavings = getDealSavings(a);
      const bSavings = getDealSavings(b);
      if (aSavings === null && bSavings === null)
        return a.__index - b.__index;
      if (aSavings === null) return 1;
      if (bSavings === null) return -1;
      return bSavings - aSavings;
    });
  }
  return results;
}

function applyFilter(results) {
  const term = (filterEl?.value || "").trim().toLowerCase();
  const dealsOnly = Boolean(dealsOnlyEl?.checked);
  return results.filter((game) => {
    const matchesTerm = term
      ? String(game.name || "").toLowerCase().includes(term)
      : true;
    const hasDeal = getDealPrice(game) !== null;
    return matchesTerm && (!dealsOnly || hasDeal);
  });
}

function renderFilteredResults() {
  const filtered = applyFilter(lastResults);
  const sorted = applySort(filtered);
  renderResults(sorted);
  if (!lastResults.length) return;
  if (!filtered.length) {
    setStatus("No results match the filter.");
  } else {
    setStatus(`Showing ${sorted.length} results.`);
  }
}

function renderList(container, items, label) {
  if (!container) return;
  container.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "item-meta";
    empty.textContent = `No ${label} games yet.`;
    container.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "list-item";

    const left = document.createElement("div");
    const title = document.createElement("a");
    title.className = "item-title";
    title.href = `/game.html?appid=${item.appid}`;
    title.textContent = item.name || "Untitled game";

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `AppID: ${item.appid}`;

    left.appendChild(title);
    left.appendChild(meta);

    const removeBtn = document.createElement("button");
    removeBtn.className = "small-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      removeItem(label, item.appid);
      renderStoredLists();
    });

    row.appendChild(left);
    row.appendChild(removeBtn);
    container.appendChild(row);
  }
}

function renderStoredLists() {
  renderList(wishlistEl, getList("wishlist"), "wishlist");
  renderList(ownedEl, getList("owned"), "owned");
  renderList(compareEl, getList("compare"), "compare");
}

async function runSearch() {
  const q = (queryEl?.value || "").trim();

  if (!q) {
    setStatus("Type something to search.");
    clearResults();
    return;
  }

  setStatus("Searching…");
  clearResults();

  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${data.details || data.error || "Request failed"}`);
      return;
    }

    if (!data.results || data.results.length === 0) {
      setStatus(`No results for "${q}".`);
      return;
    }

    lastResults = data.results.map((game, index) => ({
      ...game,
      __index: index,
      deal: null,
    }));

    isLoadingDeals = true;
    setStatus(`Found ${data.count} results for "${q}". Loading deals...`);
    renderFilteredResults();

    const enriched = await Promise.all(
      lastResults.map(async (game) => {
        try {
          const res = await fetch(`/api/deal?appid=${game.appid}`);
          const payload = await res.json().catch(() => null);
          if (!res.ok) return { ...game, deal: null };
          return { ...game, deal: payload?.deal || null };
        } catch (err) {
          return { ...game, deal: null };
        }
      })
    );

    lastResults = enriched;
    isLoadingDeals = false;
    renderFilteredResults();
    setStatus(`Found ${data.count} results for "${q}".`);
  } catch (err) {
    setStatus("Network error. Is the server running?");
  }
}

btnEl?.addEventListener("click", runSearch);
queryEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});

filterEl?.addEventListener("input", () => {
  if (lastResults.length) renderFilteredResults();
});

sortEl?.addEventListener("change", () => {
  if (lastResults.length) renderFilteredResults();
});

dealsOnlyEl?.addEventListener("change", () => {
  if (lastResults.length) renderFilteredResults();
});

renderStoredLists();
