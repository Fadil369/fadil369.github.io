import { runPrompt } from '../client.mjs';

// IPC logic for the desktop window, separate from Electron so it can be unit tested.
export function createDesktopHandlers({ isTrusted, run = runPrompt }) {
  let controller;
  const trusted = event => { if (!isTrusted(event)) throw new Error('Invalid sender.'); };
  return {
    async prompt(event, input) {
      trusted(event);
      if (controller) throw new Error('A request is already running.');
      if (input?.synthetic !== true) throw new Error('Confirm that the prompt contains no real or potentially real patient or participant data.');
      controller = new AbortController(); // reserved synchronously, before any await
      try {
        const { text, stopReason } = await run({ prompt: input.prompt, plugin: input.plugin, signal: controller.signal });
        return { text, stopReason };
      } finally {
        controller = undefined;
      }
    },
    cancel(event) {
      trusted(event);
      controller?.abort();
    },
    shutdown() {
      controller?.abort();
    },
  };
}
