import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const read = (path) => readFile(path, 'utf8');

test('marketplace entries resolve to matching plugin manifests and skills', async () => {
  const catalog = JSON.parse(await read('marketplace.json'));
  assert.equal(catalog.name, 'brainsait-clinical');
  assert.ok(catalog.owner.name);
  const expected = {
    'clinical-copilot': ['clinical-draft', 'clinical-evidence', 'clinical-operations'],
    'clinical-research': ['research-planning'],
    'healthcare-fhir': ['fhir-mapping'],
    'nphies-readiness': ['nphies-readiness'],
    'clinical-training': ['training-exercise'],
  };
  assert.deepEqual(catalog.plugins.map((entry) => entry.name).sort(), Object.keys(expected).sort());
  const allSkills = new Set();
  for (const entry of catalog.plugins) {
    assert.equal(entry.source, `./plugins/${entry.name}`);
    const plugin = JSON.parse(await read(join(entry.source, 'plugin.json')));
    assert.equal(plugin.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
    for (const field of ['name', 'version', 'description']) assert.equal(plugin[field], entry[field]);
    assert.deepEqual((await readdir(join(entry.source, 'skills'))).sort(), [...expected[entry.name]].sort());
    for (const name of expected[entry.name]) {
      assert.equal(allSkills.has(name), false, `duplicate skill ${name}`);
      allSkills.add(name);
      const skill = await read(join(entry.source, 'skills', name, 'SKILL.md'));
      assert.match(skill, new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---\\n`));
    }
  }
});
