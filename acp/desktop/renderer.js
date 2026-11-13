const form = document.getElementById('form');
const status = document.getElementById('status');
const result = document.getElementById('result');
const submit = document.getElementById('submit');
const cancel = document.getElementById('cancel');

// Electron prefixes errors thrown in the main process; show only the message.
const clean = message => String(message).replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '');

cancel.addEventListener('click', () => window.clinicalAcp.cancel());

form.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  cancel.hidden = false;
  result.textContent = '';
  status.textContent = 'Running…';
  try {
    const response = await window.clinicalAcp.prompt(document.getElementById('prompt').value, document.getElementById('plugin').value, document.getElementById('ack').checked);
    result.textContent = response.text;
    status.textContent = `Finished: ${response.stopReason}`;
  } catch (error) {
    const message = clean(error.message);
    status.textContent = /cancelled/i.test(message) ? 'Cancelled.' : `Request failed: ${message}`;
  } finally {
    submit.disabled = false;
    cancel.hidden = true;
  }
});
