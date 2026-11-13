const form = document.getElementById('form');
const status = document.getElementById('status');
const result = document.getElementById('result');
const submit = document.getElementById('submit');

form.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  result.textContent = '';
  status.textContent = 'Running…';
  try {
    const response = await window.clinicalAcp.prompt(document.getElementById('prompt').value, document.getElementById('plugin').value);
    result.textContent = response.text;
    status.textContent = `Finished: ${response.stopReason}`;
  } catch (error) {
    status.textContent = `Request failed: ${error.message}`;
  } finally {
    submit.disabled = false;
  }
});
