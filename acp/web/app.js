const identity = document.getElementById('identity');
const form = document.getElementById('form');
const status = document.getElementById('status');
const result = document.getElementById('result');
const submit = document.getElementById('submit');

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

form.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  result.textContent = '';
  status.textContent = 'Running…';
  try {
    const response = await fetch('/api/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: document.getElementById('prompt').value, plugin: document.getElementById('plugin').value, synthetic: document.getElementById('ack').checked }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    result.textContent = data.text;
    status.textContent = `Finished: ${data.stopReason}`;
  } catch (error) {
    status.textContent = `Request failed: ${error.message}`;
  } finally {
    submit.disabled = false;
  }
});
