const queryEl = document.querySelector("#query");
const btnEl = document.querySelector("#btnSearch");
const statusEl = document.querySelector("#status");
const resultsEl = document.querySelector("#results");

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

    info.appendChild(title);
    info.appendChild(link);

    card.appendChild(img);
    card.appendChild(info);

    resultsEl.appendChild(card);
  }
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

    setStatus(`Found ${data.count} results for "${q}".`);
    renderResults(data.results);
  } catch (err) {
    setStatus("Network error. Is the server running?");
  }
}

btnEl?.addEventListener("click", runSearch);
queryEl?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});
