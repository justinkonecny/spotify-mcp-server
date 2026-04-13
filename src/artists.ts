import type { MaxInt } from '@spotify/web-api-ts-sdk';
import { z } from 'zod';
import type { SpotifyHandlerExtra, tool } from './types.js';
import { formatDuration, handleSpotifyRequest } from './utils.js';

const getArtist: tool<{
  artistId: z.ZodString;
}> = {
  name: 'getArtist',
  description:
    'Get detailed information about an artist including genres, followers, and popularity',
  schema: {
    artistId: z.string().describe('The Spotify ID of the artist'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { artistId } = args;

    try {
      const artist = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.artists.get(artistId);
      });

      const genres = artist.genres?.length ? artist.genres.join(', ') : 'N/A';
      const followers = artist.followers?.total?.toLocaleString() ?? 'N/A';

      return {
        content: [
          {
            type: 'text',
            text:
              `# Artist: ${artist.name}\n\n` +
              `**Genres**: ${genres}\n` +
              `**Followers**: ${followers}\n` +
              `**Popularity**: ${artist.popularity}/100\n` +
              `**ID**: ${artist.id}\n` +
              `**URL**: ${artist.external_urls?.spotify ?? ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting artist: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

const getArtistTopTracks: tool<{
  artistId: z.ZodString;
}> = {
  name: 'getArtistTopTracks',
  description: "Get an artist's top tracks",
  schema: {
    artistId: z.string().describe('The Spotify ID of the artist'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { artistId } = args;

    try {
      const result = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.artists.topTracks(artistId, 'US');
      });

      const formatted = result.tracks
        .map((track, i) => {
          const artists = track.artists.map((a) => a.name).join(', ');
          const duration = formatDuration(track.duration_ms);
          return `${i + 1}. "${track.name}" by ${artists} (${duration}) - ID: ${track.id}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Top Tracks\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting artist top tracks: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

const getArtistAlbums: tool<{
  artistId: z.ZodString;
  limit: z.ZodOptional<z.ZodNumber>;
  includeGroups: z.ZodOptional<
    z.ZodEnum<['album', 'single', 'appears_on', 'compilation']>
  >;
}> = {
  name: 'getArtistAlbums',
  description: "Get an artist's albums and singles",
  schema: {
    artistId: z.string().describe('The Spotify ID of the artist'),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of albums to return (1-50)'),
    includeGroups: z
      .enum(['album', 'single', 'appears_on', 'compilation'])
      .optional()
      .describe(
        'Filter by album type: album, single, appears_on, or compilation',
      ),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { artistId, limit = 20, includeGroups } = args;

    try {
      const result = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.artists.albums(
          artistId,
          includeGroups,
          undefined,
          limit as MaxInt<50>,
        );
      });

      const formatted = result.items
        .map((album, i) => {
          const artists = album.artists.map((a) => a.name).join(', ');
          return `${i + 1}. "${album.name}" by ${artists} (${album.release_date}) [${album.album_type}] - ID: ${album.id}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Albums (${result.total} total)\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting artist albums: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

const getRelatedArtists: tool<{
  artistId: z.ZodString;
}> = {
  name: 'getRelatedArtists',
  description: 'Get artists similar to a given artist, useful for music discovery',
  schema: {
    artistId: z.string().describe('The Spotify ID of the artist'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { artistId } = args;

    try {
      const result = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.artists.relatedArtists(artistId);
      });

      const formatted = result.artists
        .map((artist, i) => {
          const genres = artist.genres?.slice(0, 3).join(', ') ?? 'N/A';
          return `${i + 1}. ${artist.name} (${genres}) - Popularity: ${artist.popularity} - ID: ${artist.id}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Related Artists\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting related artists: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

export const artistTools = [
  getArtist,
  getArtistTopTracks,
  getArtistAlbums,
  getRelatedArtists,
];
