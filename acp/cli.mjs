#!/usr/bin/env node
import { runPrompt } from './client.mjs';

const [plugin = 'clinical-copilot', ...parts] = process.argv.slice(2);
const prompt = parts.join(' ');
if (!prompt) {
  console.error('Usage: npm run acp:cli -- <plugin> "<synthetic or public prompt>"');
  process.exitCode = 1;
} else {
  console.error('Synthetic or public material only. Review all output; this is not clinical advice.');
  const abort = new AbortController();
  process.once('SIGINT', () => abort.abort());
  try {
    const result = await runPrompt({ prompt, plugin, onText: text => process.stdout.write(text), signal: abort.signal });
    process.stdout.write(`\n[${result.stopReason}]\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
