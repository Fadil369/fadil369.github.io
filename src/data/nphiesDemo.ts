// A wholly invented message for trying the pre-check. No real patient, clinician, insurer or facility.
const SD = 'http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/';
const CS = 'http://nphies.sa/terminology/CodeSystem/';
const H7 = 'http://terminology.hl7.org/CodeSystem/';
const BASE = 'http://example.invalid/';
const meta = (p: string) => ({ profile: [`${SD}${p}|1.0.0`] });
const cc = (system: string, code: string) => ({ coding: [{ system, code }] });
const money = (value: number) => ({ value, currency: 'SAR' });
const orgId = (system: string, value: string) => [{ type: cc(`${CS}organization-identifier-type`, 'ins'), system, value }];

export function demoBundle(): Record<string, any> {
  const claim = {
    resourceType: 'Claim', id: 'demo-claim-1', meta: meta('professional-claim'),
    extension: [
      { url: `${SD}extension-encounter`, valueReference: { reference: `${BASE}Encounter/demo-1` } },
      { url: `${SD}extension-episode`, valueIdentifier: { system: `${BASE}episode`, value: 'DEMO-EP-1' } },
    ],
    identifier: [{ system: `${BASE}claim`, value: 'DEMO-CLAIM-1' }],
    status: 'active', type: cc(`${H7}claim-type`, 'professional'), subType: cc(`${CS}claim-subtype`, 'op'), use: 'claim',
    patient: { reference: `${BASE}Patient/demo-1` }, created: '2026-10-20', insurer: { reference: `${BASE}Organization/demo-payer` },
    provider: { reference: `${BASE}Organization/demo-provider` }, priority: cc(`${H7}processpriority`, 'normal'),
    payee: { type: cc(`${H7}payeetype`, 'provider') },
    careTeam: [{ sequence: 1, provider: { reference: `${BASE}Practitioner/demo-1` }, role: cc(`${H7}claimcareteamrole`, 'primary'), qualification: cc(`${CS}practice-codes`, '08.00') }],
    diagnosis: [{ sequence: 1, diagnosisCodeableConcept: cc('http://hl7.org/fhir/sid/icd-10-am', 'E11.9'), type: [cc(`${CS}diagnosis-type`, 'principal')] }],
    insurance: [{ sequence: 1, focal: true, coverage: { reference: `${BASE}Coverage/demo-1` } }],
    item: [{ sequence: 1, careTeamSequence: [1], diagnosisSequence: [1], extension: [{ url: `${SD}extension-tax`, valueMoney: money(15) }],
      productOrService: cc(`${CS}services`, 'DEMO-SERVICE'), servicedDate: '2026-10-19', quantity: { value: 1 }, unitPrice: money(100), factor: 1, net: money(115) }],
    total: money(115),
  };
  const entry = (resource: Record<string, any>) => ({ fullUrl: `${BASE}${resource.resourceType}/${resource.id}`, resource });
  return {
    resourceType: 'Bundle', id: 'demo-bundle-1', meta: meta('bundle'), type: 'message', timestamp: '2026-10-20T09:00:00+03:00',
    entry: [
      entry({ resourceType: 'MessageHeader', id: 'demo-header', meta: meta('message-header'), eventCoding: { system: `${CS}ksa-message-events`, code: 'claim-request' },
        destination: [{ endpoint: 'http://nphies.sa/license/payer-license/DEMO', receiver: { type: 'Organization', identifier: { system: 'http://nphies.sa/license/payer-license', value: 'DEMO' } } }],
        sender: { type: 'Organization', identifier: { system: 'http://nphies.sa/license/provider-license', value: 'DEMO' } },
        source: { endpoint: 'http://nphies.sa/license/DEMO' }, focus: [{ reference: `${BASE}Claim/demo-claim-1` }] }),
      entry(claim),
      entry({ resourceType: 'Encounter', id: 'demo-1', meta: meta('encounter'), identifier: [{ system: `${BASE}encounter`, value: 'DEMO-ENC-1' }], status: 'finished',
        class: { system: `${H7}v3-ActCode`, code: 'AMB' }, subject: { reference: `${BASE}Patient/demo-1` }, period: { start: '2026-10-19T09:00:00+03:00', end: '2026-10-19T09:30:00+03:00' }, serviceProvider: { reference: `${BASE}Organization/demo-provider` } }),
      entry({ resourceType: 'Patient', id: 'demo-1', meta: meta('patient'), identifier: [{ type: cc(`${H7}v2-0203`, 'PRC'), system: 'http://nphies.sa/identifier/iqama', value: 'DEMO-0000' }], active: true,
        name: [{ text: 'Synthetic Patient' }], gender: 'male', birthDate: '1980-05-01', maritalStatus: cc(`${H7}v3-MaritalStatus`, 'M') }),
      entry({ resourceType: 'Coverage', id: 'demo-1', meta: meta('coverage'), identifier: [{ system: 'http://example.invalid/member', value: 'DEMO-M-1' }], status: 'active', type: cc(`${CS}coverage-type`, 'EHCPOL'),
        policyHolder: { reference: `${BASE}Organization/demo-holder` }, beneficiary: { reference: `${BASE}Patient/demo-1` }, relationship: cc(`${H7}subscriber-relationship`, 'self'),
        period: { start: '2026-01-01', end: '2026-12-31' }, payor: [{ reference: `${BASE}Organization/demo-payer` }], class: [{ type: cc(`${H7}coverage-class`, 'plan'), value: 'DEMO-PLAN' }] }),
      entry({ resourceType: 'Practitioner', id: 'demo-1', meta: meta('practitioner'), identifier: [{ type: cc(`${H7}v2-0203`, 'MD'), system: 'http://nphies.sa/license/practitioner-license', value: 'DEMO-P-1' }], active: true }),
      entry({ resourceType: 'Organization', id: 'demo-provider', meta: meta('provider-organization'), identifier: orgId('http://nphies.sa/license/provider-license', 'DEMO'), active: true, type: [cc(`${CS}organization-type`, 'prov')], name: 'Synthetic Clinic' }),
      entry({ resourceType: 'Organization', id: 'demo-payer', meta: meta('insurer-organization'), identifier: orgId('http://nphies.sa/license/payer-license', 'DEMO'), active: true, type: [cc(`${CS}organization-type`, 'ins')], name: 'Synthetic Insurer' }),
    ],
  };
}

/** The same message with the mistakes behind common rejections, for showing what the pre-check finds. */
export function brokenDemoBundle(): Record<string, any> {
  const b = demoBundle();
  const get = (t: string) => b.entry.find((e: any) => e.resource.resourceType === t).resource;
  get('Patient').birthDate = '1402-07-14';
  const c = get('Claim');
  c.diagnosis[0].diagnosisCodeableConcept.coding[0] = { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'S72.001A' };
  c.diagnosis[0].type = [{ coding: [{ system: 'http://nphies.sa/terminology/CodeSystem/diagnosis-type', code: 'secondary' }] }];
  c.careTeam[0].qualification.coding[0].code = '99.99';
  c.item[0].careTeamSequence = [2];
  c.total.value = 200;
  delete c.created;
  get('Practitioner').identifier[0].system = 'http://example.invalid/hr';
  return b;
}
