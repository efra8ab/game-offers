import express from "express";
import { searchSteamGames } from "./api/steam.js";

const app = express();
app.use(express.static("public"));
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Game Offers server is running 🚀");
});

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});