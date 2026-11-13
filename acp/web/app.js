const identity = document.getElementById('identity');
const form = document.getElementById('form');
const status = document.getElementById('status');
const result = document.getElementById('result');
const submit = document.getElementById('submit');
const cancel = document.getElementById('cancel');
const copy = document.getElementById('copy');
const count = document.getElementById('count');
const hint = document.getElementById('hint');
const MAX = 8000;
// Scopes match docs/CLINICAL_PLUGIN_MARKETPLACE.md; every plugin works on synthetic or public material only.
const HINTS = {
  'clinical-copilot': 'Synthetic documentation, public evidence summaries and administrative drafts.',
  'clinical-research': 'Research planning outlines.',
  'healthcare-fhir': 'Synthetic FHIR R4 mapping plans.',
  'nphies-readiness': 'Public-reference administrative readiness plans.',
  'clinical-training': 'Fictional communication and operations training.',
};
let controller;

function updateCount() {
  const length = document.getElementById('prompt').value.length;
  count.textContent = `${length} / ${MAX}`;
  count.className = length > MAX ? 'hint over' : 'hint';
  submit.disabled = length > MAX || Boolean(controller);
}
function updateHint() { hint.textContent = HINTS[document.getElementById('plugin').value] || ''; }
document.getElementById('prompt').addEventListener('input', updateCount);
document.getElementById('plugin').addEventListener('change', updateHint);
updateCount();
updateHint();

copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(result.textContent);
    status.textContent = 'Draft copied.';
  } catch {
    status.textContent = 'Copy is not available here. Select the text and copy it manually.';
  }
});

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

// Sign out with fetch, not a plain form post: under Referrer-Policy: no-referrer browsers send "Origin: null" on form
// navigations, which the server's origin check correctly rejects. fetch sends the real origin.
document.getElementById('logout').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await fetch('/logout', { method: 'POST', redirect: 'manual' });
  } catch {
    status.textContent = 'Sign-out failed. Reload and try again.';
    return;
  }
  result.textContent = '';
  copy.hidden = true;
  status.textContent = '';
  await loadSession();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  controller = new AbortController();
  updateCount();
  cancel.hidden = false;
  copy.hidden = true;
  result.textContent = '';
  status.textContent = 'Running…';
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
    copy.hidden = !data.text;
    status.textContent = `Finished: ${data.stopReason}`;
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? 'Cancelled.' : `Request failed: ${error.message}`;
  } finally {
    controller = undefined;
    updateCount();
    cancel.hidden = true;
  }
});
