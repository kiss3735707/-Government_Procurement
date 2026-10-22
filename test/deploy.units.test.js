import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('deploy');

describe('deploy units', () => {
  it('daily collect still starts index.js with no date argument', () => {
    const unit = readFileSync(resolve(root, 'zfcg-collect.service'), 'utf8');
    assert.match(unit, /ExecStart=\/usr\/bin\/env node \/opt\/zfcg\/src\/index\.js --no-save\s*$/m);
  });

  it('schedules collect at 17:00 and digest at 18:00', () => {
    const collect = readFileSync(resolve(root, 'zfcg-collect.timer'), 'utf8');
    const digest = readFileSync(resolve(root, 'zfcg-digest.timer'), 'utf8');
    assert.match(collect, /OnCalendar=\*-\*-\* 17:00:00/);
    assert.match(digest, /OnCalendar=\*-\*-\* 18:00:00/);
  });

  it('schedules daily tagging at 20:00 without touching collect or digest', () => {
    const timer = readFileSync(resolve(root, 'zfcg-tag-daily.timer'), 'utf8');
    const service = readFileSync(resolve(root, 'zfcg-tag-daily.service'), 'utf8');
    const digest = readFileSync(resolve(root, 'zfcg-digest.service'), 'utf8');
    assert.match(timer, /OnCalendar=\*-\*-\* 20:00:00/);
    assert.match(service, /ExecStart=\/usr\/bin\/env node \/opt\/zfcg\/src\/tag-awards\.js --today\s*$/m);
    assert.equal(service.includes('digest.js'), false);
    assert.match(digest, /ExecStart=\/usr\/bin\/env node \/opt\/zfcg\/src\/digest\.js run --send/);
    const install = readFileSync(resolve(root, 'install.sh'), 'utf8');
    assert.match(install, /zfcg-collect\.timer zfcg-digest\.timer zfcg-backup\.timer zfcg-tag-daily\.timer/);
  });

  it('keeps backups 30 days and dumps via pg_dump', () => {
    const sh = readFileSync(resolve(root, 'backup.sh'), 'utf8');
    assert.match(sh, /pg_dump/);
    assert.match(sh, /mtime \+30/);
  });
});
