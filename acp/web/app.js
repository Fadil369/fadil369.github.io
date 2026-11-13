const identity = document.getElementById('identity');
const form = document.getElementById('form');
const status = document.getElementById('status');
const result = document.getElementById('result');
const submit = document.getElementById('submit');
const cancel = document.getElementById('cancel');
let controller;

async function loadSession() {
  try {
    const response = await fetch('/api/session', { cache: 'no-store' });
    if (!response.ok) throw new Error('Session check failed.');
    const { authenticated } = await response.json();
    identity.textContent = authenticated ? 'Signed in with GitHub.' : 'Sign in with an allowed GitHub account.';
    document.getElementById('login').hidden = authenticated;
    document.getElementById('logout').hidden = !authenticated;
    form.hidden = !authenticated;
  } catch {
    identity.textContent = 'Could not check the session. Reload to try again.';
  }
}
loadSession();

cancel.addEventListener('click', () => controller?.abort());

form.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  cancel.hidden = false;
  result.textContent = '';
  status.textContent = 'Running…';
  controller = new AbortController();
  try {
    const response = await fetch('/api/prompt', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: document.getElementById('prompt').value, plugin: document.getElementById('plugin').value, synthetic: document.getElementById('ack').checked }),
    });
    // A proxy error page is not JSON; fall back to the status code instead of a parse error.
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      status.textContent = 'Your session expired. Sign in again.';
      await loadSession();
      return;
    }
    if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
    result.textContent = data.text;
    status.textContent = `Finished: ${data.stopReason}`;
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? 'Cancelled.' : `Request failed: ${error.message}`;
  } finally {
    submit.disabled = false;
    cancel.hidden = true;
    controller = undefined;
  }
});
