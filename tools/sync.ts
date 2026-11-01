import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { diffLines } from 'diff';
import type { youtube_v3 } from 'googleapis';
import { abs, descriptionFor, formatProblem, listSlugs, loadChannel, loadVideo } from './lib/load.ts';
import type { Video } from './lib/load.ts';
import { formatKeywords } from './lib/rules.ts';
import type { Problem } from './lib/rules.ts';
import type { Channel } from './lib/schema.ts';
import { planChannel, planVideo } from './lib/sync-plan.ts';
import type { Change } from './lib/sync-plan.ts';
import { loadEnv, youtubeClient } from './lib/youtube.ts';

const STATE_FILE = 'channel/.sync-state.json';

interface SyncState {
  // Videos sync has already released. Visibility is only ever set once, so a video
  // pulled in Studio isn't made public again by the next merge.
  released?: string[];
}

const readState = (): SyncState =>
  existsSync(abs(STATE_FILE)) ? JSON.parse(readFileSync(abs(STATE_FILE), 'utf8')) : {};

const writeState = (state: SyncState) =>
  writeFileSync(abs(STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);

function printChange({ field, from, to }: Change) {
  console.log(`  ${field}:`);
  for (const part of diffLines(from ? `${from}\n` : '', `${to}\n`)) {
    const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
    for (const line of part.value.trimEnd().split('\n')) console.log(`    ${prefix}${line}`);
  }
}

async function fetchVideos(youtube: youtube_v3.Youtube, ids: string[]) {
  const videos = new Map<string, youtube_v3.Schema$Video>();
  for (let i = 0; i < ids.length; i += 50) {
    const { data } = await youtube.videos.list({ part: ['snippet', 'status'], id: ids.slice(i, i + 50) });
    for (const item of data.items ?? []) {
      if (item.id) videos.set(item.id, item);
    }
  }
  return videos;
}

const needsRelease = (video: Video, state: SyncState) =>
  video.meta.status === 'published' && !state.released?.includes(video.meta.youtube_id!);

async function syncVideos(youtube: youtube_v3.Youtube, videos: Video[], channel: Channel, state: SyncState, apply: boolean) {
  const failures: string[] = [];
  const existing = await fetchVideos(youtube, videos.map((video) => video.meta.youtube_id!));

  for (const video of videos) {
    const id = video.meta.youtube_id!;
    const current = existing.get(id);
    if (!current) {
      failures.push(`${video.slug}: video ${id} not found on YouTube (wrong ID, or not visible to this account)`);
      continue;
    }
    const release = needsRelease(video, state);
    const plan = planVideo(
      current,
      { title: video.meta.title, description: descriptionFor(video, channel), tags: video.meta.tags },
      release,
    );
    if (plan) {
      console.log(`${video.slug}: ${apply ? 'updating' : 'would update'}`);
      plan.changes.forEach(printChange);
    } else {
      console.log(`${video.slug}: up to date`);
    }
    if (!apply) continue;
    try {
      if (plan) {
        await youtube.videos.update({
          part: plan.parts,
          requestBody: { id, snippet: plan.snippet, status: plan.status },
        });
      }
      if (release) state.released = [...(state.released ?? []), id];
    } catch (error) {
      failures.push(`${video.slug}: ${(error as Error).message}`);
    }
  }
  return failures;
}

async function syncChannel(youtube: youtube_v3.Youtube, channel: Channel, apply: boolean) {
  const { data } = await youtube.channels.list({ part: ['brandingSettings'], mine: true });
  const current = data.items?.[0];
  if (!current?.id) throw new Error('No channel found for this account. Did you authorize the right one?');

  const plan = planChannel(current.brandingSettings ?? {}, {
    description: channel.description.trim(),
    keywords: formatKeywords(channel.keywords),
  });
  if (plan.changes.length === 0) {
    console.log('channel: up to date');
    return;
  }
  console.log(`channel: ${apply ? 'updating' : 'would update'}`);
  plan.changes.forEach(printChange);
  if (!apply) return;

  await youtube.channels.update({
    part: ['brandingSettings'],
    requestBody: { id: current.id, brandingSettings: plan.branding },
  });
}

const { values } = parseArgs({ options: { apply: { type: 'boolean' }, 'dry-run': { type: 'boolean' } } });
if (values.apply && values['dry-run']) {
  console.error('--apply and --dry-run are mutually exclusive.');
  process.exit(1);
}
const apply = Boolean(values.apply);
console.log(apply ? 'Sync: applying changes to YouTube.\n' : 'Sync: dry run, nothing will change. Pass --apply to write.\n');

loadEnv();
const problems: Problem[] = [];
const channel = loadChannel(problems);
const allVideos = listSlugs().flatMap((slug) => loadVideo(slug, problems) ?? []);
const linked = allVideos.filter((video) => video.meta.youtube_id);
const videos = linked.filter((video) => !video.meta.sample);
for (const video of videos) {
  if (video.body === undefined) {
    problems.push({ file: `videos/${video.slug}/description.md`, message: 'is required once youtube_id is set' });
  }
}
if (!channel || problems.length > 0) {
  console.error(problems.map(formatProblem).join('\n'));
  process.exit(1);
}
for (const video of linked) {
  if (video.meta.sample) console.log(`${video.slug}: skipped (sample)`);
}

const state = readState();

const youtube = youtubeClient();
if (!youtube) {
  if (apply) {
    console.error('YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN must be set to use --apply.');
    process.exit(1);
  }
  console.log('\nNo YouTube credentials, so this compares nothing against the live channel. Local plan:');
  for (const video of videos) {
    const release = needsRelease(video, state) ? ' (would make public if it is not already)' : '';
    console.log(`  video ${video.meta.youtube_id}: ${video.slug}${release}`);
  }
  console.log(`  channel description and keywords from channel.yaml`);
  process.exit(0);
}

const failures = await syncVideos(youtube, videos, channel, state, apply);
try {
  await syncChannel(youtube, channel, apply);
} catch (error) {
  failures.push(`channel: ${(error as Error).message}`);
}
if (apply) writeState(state);

if (failures.length > 0) {
  console.error(`\n${failures.length} failure${failures.length === 1 ? '' : 's'}:`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log('\nDone.');
