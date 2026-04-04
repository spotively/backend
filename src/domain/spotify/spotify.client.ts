import { env } from "../../config/env";

export const getSpotifyBasicAuth = () =>
  `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`

export const refreshAccessToken = async (refreshToken: string) => {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: getSpotifyBasicAuth()
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Spotify client');
  }
  return response.json();
}

export const spotifyFetch = async (
  endpoint: string,
  accessToken: string,
  refreshToken: string,
  updateCookies: (newAccess: string, newRefresh?: string) => void,
  retries = 5
): Promise<any> => {
  let currentToken = accessToken;
  let delayMs = 1000;

  for (let i = 0; i < retries; i++) {
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delayMs;
      console.warn(`[Spotify] 429 Rate Limit Hit. Waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      delayMs *= 2;
      continue;
    }

    if (response.status === 401) {
      console.log(`[Spotify] Token expired. Attempting refresh...`);
      try {
        const tokens = await refreshAccessToken(refreshToken);
        currentToken = tokens.access_token;
        updateCookies(tokens.access_token, tokens.refresh_token);
        continue;
      } catch (err) {
        throw new Error('Token token failed, User must reauthenticate');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Spotify API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
  }

  throw new Error('Max retries exceeded for Spotify');
}
