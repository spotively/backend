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
  .get('/callback', async ({ query, cookie, redirect, request }) => {
    const code = query.code as string;
    if (!code) return new Response('Authorization failed', { status: 400 });
    
    // Aggressive production detection
    const isProd = env.NODE_ENV === 'production' || 
                   env.FRONTEND_URL.startsWith('https://') ||
                   request.url.startsWith('https://') ||
                   request.headers.get('x-forwarded-proto') === 'https'; // Trust proxy for SSL termination

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

    console.log('[Auth] Logged in successfully. Env Mode:', {
      isProd,
      nodeEnv: env.NODE_ENV,
      frontendUrl: env.FRONTEND_URL,
      requestUrl: request.url,
      xForwardedProto: request.headers.get('x-forwarded-proto')
    });

    // Secure cookie configuration for cross-site production support
    cookie.spotify_access.set({
      value: data.access_token,
      httpOnly: true,
      path: '/',
      sameSite: isProd ? 'none' : 'lax', // Use explicit none for prod
      secure: isProd,
      partitioned: isProd, // Re-enable for CHIPS support
      maxAge: data.expires_in
    });

    cookie.spotify_refresh.set({
      value: data.refresh_token,
      httpOnly: true,
      path: '/',
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      partitioned: isProd, 
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    // Set diagnostic header for verifying deployment
    const responseHeaders = new Headers();
    responseHeaders.set('Location', `${env.FRONTEND_URL}/?status=success`);
    responseHeaders.set('X-Debug-Mode', isProd ? 'production' : 'development');

    return new Response(null, {
      status: 302,
      headers: responseHeaders,
    });
  })
  .post('/logout', ({ cookie }) => {
    cookie.spotify_access.remove();
    cookie.spotify_refresh.remove();
    return { success: true, message: 'Logged out successfully' };
  })

