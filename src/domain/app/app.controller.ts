import Elysia, { t } from "elysia";
import { SpotifyService } from "../spotify/spotify.service";
import { ImageService } from "../image/image.service";
import { env } from "../../config/env";

/** Parse a raw Cookie header string into a key/value map */
function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map(pair => {
      const idx = pair.indexOf('=');
      return [pair.slice(0, idx).trim(), decodeURIComponent(pair.slice(idx + 1).trim())];
    })
  );
}

/** Read tokens directly from the raw Cookie request header */
function getTokensFromRequest(request: Request): { accessToken: string; refreshToken: string } {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  console.log('[AUTH] Raw cookies received:', Object.keys(cookies));
  return {
    accessToken: cookies['spotify_access'] ?? '',
    refreshToken: cookies['spotify_refresh'] ?? '',
  };
}

// Standalone debug route — no derive, so cookie reading is always reliable here
export const debugController = new Elysia({ prefix: '/api' })
  .get('/debug-cookies', ({ request }) => {
    const rawHeader = request.headers.get('cookie') || '(none)';
    const parsed = parseCookieHeader(request.headers.get('cookie'));
    
    // Diagnostic info for all headers (obfuscated sensitive ones)
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((v, k) => {
      allHeaders[k] = v;
    });

    console.log('[DEBUG] Raw cookie header:', rawHeader);
    console.log('[DEBUG] Parsed:', parsed);
    console.log('[DEBUG] All headers:', Object.keys(allHeaders));
    
    return { 
      rawHeader, 
      parsed, 
      headerKeys: Object.keys(allHeaders),
      isProd: env.NODE_ENV === 'production' || 
              env.FRONTEND_URL.startsWith('https://') ||
              request.headers.get('x-forwarded-proto') === 'https'
    };
  });

