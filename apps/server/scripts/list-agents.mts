// Lists Agora agents that are still running, to confirm nothing is left using credits.
// Usage: npx tsx scripts/list-agents.mts
import { env } from '../src/lib/env.js';
import { generateConvoAIToken } from 'agora-agents';

const token = generateConvoAIToken({
  appId: env.AGORA_APP_ID,
  appCertificate: env.AGORA_APP_CERTIFICATE,
  channelName: '',
  uid: 0,
  tokenExpire: 600,
});
const url = `https://api-ap-southeast-1.agora.io/api/conversational-ai-agent/v2/projects/${env.AGORA_APP_ID}/agents?state=2&limit=50`;
const res = await fetch(url, { headers: { Authorization: `agora token=${token}` } });
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`HTTP ${res.status}`, JSON.stringify(body).slice(0, 300));
  process.exit(1);
}
const list = body?.data?.list ?? [];
console.log(`running agents: ${body?.data?.count ?? list.length}`);
for (const a of list) console.log(`  ${a.agent_id}  channel=${a.channel ?? '?'}  started=${new Date((a.start_ts ?? 0) * 1000).toISOString()}`);
