import express from "express";
import { getSteamAppDetails, searchSteamGames } from "./api/steam.js";
import {
  getCheapsharkDealForSteamApp,
  listCheapsharkDeals,
} from "./api/cheapshark.js";

const app = express();
app.use(express.static("public"));
const PORT = 3000;

// Routes

app.get("/api/search", async (req, res) => {
  try {
    const query = req.query.query;
    const results = await searchSteamGames(query, 20);
    res.json({ query: query || "", count: results.length, results });
  } catch (err) {
    const status = err?.response?.status;
    const statusText = err?.response?.statusText;
    console.error("Search error:", {
      message: err.message,
      status,
      statusText,
    });

    // Helpful in dev: return the message so we can fix fast
    res.status(500).json({
      error: "Failed to search Steam",
      details: err.message,
      upstream: status ? { status, statusText } : undefined,
    });
  }
});

app.get("/api/game", async (req, res) => {
  try {
    const appid = req.query.appid;
    if (!appid) {
      res.status(400).json({ error: "Missing appid" });
      return;
    }

    const details = await getSteamAppDetails(appid);
    res.json(details);
  } catch (err) {
    const status = err?.response?.status;
    const statusText = err?.response?.statusText;
    console.error("Game detail error:", {
      message: err.message,
      status,
      statusText,
    });

    res.status(500).json({
      error: "Failed to fetch game details",
      details: err.message,
      upstream: status ? { status, statusText } : undefined,
    });
  }
});

app.get("/api/deal", async (req, res) => {
  try {
    const appid = req.query.appid;
    if (!appid) {
      res.status(400).json({ error: "Missing appid" });
      return;
    }

    const result = await getCheapsharkDealForSteamApp(appid);
    if (!result?.data) {
      res.status(404).json({
        error: result?.reason || "No deals found for this app",
      });
      return;
    }

    res.json(result.data);
  } catch (err) {
    const status = err?.response?.status;
    const statusText = err?.response?.statusText;
    console.error("Deal lookup error:", {
      message: err.message,
      status,
      statusText,
    });

    res.status(500).json({
      error: "Failed to fetch deal data",
      details: err.message,
      upstream: status ? { status, statusText } : undefined,
    });
  }
});

app.get("/api/deals", async (req, res) => {
  try {
    const pageNumber = req.query.pageNumber ?? 0;
    const pageSize = req.query.pageSize ?? 24;
    const sortBy = req.query.sortBy ?? "DealRating";

    const data = await listCheapsharkDeals({
      pageNumber,
      pageSize,
      sortBy,
    });

    res.json(data);
  } catch (err) {
    const status = err?.response?.status;
    const statusText = err?.response?.statusText;
    console.error("Deals list error:", {
      message: err.message,
      status,
      statusText,
    });

    res.status(500).json({
      error: "Failed to fetch deals list",
      details: err.message,
      upstream: status ? { status, statusText } : undefined,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
