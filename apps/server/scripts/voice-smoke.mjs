// End-to-end Listen check: opens /voice-test in headless Chromium, clicks Listen,
// and verifies speech is heard, then that the session stops cleanly.
// Requires the server running (npm run dev) with ENABLE_VOICE_TEST_PAGE=true.
// Usage: node scripts/voice-smoke.mjs [example_id] [base_url]
import { chromium } from 'playwright';

const exampleId = process.argv[2] ?? 'sample_001';
const baseUrl = process.argv[3] ?? 'http://localhost:3000';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page]', e.message));

try {
  // "request:<id>" speaks a stored /api/explain answer instead of a dataset example.
  const requestId = exampleId.startsWith('request:') ? exampleId.slice(8) : null;
  await page.goto(`${baseUrl}/voice-test${requestId ? `?request_id=${encodeURIComponent(requestId)}` : ''}`);
  await page.waitForFunction(() => document.querySelectorAll('#example option').length > 0, null, { timeout: 15000 });
  if (!requestId) await page.selectOption('#example', exampleId);
  await page.click('#listen');

  const started = Date.now();
  let state;
  while (Date.now() - started < 90000) {
    state = await page.evaluate(() => window.testState);
    if (state.error) throw new Error(state.error);
    if (state.firstAudioMs !== null && Date.now() - state.lastLoudAt > 3000) break;
    await page.waitForTimeout(250);
  }
  if (state.firstAudioMs === null) throw new Error('No speech heard within 90 s');
  const speechSeconds = ((state.lastLoudAt - started) / 1000 - state.firstAudioMs / 1000).toFixed(1);

  await page.click('#stop');
  await page.waitForFunction(() => window.testState.phase === 'stopped', null, { timeout: 15000 });

  console.log((await page.textContent('#log')).trim());
  console.log(`\nPASS ${exampleId}: first speech after ${state.firstAudioMs} ms, ~${speechSeconds} s of speech`);
} catch (error) {
  console.log((await page.textContent('#log').catch(() => '')).trim());
  console.error(`\nFAIL ${exampleId}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
