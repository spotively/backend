import Elysia from "elysia";
import { env, SPOTIFY_SCOPES } from "../../config/env";

const getSpotifyBasicAuth = () =>
  `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`

// Better production detection: NODE_ENV is standard, or check if FRONTEND_URL is HTTPS (indicates production/hosted environment)
const isProduction = env.NODE_ENV === 'production' || env.FRONTEND_URL.startsWith('https://');

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

    console.log('[Auth] Logged in successfully. Production mode:', isProduction);
    console.log('[Auth] Frontend URL:', env.FRONTEND_URL);

    // Secure cookie configuration for cross-site production support
    cookie.spotify_access.set({
      value: data.access_token,
      httpOnly: true, // More secure, frontend doesn't need to read tokens
      path: '/',
      sameSite: isProduction ? 'none' : 'lax', // 'none' is REQUIRED for cross-domain cookies
      secure: isProduction, // 'secure' is REQUIRED for sameSite: 'none'
      maxAge: data.expires_in
    });

    cookie.spotify_refresh.set({
      value: data.refresh_token,
      httpOnly: true,
      path: '/',
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return redirect(`${env.FRONTEND_URL}/?status=success`);
  })
  .post('/logout', ({ cookie }) => {
    cookie.spotify_access.remove();
    cookie.spotify_refresh.remove();
    return { success: true, message: 'Logged out successfully' };
  })

