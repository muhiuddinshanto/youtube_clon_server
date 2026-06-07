# YouTube Clone Server

Backend API for a YouTube-style video sharing application. This server powers video feeds, channel profiles, subscriptions, likes/dislikes, comments, library data, and JWT-protected user actions.

## Live Links

- Server API: https://youtube-clon-server.vercel.app
- Client Site: https://youtube-clon-client.vercel.app

## Features

- Video list with channel information
- Single video details
- Video upload, update, and delete
- Like and dislike system
- Comment create, read, update, and delete
- User profile and channel data
- Channel create/update
- Subscribe and unsubscribe channels
- Liked videos and subscribed channels library
- JWT authentication using remote JWKS
- MongoDB aggregation for joined video, user, and comment data

## Tech Stack

- Node.js
- Express.js
- MongoDB
- MongoDB Aggregation Pipeline
- JOSE for JWT verification
- CORS
- dotenv

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URI=http://localhost:3000
```

For production, `CLIENT_URI` should point to the deployed client:

```env
CLIENT_URI=https://youtube-clon-client.vercel.app
```

## Installation

```bash
npm install
```

## Run Locally

```bash
node index.js
```

The server will run on:

```text
http://localhost:5000
```

## API Endpoints

### Root

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | Server health/status message |

### Videos

| Method | Endpoint | Protected | Description |
| --- | --- | --- | --- |
| GET | `/videos` | No | Get all videos with channel data |
| GET | `/videos/:id` | No | Get a single video |
| POST | `/api/video/upload` | Yes | Upload a new video |
| PUT | `/api/video/:id` | Yes | Update a video |
| DELETE | `/api/video/:id` | Yes | Delete a video |
| PUT | `/videos/:id/like` | Yes | Like or unlike a video |
| PUT | `/videos/:id/dislike` | Yes | Dislike or remove dislike |

### Comments

| Method | Endpoint | Protected | Description |
| --- | --- | --- | --- |
| GET | `/videos/:id/comments` | No | Get comments for a video |
| POST | `/videos/:id/comments` | Yes | Add a comment |
| PUT | `/videos/:videoId/comments/:commentId` | Yes | Edit a comment |
| DELETE | `/videos/:videoId/comments/:commentId` | Yes | Delete a comment |

### Users & Channels

| Method | Endpoint | Protected | Description |
| --- | --- | --- | --- |
| GET | `/users` | No | Get all users |
| GET | `/users/:userId` | No | Get a single user |
| GET | `/channels/:id` | No | Get channel profile and videos |
| POST | `/api/channel/create` | Yes | Create or update a channel |
| PUT | `/users/:id/subscribe` | No | Subscribe or unsubscribe a channel |

### Library

| Method | Endpoint | Protected | Description |
| --- | --- | --- | --- |
| GET | `/api/library/liked-videos?userId=USER_ID` | Yes | Get user's liked videos |
| GET | `/api/library/subscribed-channels?userId=USER_ID` | Yes | Get user's subscribed channels |

## Authentication

Protected routes require a bearer token:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The API verifies tokens using the client JWKS endpoint:

```text
{CLIENT_URI}/api/auth/jwks
```

## Example Requests

### Upload Video

```json
{
  "userId": "user_id",
  "title": "My First Video",
  "description": "Video description",
  "videoUrl": "https://example.com/video.mp4",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "durationText": "10:30",
  "category": "Education",
  "tags": ["node", "express", "mongodb"]
}
```

### Create Channel

```json
{
  "userId": "user_id",
  "channelName": "Code With Me",
  "username": "codewithme",
  "bio": "Learning web development together",
  "avatar": "https://example.com/avatar.jpg",
  "coverImage": "https://example.com/cover.jpg"
}
```

### Add Comment

```json
{
  "userId": "user_id",
  "text": "Nice video!"
}
```

## Database Collections

- `users`
- `videos`
- `comments`
- `user` fallback collection for auth user lookup

## Project Structure

```text
youtube_clon_server/
|-- index.js
|-- package.json
|-- package-lock.json
|-- .env
`-- README.md
```

## Author

Developed by Mohiuddin.
