import { getList, removeItem } from "../utils/storage.js";

const gridEl = document.querySelector("#compareGrid");
const statusEl = document.querySelector("#status");

function setStatus(message) {
  if (statusEl) statusEl.textContent = message;
}

function clearGrid() {
  if (gridEl) gridEl.innerHTML = "";
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

function renderCard(data) {
  const card = document.createElement("article");
  card.className = "card";

  const img = document.createElement("img");
  img.src = data.header_image || data.image || "";
  img.alt = data.name || "Game cover";

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = data.name || "Untitled game";

  const price = document.createElement("div");
  price.className = "price";
  price.textContent = formatPrice(data.price_overview, data.is_free);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `Release: ${formatRelease(data.release_date)}`;

  const platforms = document.createElement("div");
  platforms.className = "meta";
  platforms.textContent = `Platforms: ${formatPlatforms(data.platforms)}`;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const view = document.createElement("a");
  view.className = "btn";
  view.href = `/game.html?appid=${data.appid}`;
  view.textContent = "View details";

  const remove = document.createElement("button");
  remove.className = "btn";
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    removeItem("compare", data.appid);
    loadCompare();
  });

  actions.appendChild(view);
  actions.appendChild(remove);

  body.appendChild(title);
  body.appendChild(price);
  body.appendChild(meta);
  body.appendChild(platforms);
  body.appendChild(actions);

  card.appendChild(img);
  card.appendChild(body);

  return card;
}

async function fetchGameDetail(appid) {
  const res = await fetch(`/api/game?appid=${encodeURIComponent(appid)}`);
  if (!res.ok) return null;
  return res.json();
}

async function loadCompare() {
  const list = getList("compare");
  clearGrid();

  if (!list.length) {
    setStatus("No games in compare list. Add some from search or detail pages.");
    return;
  }

  setStatus("Loading game data...");

  const details = await Promise.all(
    list.map((item) => fetchGameDetail(item.appid))
  );

  clearGrid();
  let rendered = 0;

  for (const data of details) {
    if (!data) continue;
    gridEl.appendChild(renderCard(data));
    rendered += 1;
  }

  if (!rendered) {
    setStatus("Unable to load details for the compare list.");
    return;
  }

  setStatus(`Showing ${rendered} games in compare list.`);
}

loadCompare();
