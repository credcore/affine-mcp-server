import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ALL_TOOLS, createToolFilter } from './dist/toolSurface.js';

const live = process.argv.includes('--live');
const root = dirname(fileURLToPath(import.meta.url));
const configPath = join(root, '.local/config/affine-mcp/config');
const config = Object.fromEntries((existsSync(configPath) ? readFileSync(configPath, 'utf8') : '')
  .split(/\r?\n/).filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const workspaceId = config.AFFINE_WORKSPACE_ID ?? null;
const checks = [];
const client = new Client({ name: 'credcore-affine-local-smoke', version: '1.0.0' });
const transport = new StdioClientTransport({ command: '/bin/sh', args: [root + '/local-mcp.sh'], stderr: 'pipe' });
// Drain diagnostics without putting backend errors or credentials in the transcript.
transport.stderr?.on('data', () => {});
const summary = { live, workspaceId, checks };
function payload(result) {
  return result.structuredContent ?? JSON.parse(result.content?.find(c => c.type === 'text')?.text ?? '{}');
}
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) {
    const data = payload(result);
    throw new Error(`${name} failed: ${data.code ?? 'tool_error'}`);
  }
  return payload(result);
}
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = tools.map(t => t.name).sort();
  const expected = createToolFilter({
    AFFINE_TOOL_PROFILE: 'core',
    AFFINE_DISABLED_GROUPS: 'auth,admin,blobs,cleanup,destructive,docs.share,experimental,notifications,workspaces.write',
    AFFINE_DISABLED_TOOLS: 'trash_doc,restore_doc,list_workspaces',
  }).enabledTools.sort();
  assert.deepEqual(names, expected);
  assert.equal(names.length, 30);
  checks.push('MCP handshake and exact restricted 30-tool catalog');
  for (const name of ['publish_doc', 'delete_doc', 'sign_in', 'upload_blob', 'list_workspaces']) {
    assert(!names.includes(name));
  }
  checks.push('publication, deletion, sign-in, blobs, and workspace enumeration unavailable');
  assert.equal(ALL_TOOLS.length, 108);
  const forbidden = await client.callTool({ name: 'get_doc', arguments: {
    workspaceId: 'different-workspace-probe', docId: 'not-a-real-document',
  } });
  assert(forbidden.isError);
  assert.equal(payload(forbidden).code, 'access_denied');
  checks.push('explicit cross-workspace override denied before backend access');
  if (live) {
    assert(config.AFFINE_BASE_URL && workspaceId, 'Save a login and workspace with local-login.sh first.');
    // List metadata to verify access; do not persist existing titles/content.
    await call('list_docs', { first: 1 });
    checks.push('authenticated document-list request');
    const marker = `local-mcp-smoke-${Date.now()}`;
    const initial = `Disposable MCP connectivity test. Initial marker: ${marker}.`;
    const updated = `Disposable MCP connectivity test. Edited marker: ${marker}.`;
    const title = `MCP setup test — ${new Date().toISOString()}`;
    const created = await call('create_doc', { title, content: initial });
    const docId = created.docId ?? created.id;
    assert.equal(typeof docId, 'string');
    summary.docId = docId;
    summary.documentUrl = `${config.AFFINE_BASE_URL.replace(/\/$/, '')}/workspace/${workspaceId}/${docId}`;
    checks.push('created a new disposable document');
    const before = await call('read_doc', { docId });
    assert(before.plainText.includes(initial));
    const paragraph = before.blocks.find(b => b.text?.includes(initial));
    assert(paragraph?.id);
    checks.push('read back created content');
    const stale = await client.callTool({ name: 'update_block', arguments: {
      docId, blockId: paragraph.id, text: updated, expectedRevision: '0'.repeat(64),
    } });
    assert(stale.isError);
    assert.equal(payload(stale).code, 'STALE_DOCUMENT_REVISION');
    checks.push('stale revision rejected without editing');
    await call('update_block', { docId, blockId: paragraph.id, text: updated, expectedRevision: before.revision });
    const after = await call('read_doc', { docId });
    assert(after.plainText.includes(updated));
    assert(!after.plainText.includes(initial));
    checks.push('edited one test paragraph and verified persistence');
    await call('append_markdown', { docId, markdown: '\n## Append check\n\nOnly this disposable test document was changed.', expectedRevision: after.revision });
    const appended = await call('read_doc', { docId });
    assert(appended.plainText.includes('Only this disposable test document was changed.'));
    checks.push('appended Markdown and verified persistence');
    summary.testDocumentRetained = true;
  }
  summary.passed = true;
} catch (error) {
  summary.passed = false;
  summary.failure = error.message;
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
  const resultsDir = join(root, '.local/results');
  mkdirSync(resultsDir, { recursive: true, mode: 0o700 });
  writeFileSync(join(resultsDir, live ? 'live.json' : 'offline.json'), JSON.stringify(summary, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(summary, null, 2));
}
