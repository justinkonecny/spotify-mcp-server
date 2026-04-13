import { z } from 'zod';
import type { SpotifyHandlerExtra, tool } from './types.js';
import { formatDuration, spotifyRawFetch } from './utils.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTrackList(tracks: any[]): string {
  return tracks
    .map((track, i) => {
      const artists = Array.isArray(track.artists)
        ? track.artists.map((a: any) => a.name).join(', ')
        : 'Unknown';
      const duration =
        typeof track.duration_ms === 'number'
          ? formatDuration(track.duration_ms)
          : '?:??';
      const popularity =
        typeof track.popularity === 'number' ? ` — Pop: ${track.popularity}` : '';
      return `${i + 1}. "${track.name}" by ${artists} (${duration})${popularity} — ID: ${track.id}`;
    })
    .join('\n');
}

// ─── getRecommendations ───────────────────────────────────────────────────────

const getRecommendations: tool<{
  seedTracks: z.ZodOptional<z.ZodArray<z.ZodString>>;
  seedArtists: z.ZodOptional<z.ZodArray<z.ZodString>>;
  seedGenres: z.ZodOptional<z.ZodArray<z.ZodString>>;
  limit: z.ZodOptional<z.ZodNumber>;
  // Popularity — key for discovery
  minPopularity: z.ZodOptional<z.ZodNumber>;
  maxPopularity: z.ZodOptional<z.ZodNumber>;
  targetPopularity: z.ZodOptional<z.ZodNumber>;
  // Energy (0.0–1.0) — driving = 0.6–0.9
  minEnergy: z.ZodOptional<z.ZodNumber>;
  maxEnergy: z.ZodOptional<z.ZodNumber>;
  targetEnergy: z.ZodOptional<z.ZodNumber>;
  // Valence / positivity (0.0–1.0) — upbeat = 0.6+
  minValence: z.ZodOptional<z.ZodNumber>;
  maxValence: z.ZodOptional<z.ZodNumber>;
  targetValence: z.ZodOptional<z.ZodNumber>;
  // Tempo / BPM
  minTempo: z.ZodOptional<z.ZodNumber>;
  maxTempo: z.ZodOptional<z.ZodNumber>;
  targetTempo: z.ZodOptional<z.ZodNumber>;
  // Danceability (0.0–1.0)
  minDanceability: z.ZodOptional<z.ZodNumber>;
  maxDanceability: z.ZodOptional<z.ZodNumber>;
  targetDanceability: z.ZodOptional<z.ZodNumber>;
  // Acousticness (0.0–1.0) — folk/acoustic = 0.5+
  minAcousticness: z.ZodOptional<z.ZodNumber>;
  maxAcousticness: z.ZodOptional<z.ZodNumber>;
  targetAcousticness: z.ZodOptional<z.ZodNumber>;
  // Instrumentalness (0.0–1.0) — songs with vocals = 0.0
  maxInstrumentalness: z.ZodOptional<z.ZodNumber>;
  // Speechiness (0.0–1.0) — pure music = < 0.33
  maxSpeechiness: z.ZodOptional<z.ZodNumber>;
}> = {
  name: 'getRecommendations',
  description:
    'Get personalized track recommendations from Spotify using seed tracks, artists, or genres, tuned by audio characteristics. ' +
    'Use seedTracks from getUserTopItems for personalized results. ' +
    'For driving/singable playlists: targetEnergy=0.7, targetValence=0.7, targetTempo=120. ' +
    'For discovery (not chart hits): maxPopularity=50. ' +
    'Returns up to 100 tracks with IDs ready to add to a playlist.',
  schema: {
    seedTracks: z
      .array(z.string())
      .max(5)
      .optional()
      .describe('Up to 5 Spotify track IDs as seeds (combined with seedArtists + seedGenres, total max 5)'),
    seedArtists: z
      .array(z.string())
      .max(5)
      .optional()
      .describe('Up to 5 Spotify artist IDs as seeds'),
    seedGenres: z
      .array(z.string())
      .max(5)
      .optional()
      .describe('Up to 5 genre slug strings as seeds (use getAvailableGenreSeeds for valid values)'),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe('Number of tracks to return (1–100, default 20)'),
    minPopularity: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Minimum track popularity (0–100)'),
    maxPopularity: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Maximum track popularity — set to 50 to favour discovery over chart hits'),
    targetPopularity: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe('Target track popularity (0–100)'),
    minEnergy: z.number().min(0).max(1).optional().describe('Minimum energy (0.0–1.0)'),
    maxEnergy: z.number().min(0).max(1).optional().describe('Maximum energy (0.0–1.0)'),
    targetEnergy: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Target energy — 0.7 is good for driving'),
    minValence: z.number().min(0).max(1).optional().describe('Minimum valence/positivity (0.0–1.0)'),
    maxValence: z.number().min(0).max(1).optional().describe('Maximum valence/positivity (0.0–1.0)'),
    targetValence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Target valence/positivity — 0.7 is upbeat/happy'),
    minTempo: z.number().optional().describe('Minimum tempo in BPM'),
    maxTempo: z.number().optional().describe('Maximum tempo in BPM'),
    targetTempo: z
      .number()
      .optional()
      .describe('Target tempo in BPM — 110–130 is good for driving'),
    minDanceability: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Minimum danceability (0.0–1.0)'),
    maxDanceability: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Maximum danceability (0.0–1.0)'),
    targetDanceability: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Target danceability (0.0–1.0)'),
    minAcousticness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Minimum acousticness (0.0–1.0)'),
    maxAcousticness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Maximum acousticness (0.0–1.0)'),
    targetAcousticness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Target acousticness — 0.3–0.6 for folk-leaning indie'),
    maxInstrumentalness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Maximum instrumentalness — set to 0.1 to ensure tracks have vocals'),
    maxSpeechiness: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Maximum speechiness — set to 0.33 to exclude rap/spoken word'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const {
      seedTracks,
      seedArtists,
      seedGenres,
      limit = 20,
      ...audioParams
    } = args;

    const totalSeeds =
      (seedTracks?.length ?? 0) +
      (seedArtists?.length ?? 0) +
      (seedGenres?.length ?? 0);

    if (totalSeeds === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: At least one seed (seedTracks, seedArtists, or seedGenres) is required',
          },
        ],
      };
    }

    if (totalSeeds > 5) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Total seeds must be 5 or fewer (got ${totalSeeds})`,
          },
        ],
      };
    }

    try {
      const params: Record<string, string | number> = { limit };
      if (seedTracks?.length) params.seed_tracks = seedTracks.join(',');
      if (seedArtists?.length) params.seed_artists = seedArtists.join(',');
      if (seedGenres?.length) params.seed_genres = seedGenres.join(',');

      // Map camelCase params to snake_case API params
      const paramMap: Record<string, string> = {
        minPopularity: 'min_popularity',
        maxPopularity: 'max_popularity',
        targetPopularity: 'target_popularity',
        minEnergy: 'min_energy',
        maxEnergy: 'max_energy',
        targetEnergy: 'target_energy',
        minValence: 'min_valence',
        maxValence: 'max_valence',
        targetValence: 'target_valence',
        minTempo: 'min_tempo',
        maxTempo: 'max_tempo',
        targetTempo: 'target_tempo',
        minDanceability: 'min_danceability',
        maxDanceability: 'max_danceability',
        targetDanceability: 'target_danceability',
        minAcousticness: 'min_acousticness',
        maxAcousticness: 'max_acousticness',
        targetAcousticness: 'target_acousticness',
        maxInstrumentalness: 'max_instrumentalness',
        maxSpeechiness: 'max_speechiness',
      };

      for (const [camel, snake] of Object.entries(paramMap)) {
        const val = (audioParams as any)[camel];
        if (val !== undefined) params[snake] = val;
      }

      const data = (await spotifyRawFetch('/recommendations', params)) as any;
      const tracks: any[] = data?.tracks ?? [];

      if (tracks.length === 0) {
        return {
          content: [{ type: 'text', text: 'No recommendations found for these seeds/parameters' }],
        };
      }

      const formatted = formatTrackList(tracks);
      const seedSummary = [
        seedTracks?.length ? `tracks: ${seedTracks.join(', ')}` : '',
        seedArtists?.length ? `artists: ${seedArtists.join(', ')}` : '',
        seedGenres?.length ? `genres: ${seedGenres.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const paramSummary = Object.entries(audioParams)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');

      return {
        content: [
          {
            type: 'text',
            text:
              `# Recommendations (${tracks.length} tracks)\n` +
              `Seeds: ${seedSummary}\n` +
              (paramSummary ? `Tuning: ${paramSummary}\n` : '') +
              `\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting recommendations: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

// ─── getAudioFeatures ────────────────────────────────────────────────────────

const getAudioFeatures: tool<{
  trackIds: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString>]>;
}> = {
  name: 'getAudioFeatures',
  description:
    'Get audio features (BPM/tempo, energy, danceability, valence, acousticness, key, mode) for one or more tracks. ' +
    'Useful for understanding the sound profile of songs in a playlist before making recommendations.',
  schema: {
    trackIds: z
      .union([z.string(), z.array(z.string()).max(100)])
      .describe('A single track ID or array of track IDs (max 100)'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const ids = Array.isArray(args.trackIds) ? args.trackIds : [args.trackIds];

    try {
      const data = (await spotifyRawFetch('/audio-features', {
        ids: ids.join(','),
      })) as any;

      const features: any[] = data?.audio_features ?? (data ? [data] : []);
      const valid = features.filter(Boolean);

      if (valid.length === 0) {
        return {
          content: [{ type: 'text', text: 'No audio features returned — this endpoint may be unavailable for your app.' }],
        };
      }

      const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

      const formatted = valid
        .map((f, i) => {
          const key = f.key >= 0 ? `${keyNames[f.key]} ${f.mode === 1 ? 'major' : 'minor'}` : 'unknown';
          return (
            `${i + 1}. ID: ${f.id}\n` +
            `   Tempo: ${f.tempo?.toFixed(0)} BPM | Energy: ${f.energy?.toFixed(2)} | Valence: ${f.valence?.toFixed(2)} | Danceability: ${f.danceability?.toFixed(2)}\n` +
            `   Acousticness: ${f.acousticness?.toFixed(2)} | Instrumentalness: ${f.instrumentalness?.toFixed(2)} | Speechiness: ${f.speechiness?.toFixed(2)}\n` +
            `   Key: ${key} | Loudness: ${f.loudness?.toFixed(1)} dB | Duration: ${formatDuration(f.duration_ms)}`
          );
        })
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Audio Features (${valid.length} track${valid.length === 1 ? '' : 's'})\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting audio features: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

// ─── getAvailableGenreSeeds ───────────────────────────────────────────────────

const getAvailableGenreSeeds: tool<Record<string, never>> = {
  name: 'getAvailableGenreSeeds',
  description:
    'Get all available genre seed strings that can be used with getRecommendations. ' +
    'Use these exact strings in the seedGenres parameter.',
  schema: {},
  handler: async (_args, _extra: SpotifyHandlerExtra) => {
    try {
      const data = (await spotifyRawFetch(
        '/recommendations/available-genre-seeds',
      )) as any;

      const genres: string[] = data?.genres ?? [];

      if (genres.length === 0) {
        return {
          content: [{ type: 'text', text: 'No genre seeds returned — endpoint may be unavailable.' }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `# Available Genre Seeds (${genres.length})\n\n${genres.join(', ')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting genre seeds: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

// ─── getNewReleases ───────────────────────────────────────────────────────────

const getNewReleases: tool<{
  limit: z.ZodOptional<z.ZodNumber>;
  country: z.ZodOptional<z.ZodString>;
}> = {
  name: 'getNewReleases',
  description: 'Get a list of new album releases — useful for discovering recently dropped music.',
  schema: {
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe('Number of albums to return (1–50, default 20)'),
    country: z
      .string()
      .optional()
      .describe('ISO 3166-1 alpha-2 country code (e.g. "US")'),
  },
  handler: async (args, _extra: SpotifyHandlerExtra) => {
    const { limit = 20, country } = args;

    try {
      const data = (await spotifyRawFetch('/browse/new-releases', {
        limit,
        ...(country ? { country } : {}),
      })) as any;

      const albums: any[] = data?.albums?.items ?? [];

      if (albums.length === 0) {
        return {
          content: [{ type: 'text', text: 'No new releases found.' }],
        };
      }

      const formatted = albums
        .map((album, i) => {
          const artists = album.artists?.map((a: any) => a.name).join(', ') ?? 'Unknown';
          return `${i + 1}. "${album.name}" by ${artists} (${album.release_date}) [${album.album_type}] — ID: ${album.id}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `# New Releases\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting new releases: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  },
};

// ─── getRelatedArtists (direct fetch fallback) ────────────────────────────────
// Already implemented in artists.ts via SDK — this raw version is kept
// as a fallback in case the SDK wrapper stops working for deprecated endpoints.

// ─── Exports ─────────────────────────────────────────────────────────────────

export const discoverTools = [
  getRecommendations,
  getAudioFeatures,
  getAvailableGenreSeeds,
  getNewReleases,
];
