import type { MaxInt } from '@spotify/web-api-ts-sdk';
import { z } from 'zod';
import type { SpotifyHandlerExtra, tool } from './types.js';
import { formatDuration, handleSpotifyRequest } from './utils.js';

const getCurrentUserProfile: tool<Record<string, never>> = {
  name: 'getCurrentUserProfile',
  description:
    "Get the current user's Spotify profile including display name, country, and account type",
  schema: {},
  handler: async (_args, _extra: SpotifyHandlerExtra) => {
    try {
      const profile = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.currentUser.profile();
      });

      return {
        content: [
          {
            type: 'text',
            text:
              `# Your Spotify Profile\n\n` +
              `**Name**: ${profile.display_name ?? 'N/A'}\n` +
              `**ID**: ${profile.id}\n` +
              `**Country**: ${profile.country ?? 'N/A'}\n` +
              `**Email**: ${profile.email ?? 'N/A'}\n` +
              `**Account Type**: ${profile.product ?? 'N/A'}\n` +
              `**Followers**: ${profile.followers?.total?.toLocaleString() ?? 'N/A'}\n` +
              `**URL**: ${profile.external_urls?.spotify ?? ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting user profile: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

const getUserTopItems: tool<{
  type: z.ZodEnum<['artists', 'tracks']>;
  timeRange: z.ZodOptional<
    z.ZodEnum<['short_term', 'medium_term', 'long_term']>
  >;
  limit: z.ZodOptional<z.ZodNumber>;
}> = {
  name: 'getUserTopItems',
  description:
    "Get the user's top artists or tracks over different time ranges. Use this to understand the user's taste for playlist building.",
  schema: {
    type: z
      .enum(['artists', 'tracks'])
      .describe('Whether to fetch top artists or top tracks'),
    timeRange: z
      .enum(['short_term', 'medium_term', 'long_term'])
      .optional()
      .describe(
        'Time range: short_term (~4 weeks), medium_term (~6 months), long_term (all time). Defaults to medium_term.',
      ),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe('Number of items to return (1-50)'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { type, timeRange = 'medium_term', limit = 20 } = args;

    try {
      const result = await handleSpotifyRequest(async (spotifyApi) => {
        return await spotifyApi.currentUser.topItems(
          type,
          timeRange,
          limit as MaxInt<50>,
        );
      });

      const timeLabel =
        timeRange === 'short_term'
          ? 'Last ~4 Weeks'
          : timeRange === 'medium_term'
            ? 'Last ~6 Months'
            : 'All Time';

      let formatted = '';

      if (type === 'artists') {
        formatted = result.items
          .map((artist: any, i: number) => {
            const genres = artist.genres?.slice(0, 3).join(', ') ?? 'N/A';
            return `${i + 1}. ${artist.name} — Genres: ${genres} — Popularity: ${artist.popularity} — ID: ${artist.id}`;
          })
          .join('\n');
      } else {
        formatted = result.items
          .map((track: any, i: number) => {
            const artists = track.artists
              .map((a: any) => a.name)
              .join(', ');
            const duration = formatDuration(track.duration_ms);
            return `${i + 1}. "${track.name}" by ${artists} (${duration}) — Popularity: ${track.popularity} — ID: ${track.id}`;
          })
          .join('\n');
      }

      return {
        content: [
          {
            type: 'text',
            text: `# Your Top ${type === 'artists' ? 'Artists' : 'Tracks'} (${timeLabel})\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting top ${type}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

export const userTools = [getCurrentUserProfile, getUserTopItems];
