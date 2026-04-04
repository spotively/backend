import Elysia, { t } from "elysia";
import { SpotifyService } from "../spotify/spotify.service";
import { ImageService } from "../image/image.service";

export const appController = new Elysia({ prefix: '/api' })
  .derive(({ cookie: { spotify_access, spotify_refresh } }) => {
    console.log('[API] Checking cookies:', { 
      hasAccess: !!spotify_access.value, 
      hasRefresh: !!spotify_refresh.value 
    });
    
    if (!spotify_access.value || !spotify_refresh.value) {
      return { userUnauthorized: true };
    }

    const updateTokens = (newAccess: string, newRefresh?: string) => {
      spotify_access.value = newAccess;
      if (newRefresh) spotify_refresh.value = newRefresh;
    };

    return {
      spotifyService: new SpotifyService(spotify_access.value, spotify_refresh.value, updateTokens),
      ImageService: new ImageService(),
      userUnauthorized: false
    }
  })
  .get('/top', async ({ query, spotifyService, userUnauthorized, set }) => {
    if (userUnauthorized) {
      set.status = 401;
      return { error: 'userUnauthorized, Please login first' };
    }
    const type = (query.type as string) || 'tracks';
    const timeRange = (query.timeRange as string) || 'medium_term';
    const limit = parseInt((query.limit as string) || '5', 10);
    let data: any[] = [];

    if (!spotifyService) {
        set.status = 401;
        return { error: 'Spotify service not initialized' };
    }

    if (type === "artists") data = await spotifyService.getTopArtists(timeRange, limit);
    else if (type === 'tracks') data = await spotifyService.getTopTracks(timeRange, limit);
    else {
        set.status = 400;
        return { error: "Invalid type" };
    }
    return { type, items: data };
  }, {
    query: t.Object({ type: t.Optional(t.String()), timeRange: t.Optional(t.String()), limit: t.Optional(t.String()) })
  })
  .get('/me', async ({ spotifyService, set, userUnauthorized }) => {
    if (userUnauthorized || !spotifyService) {
        set.status = 401;
        return { error: 'Unauthorized' };
    }
    return await spotifyService.getUserProfile();
  })
  .get('/generate-image', async ({ query, spotifyService, ImageService, set, userUnauthorized }) => {
    if (userUnauthorized) {
        set.status = 401;
        return { error: 'Unauthorized. Please /auth/login first.' };
    }

    const type = (query.type as string) || 'tracks';
    const timeRange = (query.timeRange as string) || 'medium_term';
    const limit = parseInt((query.limit as string) || '5', 10);
    let items: any[] = [];

    try {
      if (!spotifyService || !ImageService) {
        set.status = 401;
        return { error: 'Services not initialized' };
      }

      if (type === 'artists') items = await spotifyService.getTopArtists(timeRange, limit);
      else if (type === 'tracks') items = await spotifyService.getTopTracks(timeRange, limit);
      else {
          set.status = 400;
          return { error: 'Invalid type. Use artists or tracks' };
      }

      const stringItems = items.map(i => `${i.name} by ${i.subtitle}`);

      // If raw flag is enabled, we skip the server-side text overlay.
      if (query.raw === 'true') {
        const base64Image = await ImageService.generateImage(stringItems, type);
        return { success: true, base64: `data:image/jpeg;base64,${base64Image}` };
      }

      // 1. Generate aesthetic base64 background using Gemini
      const base64Image = await ImageService.generateImage(stringItems, type);

      // 2. Overlay text using SVG
      const finalSvg = ImageService.createSVGOverlay(base64Image, stringItems, type);

      // 3. Serve as image file 
      set.headers['Content-Type'] = 'image/svg+xml';

      // If download=true is passed, force file download
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
