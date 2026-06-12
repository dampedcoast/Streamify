# Streamify

A functional clone of a video-sharing platform, built on a relational Oracle Database backend. Streamify lets users browse videos by category, search for content, manage personal playlists, and interact with videos through likes and comments.

**Team:**
- Yazan Abu Bakir — 20231232
- Eyad Ahmed Abdullah — 20241126
- Abdalfattah Mousa — 20230574
- Mohammad Rami — 20230153
- Jamel Rami Haddadeen — 20210203

## 1. Project Overview

**Core Objectives:**
- Manage a complex relational schema with 15 interconnected tables
- Implement Generalization/Specialization for video categories (Gaming, Education, Music)
- Provide a RESTful API to bridge a modern web frontend with a legacy Oracle Database

## 2. System Architecture

The application follows a standard **Three-Tier Architecture**:

| Tier | Technology |
|---|---|
| Presentation | HTML5, CSS3 (Poppins font), Vanilla JavaScript |
| Logic | Node.js (Express) + `oracledb` driver with connection pooling |
| Data | Oracle Database (Express Edition) |

## 3. Database Schema Design

The database consists of **15 tables** designed to handle every aspect of the platform.

### 3.1 Entity Relationship Summary

- **Users & Channels** — A user can own a channel; channels host videos.
- **Video Categorization** — Uses a specialization pattern. A `CATEGORY` can be further defined as `GAMING`, `EDUCATION`, or `MUSIC`, each with unique attributes (e.g. `platform` for gaming, `difficulty_level` for education).
- **Social Interactions** — Handled via associative tables such as `LIKES`, `WATCHES`, and `COMMENTS`.
- **Playlists** — A many-to-many relationship between `PLAYLIST` and `VIDEO` via the `PLAYLIST_VIDEO` junction table.

### 3.2 Table Definitions (DDL)

Summary of primary tables implemented in Oracle SQL:

| Table Name | Primary Key | Description |
|---|---|---|
| `USERS` | `user_id` | Stores user profile and location data |
| `VIDEO` | `video_id` | Core metadata: title, duration, views, upload date |
| `CHANNEL` | `channel_id` | Groups videos under a specific creator |
| `PLAYLIST` | `playlist_id` | User-created collections of videos |
| `COMMENTS` | `comment_id` | User feedback, supporting nested replies via `parent_comment_id` |
| `ADVERTISEMENT` | `ad_id` | Tracks marketing content linked to specific videos |

## 4. Data Implementation (DML)

The project includes a robust set of seed data to demonstrate system functionality.

### 4.1 Sample Data Entries

- **Users** — includes users from Jordan, Egypt, and Saudi Arabia (e.g. Ahmed Al-Salem, User #1)
- **Videos** — diverse content such as "How to Build a PC" (15,000 views) and "Learn Python in 1 Hour" (50,000 views)
- **Categories** — detailed specialization, such as "FIFA 2024" categorized under Gaming on the PlayStation platform

### 4.2 Advanced SQL Operations

The backend uses complex joins to aggregate data for the UI:

```sql
-- Example: Fetching videos with their channel and category names
SELECT v.video_id, v.title, c.name AS channel_name, cat.category_name
FROM video v
JOIN channel c ON v.channel_id = c.channel_id
LEFT JOIN video_category vc ON v.video_id = vc.video_id
LEFT JOIN category cat ON vc.category_id = cat.category_id;
```

## 5. Application Features

The web interface (`index.html` and `script.js`) provides the following functionality:

### 5.1 Content Discovery
- **Trending Feed** — displays videos ordered by view count
- **Dynamic Search** — real-time filtering using SQL `LIKE` operators to match titles or channel names
- **Category Filtering** — quick-access tags for Gaming, Music, and Education

### 5.2 Personalization
- **Like System** — users can "Like" videos, stored in the `USER_LIKED_VIDEO` table and accessible via a "Liked Videos" sidebar link
- **Playlist Management** — users can create new playlists and add/remove videos dynamically, using Oracle sequences (`playlist_seq.NEXTVAL`) for ID generation
- **Settings** — local storage integration to save a display name and view account status (e.g. User #1)

## 6. Implementation Notes

- **Security** — database credentials are managed via a `.env` file to prevent exposure of sensitive information like `ORACLE_PASSWORD`
- **Environment** — the project uses the `C##YOUTUBE_DB` common user in Oracle, requiring specific quota grants (`ALTER USER ... QUOTA UNLIMITED ON USERS`) to allow data insertion
- **API Design** — the server includes a debug endpoint (`/api/debug/tables`) that lists all active tables in the Oracle schema for easy verification

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express
- **Database:** Oracle Database (Express Edition), `oracledb` driver

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Oracle DB credentials:
   ```
   ORACLE_USER=C##YOUTUBE_DB
   ORACLE_PASSWORD=your_password
   ORACLE_CONNECT_STRING=localhost/XEPDB1
   ```
4. Run the schema and seed scripts to set up the database
5. Start the server:
   ```bash
   node server.js
   ```
6. Open `index.html` in your browser (or navigate to the configured local port)

## Repository Structure

```
.
├── README.md
├── server.js              # Express server & API routes
├── index.html              # Main frontend page
├── script.js                # Frontend logic (search, playlists, likes)
├── styles.css                # Styling (Poppins font)
├── sql/
│   ├── schema.sql            # DDL: table definitions (15 tables)
│   └── seed.sql                # DML: sample data
└── .env                         # Database credentials (not committed)
```
