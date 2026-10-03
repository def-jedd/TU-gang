/// <reference types="node" />
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { PHILIPPINE_LANGUAGE_NAMES } from './philippineLanguages.ts';

it('keeps the sourced future-language catalog distinct from supported Tagalog', () => {
  const names = [...PHILIPPINE_LANGUAGE_NAMES];
  assert.equal(names.length, 195);
  assert.equal(new Set(names.map((name) => name.toLocaleLowerCase())).size, names.length);
  assert.ok(!names.some((name) => name.toLocaleLowerCase() === 'tagalog'));
  assert.ok(names.includes('Coastal-Naga Bikol'));
  assert.ok(names.includes('Cebuano'));
  assert.ok(names.includes('Philippine Sign Language'));
});
