import { createInterface } from 'node:readline';

const send = message => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
let promptId;
createInterface({ input: process.stdin }).on('line', line => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    send({ id: message.id, result: { protocolVersion: 1, agentCapabilities: {}, authMethods: [] } });
  } else if (message.method === 'session/new') {
    send({ id: message.id, result: { sessionId: 'mock-session' } });
  } else if (message.method === 'session/prompt') {
    promptId = message.id;
    send({ id: 99, method: 'session/request_permission', params: { sessionId: 'mock-session', toolCall: { toolCallId: 'tool', title: 'Run a command' }, options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }] } });
  } else if (message.id === 99) {
    if (message.result?.outcome?.outcome !== 'cancelled') process.exit(1);
    for (const text of ['Synthetic ', 'draft']) {
      send({ method: 'session/update', params: { sessionId: 'mock-session', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } } } });
    }
    send({ id: promptId, result: { stopReason: 'end_turn' } });
  }
});
