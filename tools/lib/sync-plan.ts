import type { youtube_v3 } from 'googleapis';

export interface Change {
  field: string;
  from: string;
  to: string;
}

export interface DesiredVideo {
  title: string;
  description: string;
  tags: string[];
}

// YouTube hands text back with its own line endings and trailing whitespace.
const normalize = (text: string | null | undefined) => (text ?? '').replace(/\r\n/g, '\n').trimEnd();

function changed(field: string, from: string, to: string): Change[] {
  return normalize(from) === normalize(to) ? [] : [{ field, from, to }];
}

// videos.update clears any mutable field left out of a part, so everything that isn't
// ours is copied across. Read-only fields (thumbnails, publishedAt, ...) are left out.
export function planVideo(current: youtube_v3.Schema$Video, desired: DesiredVideo, release: boolean) {
  const { snippet: currentSnippet = {}, status: currentStatus = {} } = current;
  const goPublic = release && currentStatus.privacyStatus !== 'public';
  const changes = [
    ...changed('title', currentSnippet.title ?? '', desired.title),
    ...changed('description', currentSnippet.description ?? '', desired.description),
    ...changed('tags', (currentSnippet.tags ?? []).join('\n'), desired.tags.join('\n')),
    ...(goPublic ? changed('visibility', currentStatus.privacyStatus ?? '', 'public') : []),
  ];
  if (changes.length === 0) return undefined;

  const snippet: youtube_v3.Schema$VideoSnippet = {
    ...desired,
    categoryId: currentSnippet.categoryId,
    defaultLanguage: currentSnippet.defaultLanguage,
    defaultAudioLanguage: currentSnippet.defaultAudioLanguage,
  };
  if (!goPublic) return { changes, parts: ['snippet'], snippet };

  // selfDeclaredMadeForKids and containsSyntheticMedia only change when sent, so they stay out.
  const status: youtube_v3.Schema$VideoStatus = {
    privacyStatus: 'public',
    embeddable: currentStatus.embeddable,
    license: currentStatus.license,
    publicStatsViewable: currentStatus.publicStatsViewable,
  };
  return { changes, parts: ['snippet', 'status'], snippet, status };
}

const keywordTokens = (keywords: string) => (keywords.match(/"[^"]*"|\S+/g) ?? []).join('\n');

export function planChannel(
  current: youtube_v3.Schema$ChannelBrandingSettings,
  desired: { description: string; keywords: string },
) {
  const changes = [
    ...changed('channel description', current.channel?.description ?? '', desired.description),
    ...changed('channel keywords', keywordTokens(current.channel?.keywords ?? ''), keywordTokens(desired.keywords)),
  ];
  return { changes, branding: { ...current, channel: { ...current.channel, ...desired } } };
}
