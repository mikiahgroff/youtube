import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planChannel, planVideo } from './sync-plan.ts';

const current = {
  snippet: {
    title: 'Old',
    description: 'Text\r\nmore\n',
    tags: ['a'],
    categoryId: '28',
    defaultLanguage: 'en',
    defaultAudioLanguage: 'en-US',
    channelId: 'read-only',
  },
  status: {
    privacyStatus: 'private',
    embeddable: false,
    license: 'creativeCommon',
    publicStatsViewable: false,
    publishAt: '2030-01-01T00:00:00Z',
    uploadStatus: 'processed',
    selfDeclaredMadeForKids: false,
  },
};
const same = { title: 'Old', description: 'Text\nmore', tags: ['a'] };

test('planVideo returns nothing when YouTube already matches', () => {
  assert.equal(planVideo(current, same, false), undefined);
});

test('planVideo preserves category and languages, and sends no read-only fields', () => {
  const plan = planVideo(current, { ...same, title: 'New' }, false);
  assert.deepEqual(plan?.changes.map((change) => change.field), ['title']);
  assert.deepEqual(plan?.snippet, {
    title: 'New',
    description: 'Text\nmore',
    tags: ['a'],
    categoryId: '28',
    defaultLanguage: 'en',
    defaultAudioLanguage: 'en-US',
  });
});

test('planVideo never sends the status part unless releasing', () => {
  const plan = planVideo(current, { ...same, title: 'New' }, false);
  assert.deepEqual(plan?.parts, ['snippet']);
  assert.equal(plan?.status, undefined);
});

test('a release goes public in one call and keeps the other status settings', () => {
  const plan = planVideo(current, same, true);
  assert.deepEqual(plan?.parts, ['snippet', 'status']);
  assert.deepEqual(plan?.changes.map((change) => change.field), ['visibility']);
  assert.deepEqual(plan?.status, {
    privacyStatus: 'public',
    embeddable: false,
    license: 'creativeCommon',
    publicStatsViewable: false,
  });
});

test('a release does nothing when the video is already public', () => {
  const live = { ...current, status: { ...current.status, privacyStatus: 'public' } };
  assert.equal(planVideo(live, same, true), undefined);
});

test('planChannel keeps branding it does not own', () => {
  const branding = {
    channel: { title: 'Mine', description: 'Old', keywords: 'a "b c"', unsubscribedTrailer: 'xyz' },
    image: { bannerExternalUrl: 'https://example.com/banner' },
  };
  const plan = planChannel(branding, { description: 'New', keywords: 'a "b c"' });
  assert.deepEqual(plan.changes.map((change) => change.field), ['channel description']);
  assert.equal(plan.branding.channel.unsubscribedTrailer, 'xyz');
  assert.equal(plan.branding.channel.title, 'Mine');
  assert.equal(plan.branding.image?.bannerExternalUrl, 'https://example.com/banner');
});
