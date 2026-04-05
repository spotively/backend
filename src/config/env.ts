export const env = {
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://127.0.0.1:5173',
  NODE_ENV: process.env.NODE_ENV || 'development'
}

export const SPOTIFY_SCOPES = "user-top-read"
