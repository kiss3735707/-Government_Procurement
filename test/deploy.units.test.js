import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('deploy');

describe('deploy units', () => {
  it('schedules collect at 17:00 and digest at 18:00', () => {
    const collect = readFileSync(resolve(root, 'zfcg-collect.timer'), 'utf8');
    const digest = readFileSync(resolve(root, 'zfcg-digest.timer'), 'utf8');
    assert.match(collect, /OnCalendar=\*-\*-\* 17:00:00/);
    assert.match(digest, /OnCalendar=\*-\*-\* 18:00:00/);
  });

  it('keeps backups 30 days and dumps via pg_dump', () => {
    const sh = readFileSync(resolve(root, 'backup.sh'), 'utf8');
    assert.match(sh, /pg_dump/);
    assert.match(sh, /mtime \+30/);
  });
});