export const appController = new Elysia({ prefix: '/api' })
  .get('/top', async ({ request, cookie, query, set }) => {
    const { accessToken, refreshToken } = getTokensFromRequest(request);

    if (!accessToken || !refreshToken) {
      const isProd = env.NODE_ENV === 'production' || 
                     env.FRONTEND_URL.startsWith('https://') ||
                     request.url.startsWith('https://') ||
                     request.headers.get('x-forwarded-proto') === 'https';
      set.status = 401;
      return { error: `userUnauthorized, Please login first (${isProd ? 'Prod Mode' : 'Dev Mode'})` };
    }

    const updateTokens = (newAccess: string, newRefresh?: string) => {
      const isProd = env.NODE_ENV === 'production' || 
                     env.FRONTEND_URL.startsWith('https://') ||
                     request.url.startsWith('https://') ||
                     request.headers.get('x-forwarded-proto') === 'https';
      cookie.spotify_access.set({
        value: newAccess,
        httpOnly: true,
        path: '/',
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        partitioned: isProd,
      });
      if (newRefresh) {
        cookie.spotify_refresh.set({
          value: newRefresh,
          httpOnly: true,
          path: '/',
          sameSite: isProd ? 'none' : 'lax',
          secure: isProd,
          partitioned: isProd,
        });
      }
    };

    const spotifyService = new SpotifyService(accessToken, refreshToken, updateTokens);
    const type = (query.type as string) || 'tracks';
    const timeRange = (query.timeRange as string) || 'medium_term';
    const limit = parseInt((query.limit as string) || '5', 10);

    if (type === 'artists') return { type, items: await spotifyService.getTopArtists(timeRange, limit) };
    if (type === 'tracks') return { type, items: await spotifyService.getTopTracks(timeRange, limit) };

    set.status = 400;
    return { error: 'Invalid type' };
  }, {
    query: t.Object({ type: t.Optional(t.String()), timeRange: t.Optional(t.String()), limit: t.Optional(t.String()) })
  })
  .get('/me', async ({ request, cookie, set }) => {
    const { accessToken, refreshToken } = getTokensFromRequest(request);

    if (!accessToken || !refreshToken) {
      const isProd = env.NODE_ENV === 'production' || 
                     env.FRONTEND_URL.startsWith('https://') ||
                     request.url.startsWith('https://') ||
                     request.headers.get('x-forwarded-proto') === 'https';
      set.status = 401;
      return { error: `Unauthorized (${isProd ? 'Prod Mode' : 'Dev Mode'})` };
    }

    const updateTokens = (newAccess: string, newRefresh?: string) => {
      const isProd = env.NODE_ENV === 'production' || 
                     env.FRONTEND_URL.startsWith('https://') ||
                     request.url.startsWith('https://') ||
                     request.headers.get('x-forwarded-proto') === 'https';
      cookie.spotify_access.set({
        value: newAccess,
        httpOnly: true,
        path: '/',
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        partitioned: isProd,
      });
      if (newRefresh) {
        cookie.spotify_refresh.set({
          value: newRefresh,
          httpOnly: true,
          path: '/',
          sameSite: isProd ? 'none' : 'lax',
          secure: isProd,
          partitioned: isProd,
        });
      }
    };

    return await new SpotifyService(accessToken, refreshToken, updateTokens).getUserProfile();
  })
  .get('/generate-image', async ({ request, cookie, query, set }) => {
    const { accessToken, refreshToken } = getTokensFromRequest(request);

    if (!accessToken || !refreshToken) {
      const isProd = env.NODE_ENV === 'production' || 
                     env.FRONTEND_URL.startsWith('https://') ||
                     request.url.startsWith('https://') ||
                     request.headers.get('x-forwarded-proto') === 'https';
      set.status = 401;
      return { error: `Unauthorized. Please /auth/login first. (${isProd ? 'Prod Mode' : 'Dev Mode'})` };
    }

    const updateTokens = (newAccess: string, newRefresh?: string) => {
      const isProd = env.NODE_ENV === 'production' || 
                     env.FRONTEND_URL.startsWith('https://') ||
                     request.url.startsWith('https://') ||
                     request.headers.get('x-forwarded-proto') === 'https';
      cookie.spotify_access.set({
        value: newAccess,
        httpOnly: true,
        path: '/',
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        partitioned: isProd,
      });
      if (newRefresh) {
        cookie.spotify_refresh.set({
          value: newRefresh,
          httpOnly: true,
          path: '/',
          sameSite: isProd ? 'none' : 'lax',
          secure: isProd,
          partitioned: isProd,
        });
      }
    };

    const spotifyService = new SpotifyService(accessToken, refreshToken, updateTokens);
    const imageService = new ImageService();

    const type = (query.type as string) || 'tracks';
    const timeRange = (query.timeRange as string) || 'medium_term';
    const limit = parseInt((query.limit as string) || '5', 10);

    try {
      let items: any[] = [];

      if (type === 'artists') items = await spotifyService.getTopArtists(timeRange, limit);
      else if (type === 'tracks') items = await spotifyService.getTopTracks(timeRange, limit);
      else {
        set.status = 400;
        return { error: 'Invalid type. Use artists or tracks' };
      }

      const stringItems = items.map(i => `${i.name} by ${i.subtitle}`);

      if (query.raw === 'true') {
        const base64Image = await imageService.generateImage(stringItems, type);
        return { success: true, base64: `data:image/jpeg;base64,${base64Image}` };
      }

      const base64Image = await imageService.generateImage(stringItems, type);
      const finalSvg = imageService.createSVGOverlay(base64Image, stringItems, type);

      set.headers['Content-Type'] = 'image/svg+xml';
      if (query.download === 'true') {
        set.headers['Content-Disposition'] = `attachment; filename="spotify-vibe-${type}.svg"`;
      }

      return finalSvg;

    } catch (err: any) {
      console.error('Image Generation Error:', err);
      set.status = 500;
      return { error: err.message || 'Internal Server Error' };
    }
  }, {
    query: t.Object({
      type: t.Optional(t.String()),
      timeRange: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      download: t.Optional(t.String()),
      raw: t.Optional(t.String())
    })
  });
