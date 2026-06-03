# 🎥 YouTube Clone Backend API

A RESTful backend API for a YouTube Clone application built with **Node.js**, **Express.js**, and **MongoDB**. This server handles video management, channel creation, subscriptions, likes/dislikes, comments, user profiles, and JWT authentication.

---

## 🚀 Features

### 👤 User Features

* Get all users
* Get single user profile
* Create or update channel
* Subscribe / unsubscribe channels
* View subscribed channels

### 🎬 Video Features

* Get all videos with channel information
* Get single video details
* Upload new videos
* Like / Unlike videos
* Dislike / Remove dislike from videos

### 💬 Comment Features

* Get comments of a specific video
* Post comments on videos

### 📚 Library Features

* Get liked videos
* Get subscribed channels

### 🔐 Authentication

* JWT verification using JOSE
* Remote JWKS support
* Protected API routes

---

## 🛠️ Technologies Used

* Node.js
* Express.js
* MongoDB
* MongoDB Aggregation Pipeline
* JOSE (JWT Verification)
* dotenv
* cors

---

## 📂 Project Structure

```bash
├── server.js
├── .env
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

CLIENT_URI=http://localhost:3000
```

---

## 📦 Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/youtube-clone-backend.git
```

### Navigate to Project

```bash
cd youtube-clone-backend
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

### Start Production Server

```bash
npm start
```

---

# 📡 API Endpoints

---

## Root

### GET /

Returns server status.

```http
GET /
```

Response:

```json
"Hello from youtube clone server"
```

---

# 🎬 Videos

## Get All Videos

```http
GET /videos
```

Returns all videos with channel information.

---

## Get Single Video

```http
GET /videos/:id
```

Returns a specific video with channel information.

---

## Upload Video

```http
POST /api/video/upload
```

Protected Route ✅

Request Body:

```json
{
  "userId": "user_id",
  "title": "Video Title",
  "description": "Video Description",
  "videoUrl": "video_url",
  "thumbnailUrl": "thumbnail_url",
  "durationText": "10:30",
  "category": "Education",
  "tags": ["react", "node"]
}
```

---

## Like Video

```http
PUT /videos/:id/like
```

Protected Route ✅

Request Body:

```json
{
  "userId": "user_id"
}
```

---

## Dislike Video

```http
PUT /videos/:id/dislike
```

Protected Route ✅

Request Body:

```json
{
  "userId": "user_id"
}
```

---

# 💬 Comments

## Get Video Comments

```http
GET /videos/:id/comments
```

---

## Add Comment

```http
POST /videos/:id/comments
```

Protected Route ✅

Request Body:

```json
{
  "userId": "user_id",
  "text": "Nice video!"
}
```

---

# 👤 Users

## Get All Users

```http
GET /users
```

---

## Get Single User

```http
GET /users/:userId
```

---

# 📺 Channels

## Get Channel Profile & Videos

```http
GET /channels/:id
```

Returns:

```json
{
  "profile": {},
  "videos": []
}
```

---

## Create / Update Channel

```http
POST /api/channel/create
```

Protected Route ✅

Request Body:

```json
{
  "userId": "user_id",
  "channelName": "Programming Hero",
  "username": "programminghero",
  "bio": "Learn coding",
  "avatar": "image_url",
  "coverImage": "cover_url"
}
```

---

## Subscribe / Unsubscribe Channel

```http
PUT /users/:id/subscribe
```

Request Body:

```json
{
  "userId": "subscriber_user_id",
  "isSubscribing": true
}
```

---

# 📚 Library

## Get Liked Videos

```http
GET /api/library/liked-videos?userId=USER_ID
```

Protected Route ✅

---

## Get Subscribed Channels

```http
GET /api/library/subscribed-channels?userId=USER_ID
```

Protected Route ✅

---

# 🔐 Authentication

Protected routes require an Authorization header.

Example:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The server verifies JWT tokens using a remote JWKS endpoint.

---

# 🗄️ Database Collections

The project uses the following MongoDB collections:

```bash
users
videos
comments
```

---

# 📈 Future Improvements

* Video View Count Tracking
* Playlist System
* Notifications
* Search & Filters
* Video Categories
* Live Streaming Support
* Video Analytics Dashboard

---

# 🤝 Contributing

Contributions, issues, and feature requests are welcome.

Feel free to fork this repository and submit pull requests.

---



## 👨‍💻 Author

Developed with ❤️ using Node.js, Express, and MongoDB.
