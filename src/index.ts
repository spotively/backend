import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authController } from "./domain/auth/auth.controller";
import { appController } from "./domain/app/app.controller";
import { env } from "./config/env"

console.log('Backend running. Frontend expected at:', env.FRONTEND_URL);

const app = new Elysia()
  .use(cors({
    origin: [env.FRONTEND_URL, 'https://frontend-7z9.pages.dev', 'http://127.0.0.1:5173', 'https://backend-mnhi.onrender.com'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }))
  .use(authController)
  .use(appController)
  .get('/', () => ({
    message: 'Spotify Vibe API Running',
    endpoints: {
      login: '/auth/login',
      logout: '/auth/logout (POST)',
      topData: '/api/top?type=(artists|tracks)&timeRange=(short_term|medium_term|long_term)',
      generateImage: '/api/generate-image?type=(artists|tracks)&timeRange=(short_term|medium_term|long_term)&download=(true|false)'
    }
  }))
  .listen(env.PORT!);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
