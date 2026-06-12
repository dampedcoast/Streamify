const express = require('express');
const cors = require('cors');
const { initializeDatabase, executeQuery } = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const CURRENT_USER = 1;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── videos ────────────────────────────────────────────────────────────────────

app.get("/api/videos", async (_req, res) => {
  try {
    const sql = `
      SELECT v.video_id, v.title, v.video_duration AS duration, v.upload_date,
             v.views AS views_count, c.name AS channel_name, cat.category_name
      FROM video v
      JOIN channel c ON v.channel_id = c.channel_id
      LEFT JOIN video_category vc ON v.video_id = vc.video_id
      LEFT JOIN category cat ON vc.category_id = cat.category_id
      ORDER BY v.views DESC
    `;
    const result = await executeQuery(sql);
    res.json(result.rows);
  } catch (error) {
    console.error("GET VIDEOS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

app.get("/api/videos/search", async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) return res.status(400).json({ error: "Search query is required" });
    const sql = `
      SELECT v.video_id, v.title, v.video_duration AS duration, v.upload_date,
             v.views AS views_count, c.name AS channel_name, cat.category_name
      FROM video v
      JOIN channel c ON v.channel_id = c.channel_id
      LEFT JOIN video_category vc ON v.video_id = vc.video_id
      LEFT JOIN category cat ON vc.category_id = cat.category_id
      WHERE UPPER(v.title) LIKE UPPER(:searchTerm) OR UPPER(c.name) LIKE UPPER(:searchTerm)
      ORDER BY v.views DESC
    `;
    const result = await executeQuery(sql, { searchTerm: `%${searchTerm}%` });
    res.json(result.rows);
  } catch (error) {
    console.error("SEARCH ERROR:", error);
    res.status(500).json({ error: "Failed to search videos" });
  }
});

app.get("/api/videos/category/:category", async (req, res) => {
  try {
    const sql = `
      SELECT v.video_id, v.title, v.video_duration AS duration, v.upload_date,
             v.views AS views_count, c.name AS channel_name, cat.category_name
      FROM video v
      JOIN channel c ON v.channel_id = c.channel_id
      JOIN video_category vc ON v.video_id = vc.video_id
      JOIN category cat ON vc.category_id = cat.category_id
      WHERE UPPER(cat.category_name) = UPPER(:category)
      ORDER BY v.views DESC
    `;
    const result = await executeQuery(sql, { category: req.params.category });
    res.json(result.rows);
  } catch (error) {
    console.error("CATEGORY ERROR:", error);
    res.status(500).json({ error: "Category filter failed" });
  }
});

// ── liked videos ──────────────────────────────────────────────────────────────

app.get("/api/liked/ids", async (_req, res) => {
  try {
    const result = await executeQuery(
      `SELECT video_id FROM user_liked_video WHERE user_id = :userId`,
      { userId: CURRENT_USER }
    );
    res.json(result.rows.map(r => r.VIDEO_ID));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch liked ids" });
  }
});

app.get("/api/liked", async (_req, res) => {
  try {
    const sql = `
      SELECT v.video_id, v.title, v.video_duration AS duration, v.upload_date,
             v.views AS views_count, c.name AS channel_name, cat.category_name
      FROM user_liked_video ulv
      JOIN video v ON ulv.video_id = v.video_id
      JOIN channel c ON v.channel_id = c.channel_id
      LEFT JOIN video_category vc ON v.video_id = vc.video_id
      LEFT JOIN category cat ON vc.category_id = cat.category_id
      WHERE ulv.user_id = :userId
      ORDER BY ulv.liked_date DESC
    `;
    const result = await executeQuery(sql, { userId: CURRENT_USER });
    res.json(result.rows);
  } catch (error) {
    console.error("GET LIKED ERROR:", error);
    res.status(500).json({ error: "Failed to fetch liked videos" });
  }
});

app.post("/api/videos/:id/like", async (req, res) => {
  try {
    await executeQuery(
      `INSERT INTO user_liked_video (user_id, video_id, liked_date) VALUES (:userId, :videoId, SYSDATE)`,
      { userId: CURRENT_USER, videoId: parseInt(req.params.id) }
    );
    res.json({ success: true });
  } catch (error) {
    if (error.errorNum === 1) return res.json({ success: true });
    console.error("LIKE ERROR:", error);
    res.status(500).json({ error: "Failed to like video" });
  }
});

app.delete("/api/videos/:id/like", async (req, res) => {
  try {
    await executeQuery(
      `DELETE FROM user_liked_video WHERE user_id = :userId AND video_id = :videoId`,
      { userId: CURRENT_USER, videoId: parseInt(req.params.id) }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("UNLIKE ERROR:", error);
    res.status(500).json({ error: "Failed to unlike video" });
  }
});

// ── playlists ─────────────────────────────────────────────────────────────────

app.get("/api/playlists", async (_req, res) => {
  try {
    const result = await executeQuery(
      `SELECT p.playlist_id, p.name, p.created_date, COUNT(pv.video_id) AS video_count
       FROM playlist p
       LEFT JOIN playlist_video pv ON p.playlist_id = pv.playlist_id
       WHERE p.user_id = :userId
       GROUP BY p.playlist_id, p.name, p.created_date
       ORDER BY p.created_date DESC`,
      { userId: CURRENT_USER }
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET PLAYLISTS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

app.post("/api/playlists", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Playlist name required" });
  try {
    const seqResult = await executeQuery("SELECT playlist_seq.NEXTVAL AS id FROM dual");
    const playlistId = seqResult.rows[0].ID;
    await executeQuery(
      `INSERT INTO playlist (playlist_id, name, user_id, created_date) VALUES (:playlistId, :name, :userId, SYSDATE)`,
      { playlistId, name, userId: CURRENT_USER }
    );
    res.json({ success: true, playlistId });
  } catch (error) {
    console.error("CREATE PLAYLIST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/playlists/:id", async (req, res) => {
  try {
    const sql = `
      SELECT v.video_id, v.title, v.video_duration AS duration, v.upload_date,
             v.views AS views_count, c.name AS channel_name, cat.category_name,
             p.name AS playlist_name
      FROM playlist_video pv
      JOIN video v ON pv.video_id = v.video_id
      JOIN channel c ON v.channel_id = c.channel_id
      JOIN playlist p ON pv.playlist_id = p.playlist_id
      LEFT JOIN video_category vc ON v.video_id = vc.video_id
      LEFT JOIN category cat ON vc.category_id = cat.category_id
      WHERE pv.playlist_id = :playlistId AND p.user_id = :userId
      ORDER BY pv.added_date DESC
    `;
    const result = await executeQuery(sql, {
      playlistId: parseInt(req.params.id),
      userId: CURRENT_USER
    });
    res.json(result.rows);
  } catch (error) {
    console.error("GET PLAYLIST VIDEOS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch playlist" });
  }
});

app.post("/api/playlists/:id/videos", async (req, res) => {
  try {
    await executeQuery(
      `INSERT INTO playlist_video (playlist_id, video_id, added_date) VALUES (:playlistId, :videoId, SYSDATE)`,
      { playlistId: parseInt(req.params.id), videoId: req.body.videoId }
    );
    res.json({ success: true });
  } catch (error) {
    if (error.errorNum === 1) return res.json({ success: true });
    console.error("ADD TO PLAYLIST ERROR:", error);
    res.status(500).json({ error: "Failed to add to playlist" });
  }
});

app.delete("/api/playlists/:id/videos/:videoId", async (req, res) => {
  try {
    await executeQuery(
      `DELETE FROM playlist_video WHERE playlist_id = :playlistId AND video_id = :videoId`,
      { playlistId: parseInt(req.params.id), videoId: parseInt(req.params.videoId) }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("REMOVE FROM PLAYLIST ERROR:", error);
    res.status(500).json({ error: "Failed to remove from playlist" });
  }
});

// ── debug ─────────────────────────────────────────────────────────────────────

app.get("/api/debug/tables", async (_req, res) => {
  try {
    const result = await executeQuery("SELECT table_name FROM user_tables ORDER BY table_name");
    res.json({ user: process.env.ORACLE_USER, tables: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── start ─────────────────────────────────────────────────────────────────────

async function startServer() {
  await initializeDatabase();
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

startServer();