import { readFile, writeFile } from 'node:fs/promises';

const outputPath = new URL('../assets/data/playlist.json', import.meta.url);
const playlistUrl = process.env.NETEASE_PLAYLIST_URL || '';

function extractPlaylistId(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const idMatch = trimmed.match(/[?&#]id=(\d+)/) || trimmed.match(/playlist\/(\d+)/) || trimmed.match(/^(\d+)$/);
  return idMatch ? idMatch[1] : '';
}

function normalizeTrack(track) {
  const artists = track.artists || track.ar || [];
  const album = track.album || track.al || {};
  const id = track.id;

  return {
    title: track.name || '未知歌曲',
    artist: artists.map((artist) => artist.name).filter(Boolean).join(' / ') || '未知歌手',
    album: album.name || '',
    cover: normalizeCoverUrl(album.picUrl || album.pic_str || album.pic),
    url: id ? `https://music.163.com/#/song?id=${id}` : 'https://music.163.com/'
  };
}

function normalizeCoverUrl(value) {
  if (!value) {
    return 'assets/img/gallery/music-placeholder.svg';
  }

  return String(value).replace(/^http:\/\//, 'https://');
}

async function readExistingPlaylist() {
  try {
    return JSON.parse(await readFile(outputPath, 'utf8'));
  } catch {
    return {
      source: playlistUrl,
      updatedAt: new Date().toISOString(),
      tracks: []
    };
  }
}

async function fetchPlaylist(id) {
  const apiUrl = `https://music.163.com/api/playlist/detail?id=${id}`;
  const response = await fetch(apiUrl, {
    headers: {
      Referer: 'https://music.163.com/',
      'User-Agent': 'Mozilla/5.0 LukaHomepageBot/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Netease API returned ${response.status}`);
  }

  const data = await response.json();
  const playlist = data.result || data.playlist;
  const tracks = playlist?.tracks || [];

  if (!tracks.length) {
    throw new Error('Netease playlist returned no tracks');
  }

  return tracks.map(normalizeTrack);
}

const playlistId = extractPlaylistId(playlistUrl);
const existing = await readExistingPlaylist();

if (!playlistId) {
  console.log('NETEASE_PLAYLIST_URL is empty or invalid. Keeping existing playlist.json.');
  process.exit(0);
}

try {
  const tracks = await fetchPlaylist(playlistId);
  const nextPlaylist = {
    source: playlistUrl,
    updatedAt: new Date().toISOString(),
    tracks
  };

  await writeFile(outputPath, `${JSON.stringify(nextPlaylist, null, 2)}\n`, 'utf8');
  console.log(`Updated playlist.json with ${tracks.length} tracks.`);
} catch (error) {
  const fallback = {
    ...existing,
    source: playlistUrl || existing.source,
    lastSyncError: error.message,
    lastSyncFailedAt: new Date().toISOString()
  };

  await writeFile(outputPath, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
  console.error(`Playlist sync failed: ${error.message}`);
  process.exitCode = 0;
}
