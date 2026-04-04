import { spotifyFetch } from "./spotify.client";

export class SpotifyService {
  constructor(
    private accessToken: string,
    private refreshToken: string,
    private updateTokens: (acc: string, ref?: string) => void,
  ) { }

  async getTopTracks(timeRange: string = 'medium_term', limit: number = 5) {
    const data = await spotifyFetch(
      `/me/top/tracks?limit=${limit}&time_range=${timeRange}`,
      this.accessToken,
      this.refreshToken,
      this.updateTokens,
    );

    return data.items.map((track: any) => ({
      name: track.name,
      subtitle: track.artists[0]?.name || 'Unknown Artist',
      image: track.album?.images?.[0]?.url || ''
    }));
  }

  async getTopArtists(timeRange: string = 'medium_term', limit: number = 5) {

    const data = await spotifyFetch(
      `/me/top/artists?limit=${limit}&time_range=${timeRange}`,
      this.accessToken,
      this.refreshToken,
      this.updateTokens
    );

    return data.items.map((artist: any) => ({
      name: artist.name,
      subtitle: 'Artist',
      image: artist.images?.[0]?.url || ''
    }));
  }

  async getUserProfile() {
    const data = await spotifyFetch(
      `/me`,
      this.accessToken,
      this.refreshToken,
      this.updateTokens
    );

    return {
      name: data.display_name,
      image: data.images?.[0]?.url || ''
    };
  }
}
