const videoGrid = document.getElementById("videoGrid");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const categoryButtons = document.querySelectorAll("[data-category]");

const API_BASE_URL = "http://localhost:3000/api";
const CURRENT_USER = 1;

let likedVideoIds = new Set();
let currentPlaylistVideoId = null;

// ── playlist modal (injected once into DOM) ───────────────────────────────────
const modalEl = document.createElement("div");
modalEl.id = "playlistModal";
modalEl.className = "playlist-modal hidden";
modalEl.innerHTML = `
  <div class="modal-content">
    <h3>Add to Playlist</h3>
    <div id="playlistList" class="playlist-list"></div>
    <div class="new-playlist-form">
      <input id="newPlaylistInput" placeholder="New playlist name..." />
      <button id="createPlaylistBtn">Create &amp; Add</button>
    </div>
    <button id="closeModalBtn" class="close-modal-btn">Cancel</button>
  </div>
`;
document.body.appendChild(modalEl);

document.getElementById("closeModalBtn").addEventListener("click", () => {
  modalEl.classList.add("hidden");
  currentPlaylistVideoId = null;
});

document.getElementById("createPlaylistBtn").addEventListener("click", async () => {
  const name = document.getElementById("newPlaylistInput").value.trim();
  if (!name || !currentPlaylistVideoId) return;
  try {
    const res = await fetch(`${API_BASE_URL}/playlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    await fetch(`${API_BASE_URL}/playlists/${data.playlistId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: currentPlaylistVideoId })
    });

    document.getElementById("newPlaylistInput").value = "";
    modalEl.classList.add("hidden");
    currentPlaylistVideoId = null;
    showToast("Added to new playlist!");
  } catch (err) {
    showToast("Failed to create playlist.");
    console.error(err);
  }
});

// ── utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatViews(count) {
  if (!count && count !== 0) return "0";
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return count.toString();
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "Unknown date";
  return new Date(dateValue).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric"
  });
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 2500);
}

function updateProfileDisplay() {
  const name = localStorage.getItem("displayName") || "Alex Johnson";
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  document.querySelector(".profile").textContent = initials;
}

function setActiveCategory(category) {
  document.querySelectorAll(".tag[data-category]").forEach(tag => {
    tag.classList.toggle("active", tag.dataset.category === category);
  });
  document.querySelectorAll(".sidebar li[data-category]").forEach(li => {
    li.classList.toggle("active", li.dataset.category === category);
  });
}

// ── liked videos ──────────────────────────────────────────────────────────────

async function loadLikedIds() {
  try {
    const res = await fetch(`${API_BASE_URL}/liked/ids`);
    const ids = await res.json();
    likedVideoIds = new Set(ids);
  } catch (err) {
    console.error("Could not load liked ids", err);
  }
}

async function toggleLike(videoId, btn) {
  const isLiked = likedVideoIds.has(videoId);
  try {
    const method = isLiked ? "DELETE" : "POST";
    const res = await fetch(`${API_BASE_URL}/videos/${videoId}/like`, { method });
    if (!res.ok) return;
    if (isLiked) {
      likedVideoIds.delete(videoId);
      btn.classList.remove("liked");
    } else {
      likedVideoIds.add(videoId);
      btn.classList.add("liked");
      showToast("Added to Liked Videos ❤️");
    }
  } catch (err) {
    console.error("Like error", err);
  }
}

async function loadLikedVideos() {
  try {
    videoGrid.innerHTML = `<p class="loading">Loading liked videos...</p>`;
    const res = await fetch(`${API_BASE_URL}/liked`);
    const data = await res.json();
    if (!res.ok) { videoGrid.innerHTML = `<p class="error-message">${escapeHtml(data.error)}</p>`; return; }
    if (!data.length) { videoGrid.innerHTML = `<p class="error-message">No liked videos yet — click ♥ on any video!</p>`; return; }
    displayVideos(data);
  } catch (err) {
    videoGrid.innerHTML = `<p class="error-message">Failed to load liked videos.</p>`;
  }
}

// ── playlists ─────────────────────────────────────────────────────────────────

