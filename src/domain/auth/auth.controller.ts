import Elysia from "elysia";
import { env, SPOTIFY_SCOPES } from "../../config/env";

const getSpotifyBasicAuth = () =>
  `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`

const isProduction = !env.FRONTEND_URL.includes('127.0.0.1') && !env.FRONTEND_URL.includes('localhost');

export const authController = new Elysia({ prefix: '/auth' })
  .get('/login', ({ redirect }) => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.SPOTIFY_CLIENT_ID!,
      scope: SPOTIFY_SCOPES!,
      redirect_uri: env.SPOTIFY_REDIRECT_URI!
    });
    return redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  })
  .get('/callback', async ({ query, cookie, redirect }) => {
    const code = query.code as string;
    if (!code) return new Response('Authorization failed', { status: 400 });
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: getSpotifyBasicAuth(),
      },
      body: new URLSearchParams({
        code,
        redirect_uri: env.SPOTIFY_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    if (data.error) return new Response(`Error: ${data.error_description}`, { status: 400 });

    console.log('[Auth] Setting cookies for tokens... Production mode:', isProduction);

    cookie.spotify_access.value = data.access_token;
    cookie.spotify_access.httpOnly = false;
    cookie.spotify_access.path = '/';
    cookie.spotify_access.sameSite = isProduction ? 'none' : 'lax';
    cookie.spotify_access.secure = isProduction;
    cookie.spotify_access.maxAge = data.expires_in;

    cookie.spotify_refresh.value = data.refresh_token;
    cookie.spotify_refresh.httpOnly = false;
    cookie.spotify_refresh.path = '/';
    cookie.spotify_refresh.sameSite = isProduction ? 'none' : 'lax';
    cookie.spotify_refresh.secure = isProduction;
    cookie.spotify_refresh.maxAge = 60 * 60 * 24 * 30; // 30 days

    return redirect(`${env.FRONTEND_URL}/?status=success`);
  })
  .post('/logout', ({ cookie }) => {
    cookie.spotify_access.remove();
    cookie.spotify_refresh.remove();
    return { success: true, message: 'Logged out successfully' };
  })

