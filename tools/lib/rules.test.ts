import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkChapters, checkDescription, checkTitle, tagsLength } from './rules.ts';

const FILE = 'chapters.yaml';
const chapters = (...times: string[]) => times.map((time) => ({ time, title: `at ${time}` }));
const messages = (problems: { message: string }[]) => problems.map((problem) => problem.message).join('\n');

test('accepts valid chapters', () => {
  assert.deepEqual(checkChapters(chapters('00:00', '00:10', '1:00:00'), FILE), []);
});

test('requires three chapters', () => {
  assert.match(messages(checkChapters(chapters('00:00', '00:30'), FILE)), /at least 3/);
});

test('requires the first chapter at 00:00', () => {
  assert.match(messages(checkChapters(chapters('00:05', '00:30', '01:00'), FILE)), /must be 00:00/);
});

test('rejects chapters shorter than 10s', () => {
  assert.match(messages(checkChapters(chapters('00:00', '00:09', '01:00'), FILE)), /9s long/);
});

test('rejects chapters out of order', () => {
  assert.match(messages(checkChapters(chapters('00:00', '02:00', '01:00'), FILE)), /must come after/);
});

test('rejects angle brackets in descriptions and titles', () => {
  assert.match(messages(checkDescription('a <b> c', FILE)), /< or >/);
  assert.match(messages(checkTitle('a > b', FILE)), /< or >/);
});

test('enforces the 5000 character limit', () => {
  assert.deepEqual(checkDescription('x'.repeat(5000), FILE), []);
  assert.match(messages(checkDescription('x'.repeat(5001), FILE)), /5001 characters/);
});

test('counts multi-word tags as quoted', () => {
  assert.equal(tagsLength(['one', 'two words']), 3 + 11 + 1);
});
