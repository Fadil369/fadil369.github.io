import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scanForIdentifiers,
  calcEgfrCkdEpi2021,
  calcCha2ds2Vasc,
  calcMeldNa,
  calcWellsPe,
} from './bosSandbox.ts';

test('BOS PHI firewall detects English and Arabic identifiers and allows clean clinical queries', () => {
  assert.deepEqual(scanForIdentifiers('64-year-old male with stage 3b CKD and atrial fibrillation'), []);
  assert.deepEqual(scanForIdentifiers('رجل في الستينات يعاني من قصور كلوي مزمن ورفرفة أذينية'), []);

  const enHit = scanForIdentifiers('Patient Khalid MRN 889231 phone +966 54 356 0672');
  assert.ok(enHit.includes('patient_name'));
  assert.ok(enHit.includes('record_number'));
  assert.ok(enHit.includes('phone'));

  const arHit = scanForIdentifiers('المريض محمد رقم الملف ٩٩٨٢١ جوال ٠٥٤٣٥٦٠٦٧٢');
  assert.ok(arHit.includes('patient_name'));
  assert.ok(arHit.includes('record_number'));
  assert.ok(arHit.includes('phone'));
});

test('BOS exact clinical calculators produce deterministic values', () => {
  const egfr = calcEgfrCkdEpi2021({ age: 60, sex: 'male', creatinine: 1.5, unit: 'mg/dL' });
  assert.equal(egfr.result, '53');
  assert.match(egfr.interpretationEn, /G3a/);

  const chads = calcCha2ds2Vasc({
    age: 76,
    sex: 'female',
    chf: false,
    hypertension: true,
    diabetes: true,
    strokeTia: false,
    vascular: false,
  });
  assert.equal(chads.result, '5');

  const meld = calcMeldNa({
    creatinineMgDl: 2.0,
    bilirubinMgDl: 3.2,
    inr: 1.8,
    sodiumMmolL: 128,
    dialysisTwiceWeek: false,
  });
  assert.equal(Number(meld.result) > 20, true);

  const wells = calcWellsPe({
    dvtSigns: true,
    peMostLikely: true,
    hrOver100: false,
    immobilisationOrSurgery: false,
    previousPeDvt: false,
    hemoptysis: false,
    malignancy: false,
  });
  assert.equal(wells.result, '6');
});