async function showPlaylistModal(videoId) {
  currentPlaylistVideoId = videoId;
  modalEl.classList.remove("hidden");
  const listEl = document.getElementById("playlistList");
  listEl.innerHTML = `<p style="color:#aaa;font-size:14px">Loading...</p>`;
  try {
    const res = await fetch(`${API_BASE_URL}/playlists`);
    const playlists = await res.json();
    if (!playlists.length) {
      listEl.innerHTML = `<p style="color:#aaa;font-size:14px">No playlists yet — create one below.</p>`;
      return;
    }
    listEl.innerHTML = playlists.map(p => `
      <div class="playlist-item" data-id="${p.PLAYLIST_ID}">
        <span>📂 ${escapeHtml(p.NAME)}</span>
        <span style="color:#777;font-size:13px">${p.VIDEO_COUNT} videos</span>
      </div>
    `).join("");
    listEl.querySelectorAll(".playlist-item").forEach(item => {
      item.addEventListener("click", async () => {
        await fetch(`${API_BASE_URL}/playlists/${item.dataset.id}/videos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: currentPlaylistVideoId })
        });
        modalEl.classList.add("hidden");
        currentPlaylistVideoId = null;
        showToast("Added to playlist! 📂");
      });
    });
  } catch (err) {
    listEl.innerHTML = `<p style="color:#aaa;font-size:14px">Failed to load playlists.</p>`;
  }
}

async function loadPlaylistsView() {
  try {
    videoGrid.innerHTML = `<p class="loading">Loading playlists...</p>`;
    const res = await fetch(`${API_BASE_URL}/playlists`);
    const playlists = await res.json();
    if (!playlists.length) {
      videoGrid.innerHTML = `<p class="error-message">No playlists yet — use the "+ Playlist" button on any video.</p>`;
      return;
    }
    videoGrid.innerHTML = "";
    playlists.forEach(p => {
      const card = document.createElement("div");
      card.className = "video-card";
      card.innerHTML = `
        <div class="thumbnail" style="background:#1a1a2e;font-size:55px">📂</div>
        <div class="video-info">
          <div class="video-title">${escapeHtml(p.NAME)}</div>
          <div class="channel-name">${p.VIDEO_COUNT} videos</div>
          <div class="video-stats">${formatDate(p.CREATED_DATE)}</div>
        </div>
      `;
      card.addEventListener("click", () => loadPlaylistVideos(p.PLAYLIST_ID, p.NAME));
      videoGrid.appendChild(card);
    });
  } catch (err) {
    videoGrid.innerHTML = `<p class="error-message">Failed to load playlists.</p>`;
  }
}

async function loadPlaylistVideos(playlistId, playlistName) {
  try {
    videoGrid.innerHTML = `<p class="loading">Loading playlist...</p>`;
    const res = await fetch(`${API_BASE_URL}/playlists/${playlistId}`);
    const data = await res.json();

    if (!data.length) {
      videoGrid.innerHTML = `<p class="error-message">📂 "${escapeHtml(playlistName)}" is empty.</p>`;
      return;
    }

    displayVideos(data);

    const backBtn = document.createElement("div");
    backBtn.style.cssText = "margin-bottom:20px;grid-column:1/-1;display:flex;align-items:center;gap:15px;";
    backBtn.innerHTML = `
      <button class="back-btn" onclick="loadPlaylistsView()">← Back</button>
      <span style="font-size:20px;font-weight:600">📂 ${escapeHtml(playlistName)}</span>
    `;
    videoGrid.insertBefore(backBtn, videoGrid.firstChild);
  } catch (err) {
    videoGrid.innerHTML = `<p class="error-message">Failed to load playlist.</p>`;
  }
}

// ── settings ──────────────────────────────────────────────────────────────────

function showSettings() {
  const displayName = localStorage.getItem("displayName") || "Alex Johnson";
  videoGrid.innerHTML = `
    <div class="settings-panel">
      <h2>⚙ Settings</h2>
      <div class="setting-item">
        <label>Display Name</label>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <input id="displayNameInput" value="${escapeHtml(displayName)}" placeholder="Your name" />
          <button id="saveDisplayName">Save</button>
        </div>
      </div>
      <div class="setting-item">
        <label>Account</label>
        <span>Logged in as (User #${displayName})</span>
      </div>
    </div>
  `;
  document.getElementById("saveDisplayName").addEventListener("click", () => {
    const name = document.getElementById("displayNameInput").value.trim();
    if (name) {
      localStorage.setItem("displayName", name);
      updateProfileDisplay();
      showToast("Display name saved!");
    }
  });
}

// ── video loading ─────────────────────────────────────────────────────────────

async function loadVideos() {
  try {
    setActiveCategory("All");
    videoGrid.innerHTML = `<p class="loading">Loading videos...</p>`;
    const response = await fetch(`${API_BASE_URL}/videos`);
    const data = await response.json();
    if (!response.ok) { videoGrid.innerHTML = `<p class="error-message">${escapeHtml(data.error || "Server error")}</p>`; return; }
    displayVideos(data);
  } catch (error) {
    videoGrid.innerHTML = `<p class="error-message">Failed to load videos from database.</p>`;
    console.error(error);
  }
}

async function searchVideos() {
  const searchText = searchInput.value.trim();
  if (searchText === "") { loadVideos(); return; }
  try {
    videoGrid.innerHTML = `<p class="loading">Searching...</p>`;
    const response = await fetch(`${API_BASE_URL}/videos/search?q=${encodeURIComponent(searchText)}`);
    const videos = await response.json();
    displayVideos(videos);
  } catch (error) {
    videoGrid.innerHTML = `<p class="error-message">Search failed.</p>`;
    console.error(error);
  }
}

async function filterByCategory(category) {
  setActiveCategory(category);
  if (category === "All") { loadVideos(); return; }
  try {
    videoGrid.innerHTML = `<p class="loading">Loading ${category} videos...</p>`;
    const response = await fetch(`${API_BASE_URL}/videos/category/${category}`);
    const data = await response.json();
    if (!response.ok) { videoGrid.innerHTML = `<p class="error-message">${escapeHtml(data.error)}</p>`; return; }
    displayVideos(data);
  } catch (error) {
    videoGrid.innerHTML = `<p class="error-message">Category filter failed.</p>`;
    console.error(error);
  }
}

function displayVideos(videos) {
  videoGrid.innerHTML = "";
  if (!videos || videos.length === 0) {
    videoGrid.innerHTML = `<p class="error-message">No videos found.</p>`;
    return;
  }
  videos.forEach(video => {
    const card = document.createElement("div");
    card.className = "video-card";
    const duration = formatDuration(video.DURATION);
    const isLiked = likedVideoIds.has(video.VIDEO_ID);
    card.innerHTML = `
      <div class="thumbnail">
        ▶
        ${duration ? `<span class="duration-badge">${escapeHtml(duration)}</span>` : ""}
      </div>
      <div class="video-info">
        <div class="video-title">${escapeHtml(video.TITLE)}</div>
        <div class="channel-name">${escapeHtml(video.CHANNEL_NAME)}</div>
        <div class="video-stats">${formatViews(video.VIEWS_COUNT)} views • ${formatDate(video.UPLOAD_DATE)}</div>
        <div class="category-name">${escapeHtml(video.CATEGORY_NAME) || "No Category"}</div>
        <div class="action-bar">
          <button class="like-btn ${isLiked ? "liked" : ""}">♥ Like</button>
          <button class="playlist-btn">+ Playlist</button>
        </div>
      </div>
    `;
    card.querySelector(".like-btn").addEventListener("click", e => {
      e.stopPropagation();
      toggleLike(video.VIDEO_ID, e.currentTarget);
    });
    card.querySelector(".playlist-btn").addEventListener("click", e => {
      e.stopPropagation();
      showPlaylistModal(video.VIDEO_ID);
    });
    videoGrid.appendChild(card);
  });
}

// ── event listeners ───────────────────────────────────────────────────────────

searchButton.addEventListener("click", searchVideos);
searchInput.addEventListener("keyup", e => { if (e.key === "Enter") searchVideos(); });

categoryButtons.forEach(btn => {
  btn.addEventListener("click", () => filterByCategory(btn.dataset.category));
});

document.getElementById("sidebarTrending").addEventListener("click", () => { setActiveCategory("All"); loadVideos(); });
document.getElementById("sidebarLiked").addEventListener("click", loadLikedVideos);
document.getElementById("sidebarPlaylists").addEventListener("click", loadPlaylistsView);
document.getElementById("sidebarSettings").addEventListener("click", showSettings);

// ── init ──────────────────────────────────────────────────────────────────────
updateProfileDisplay();
loadLikedIds().then(() => loadVideos());