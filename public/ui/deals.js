const gridEl = document.querySelector("#dealGrid");
const statusEl = document.querySelector("#status");
const sortEl = document.querySelector("#sortBy");
const prevBtn = document.querySelector("#btnPrev");
const nextBtn = document.querySelector("#btnNext");
const refreshBtn = document.querySelector("#btnRefresh");

let pageNumber = 0;
const pageSize = 24;

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
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
  if (Number.isFinite(num)) return `-${Math.round(num)}%`;
  return String(value);
}

function clearGrid() {
  if (gridEl) gridEl.innerHTML = "";
}

function renderDeals(deals) {
  clearGrid();

  if (!deals.length) {
    setStatus("No deals found.");
    return;
  }

  for (const deal of deals) {
    const card = document.createElement("article");
    card.className = "card";

    const img = document.createElement("img");
    img.src = deal.thumb || "";
    img.alt = deal.title || "Deal cover";
    img.loading = "lazy";

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = deal.title || "Untitled game";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = deal.storeName
      ? `${deal.storeName} · Deal rating ${deal.dealRating ?? "N/A"}`
      : "Deal info";

    const priceRow = document.createElement("div");
    priceRow.className = "price-row";

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = formatUsd(deal.salePrice);

    const priceOld = document.createElement("div");
    priceOld.className = "price-old";
    priceOld.textContent = formatUsd(deal.normalPrice);

    const savings = document.createElement("div");
    savings.className = "meta";
    savings.textContent = `Savings ${formatPercent(deal.savings)}`;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    if (deal.dealLink) {
      const viewDeal = document.createElement("a");
      viewDeal.className = "btn";
      viewDeal.href = deal.dealLink;
      viewDeal.target = "_blank";
      viewDeal.rel = "noopener";
      viewDeal.textContent = "View deal";
      actions.appendChild(viewDeal);
    }

    if (deal.steamAppID) {
      const viewSteam = document.createElement("a");
      viewSteam.className = "btn";
      viewSteam.href = `/game.html?appid=${deal.steamAppID}`;
      viewSteam.textContent = "Steam detail";
      actions.appendChild(viewSteam);
    }

    priceRow.appendChild(price);
    priceRow.appendChild(priceOld);

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(priceRow);
    body.appendChild(savings);
    body.appendChild(actions);

    card.appendChild(img);
    card.appendChild(body);
    gridEl.appendChild(card);
  }
}

function updatePagination(totalPages) {
  if (prevBtn) prevBtn.disabled = pageNumber <= 0;
  if (nextBtn) {
    nextBtn.disabled = totalPages ? pageNumber >= totalPages - 1 : false;
  }
}

async function loadDeals() {
  const sortBy = sortEl?.value || "DealRating";
  setStatus("Loading deals...");
  clearGrid();

  try {
    const res = await fetch(
      `/api/deals?sortBy=${encodeURIComponent(sortBy)}&pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
    const data = await res.json();

    if (!res.ok) {
      setStatus(data.details || data.error || "Failed to fetch deals.");
      return;
    }

    renderDeals(data.deals || []);
    updatePagination(data.totalPages);
    setStatus(
      `Showing page ${pageNumber + 1}${data.totalPages ? ` of ${data.totalPages}` : ""}.`
    );
  } catch (err) {
    setStatus("Network error. Is the server running?");
  }
}

sortEl?.addEventListener("change", () => {
  pageNumber = 0;
  loadDeals();
});

prevBtn?.addEventListener("click", () => {
  if (pageNumber > 0) {
    pageNumber -= 1;
    loadDeals();
  }
});

nextBtn?.addEventListener("click", () => {
  pageNumber += 1;
  loadDeals();
});

refreshBtn?.addEventListener("click", () => {
  loadDeals();
});

loadDeals();
