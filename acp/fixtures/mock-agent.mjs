import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

// Scenario is selected by keywords in the prompt:
//   NOTICES   – emit startup notices as agent_message_chunk text first (as the real Copilot CLI does)
//   LATE_INFO – a model answer whose later chunk legitimately starts with "Info: "
//   ECHO      – answer with the argv/env the client launched this process with
//   GRANDCHILD <file> – start a long-lived grandchild (like an MCP server), write its pid to <file>, then hang
const send = message => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
const chunk = text => send({ method: 'session/update', params: { sessionId: 'mock-session', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } } } });
let promptId;
let prompt = '';
createInterface({ input: process.stdin }).on('line', line => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    send({ id: message.id, result: { protocolVersion: 1, agentCapabilities: {}, authMethods: [] } });
  } else if (message.method === 'session/new') {
    send({ id: message.id, result: { sessionId: 'mock-session' } });
  } else if (message.method === 'session/prompt') {
    promptId = message.id;
    prompt = (message.params.prompt || []).map(block => block.text || '').join('');
    if (prompt.includes('GRANDCHILD ')) {
      const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
      writeFileSync(prompt.split('GRANDCHILD ')[1].trim(), String(grandchild.pid));
      return;
    }
    send({ id: 99, method: 'session/request_permission', params: { sessionId: 'mock-session', toolCall: { toolCallId: 'tool', title: 'Run a command' }, options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }] } });
  } else if (message.id === 99) {
    if (message.result?.outcome?.outcome !== 'cancelled') process.exit(1);
    if (prompt.includes('NOTICES')) {
      chunk('Info: Disabled tools: bash, secret-operator-mcp_tool');
      chunk("Error: Failed to start hook: path '/Users/operator/.npm' could not be resolved");
    }
    if (prompt.includes('ECHO')) {
      const env = Object.fromEntries(['HOME', 'COPILOT_HOME', 'COPILOT_PLUGIN_DIR_ONLY', 'COPILOT_AUTO_UPDATE', 'COPILOT_DISABLE_LOGIN_SHELL_ENV', 'ACP_TEST_CANARY'].map(key => [key, process.env[key] ?? null]));
      chunk(JSON.stringify({ argv: process.argv.slice(2), env }));
    } else if (prompt.includes('LATE_INFO')) {
      chunk('Answer: ');
      chunk('Info: this is part of the model answer');
    } else {
      for (const text of ['Synthetic ', 'draft']) chunk(text);
    }
    send({ id: promptId, result: { stopReason: 'end_turn' } });
  }
});
