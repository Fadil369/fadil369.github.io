/**
 * BrainSAIT Clinic API Bridge
 * 
 * Connects the Clinic Reception app to:
 * - BPR Provider Registry (registry.brainsait.de) - Identity, credentials, FHIR R4
 * - OpenEMR EMR (emr.brainsait.de) - Clinical records, patient management
 * - BrainSAIT Copilot (nemotron NVIDIA AI) - Clinical assistant
 * - NPHIES Desk - Eligibility, claims, pre-authorisation
 * - Brev HQ Agents - Multi-agent orchestration (when connected)
 * 
 * Runs on the GitHub Pages build step or as a standalone server.
 * All calls are proxied through the registry which handles CORS and auth.
 */

import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { resolve, mkdirSync, existsSync } from 'node:path';
import fetch from 'node-fetch';

const REGISTRY = 'https://registry.brainsait.de';
const EMR_API = 'http://127.0.0.1:19200'; // SA-PHY-000003 OpenEMR
const COPILOT_API = 'http://127.0.0.1:8733'; // Local Qwen3-VL-4B fallback
const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_TOKEN = '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';
const SPID = 'SA-PHY-000003';
const OID = '1.3.6.1.4.1.61026';

const PORT = process.env.CLINIC_API_PORT || 3002;
const DATA_DIR = resolve(process.cwd(), 'data', 'clinic');
mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });

const db = new DatabaseSync(resolve(DATA_DIR, 'clinic.sqlite'));
db.exec(`
  PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL UNIQUE,
    name TEXT,
    dob TEXT,
    gender TEXT,
    phone TEXT,
    email TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    provider_spid TEXT NOT NULL DEFAULT 'SA-PHY-000003',
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    type TEXT NOT NULL DEFAULT 'appointment',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );
  CREATE TABLE IF NOT EXISTS clinical_notes (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    appointment_id TEXT REFERENCES appointments(id),
    provider_spid TEXT NOT NULL DEFAULT 'SA-PHY-000003',
    encounter_type TEXT,
    chief_complaint TEXT,
    history_present_illness TEXT,
    assessment TEXT,
    plan TEXT,
    medications TEXT,
    copilot_assisted BOOLEAN DEFAULT 0,
    nvidia_model TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  );
  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id),
    appointment_id TEXT REFERENCES appointments(id),
    nphies_reference TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    total_amount REAL,
    currency TEXT DEFAULT 'SAR',
    submitted_at TEXT,
    adjudicated_at TEXT,
    rejection_code TEXT,
    rejection_reason TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    actor_spid TEXT DEFAULT 'SA-PHY-000003',
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const now = () => new Date().toISOString();
const audit = (action, targetType, targetId, details) => {
  db.prepare(
    'INSERT INTO audit_log(action, actor_spid, target_type, target_id, details, created_at) VALUES (?,?,?,?,?,?)'
  ).run(action, SPID, targetType, targetId, details, now());
};

const sendJson = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
};

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  // Health check
  if (path === '/api/clinic/health' && req.method === 'GET') {
    let registryStatus = 'unknown';
    let nvidiaStatus = 'unknown';
    let emrStatus = 'unknown';
    let copilotStatus = 'unknown';

    try {
      const r = await fetch(`${REGISTRY}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) registryStatus = 'live';
    } catch {}

    try {
      const r = await fetch(NVIDIA_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NVIDIA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3.5-super-vl-120b-a12b',
          messages: [{ role: 'user', content: 'health check' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok || r.status === 401) nvidiaStatus = 'reachable';
    } catch {}

    try {
      const r = await fetch(`${EMR_API}/fhir/metadata`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) emrStatus = 'live';
    } catch {}

    try {
      const r = await fetch(`${COPILOT_API}/v1/models`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) copilotStatus = 'live';
    } catch {}

    return sendJson(res, 200, {
      status: 'ok',
      spid: SPID,
      oid: OID,
      provider: 'Dr. Mohamed El Fadil',
      clinic: 'BrainSAIT Demo Clinic',
      mode: 'live',
      services: {
        registry: registryStatus,
        nvidia_ai: nvidiaStatus,
        emr: emrStatus,
        copilot: copilotStatus,
        nphies: 'reference_only',
        brev: 'disconnected',
      },
      timestamp: now(),
    });
  }

  // ── Provider / Credential ─────────────────────────────────────────────
  if (path === '/api/clinic/provider' && req.method === 'GET') {
    try {
      const r = await fetch(`${REGISTRY}/api/providers/${SPID}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`Registry ${r.status}`);
      const provider = await r.json();

      // Also check VC credential
      let credential = null;
      try {
        const vr = await fetch(`${REGISTRY}/vc/${SPID}`, { signal: AbortSignal.timeout(8000) });
        if (vr.ok) credential = await vr.json();
      } catch {}

      return sendJson(res, 200, {
        spid: SPID,
        oid: OID,
        name: 'Dr. Mohamed El Fadil',
        nameAr: 'د. محمد الفadil',
        specialization: 'Consultant Neurosurgery and Spine Surgery',
        location: 'Riyadh, Saudi Arabia',
        registry: provider,
        credential,
        verified: credential ? 'verified' : 'pending',
        services: [
          { id: 'general', name: 'General Consultation', nameAr: 'استشارة طب عام' },
          { id: 'dental', name: 'Dental Consultation', nameAr: 'استشارة أسنان' },
          { id: 'dermatology', name: 'Skin Consultation', nameAr: 'استشارة جلدية' },
        ],
        workspace: {
          openemr: `https://demo.emr.brainsait.de/`,
          copilot: `https://demo.emr.brainsait.de/copilot`,
          fhir: `https://demo.emr.brainsait.de/fhir`,
        },
      });
    } catch (e) {
      // Fallback to local profile
      return sendJson(res, 200, {
        spid: SPID,
        oid: OID,
        name: 'Dr. Mohamed El Fadil',
        nameAr: 'د. محمد الفadil',
        specialization: 'Consultant Neurosurgery and Spine Surgery',
        location: 'Riyadh, Saudi Arabia',
        registry: null,
        credential: null,
        verified: 'pending',
        services: [
          { id: 'general', name: 'General Consultation', nameAr: 'استشارة طب عام' },
          { id: 'dental', name: 'Dental Consultation', nameAr: 'استشارة أسنان' },
          { id: 'dermatology', name: 'Skin Consultation', nameAr: 'استشارة جلدية' },
        ],
        workspace: {
          openemr: `https://demo.emr.brainsait.de/`,
          copilot: `https://demo.emr.brainsait.de/copilot`,
          fhir: `https://demo.emr.brainsait.de/fhir`,
        },
        error: e.message,
      });
    }
  }

  // ── Patients ──────────────────────────────────────────────────────────
  if (path === '/api/clinic/patients' && req.method === 'GET') {
    const patients = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
    return sendJson(res, 200, { patients, count: patients.length });
  }

  if (path === '/api/clinic/patients' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body);

    const id = randomBytes(16).toString('hex');
    const nowTs = now();
    db.prepare(
      'INSERT INTO patients(id, label, name, dob, gender, phone, email, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(
      id,
      data.label || `Patient ${Math.floor(Math.random() * 9000) + 1000}`,
      data.name || null,
      data.dob || null,
      data.gender || null,
      data.phone || null,
      data.email || null,
      nowTs,
      nowTs
    );
    audit('patient.created', 'patient', id, JSON.stringify({ label: data.label }));

    const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
    return sendJson(res, 201, { patient });
  }

  if (path.startsWith('/api/clinic/patients/') && req.method === 'GET') {
    const id = path.split('/').pop();
    const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(id);
    if (!patient) return sendJson(res, 404, { error: 'Patient not found' });
    return sendJson(res, 200, { patient });
  }

  // ── Appointments ─────────────────────────────────────────────────────
  if (path === '/api/clinic/appointments' && req.method === 'GET') {
    const appointments = db.prepare(
      'SELECT appointments.*, patients.label as patient_label FROM appointments LEFT JOIN patients ON appointments.patient_id = patients.id ORDER BY created_at DESC'
    ).all();
    return sendJson(res, 200, { appointments, count: appointments.length });
  }

  if (path === '/api/clinic/appointments' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body);

    // Validate patient
    const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(data.patient_id);
    if (!patient) return sendJson(res, 400, { error: 'Patient not found' });

    // Check slot availability via registry
    let slots = [];
    try {
      const r = await fetch(
        `${REGISTRY}/api/availability?service=${data.service}&date=${data.date}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (r.ok) slots = (await r.json()).slots || [];
    } catch {}

    if (!slots.includes(data.time)) {
      return sendJson(res, 409, { error: 'Time slot not available' });
    }

    const id = randomBytes(16).toString('hex');
    const nowTs = now();
    db.prepare(
      'INSERT INTO appointments(id, patient_id, provider_spid, service, date, time, status, type, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).run(
      id,
      data.patient_id,
      SPID,
      data.service,
      data.date,
      data.time,
      'scheduled',
      data.type || 'appointment',
      data.notes || null,
      nowTs,
      nowTs
    );
    audit('appointment.created', 'appointment', id, JSON.stringify({ service: data.service, date: data.date, time: data.time }));

    const appointment = db.prepare(
      'SELECT appointments.*, patients.label as patient_label FROM appointments LEFT JOIN patients ON appointments.patient_id = patients.id WHERE appointments.id=?'
    ).get(id);
    return sendJson(res, 201, { appointment });
  }

  if (path.startsWith('/api/clinic/appointments/') && req.method === 'PATCH') {
    const id = path.split('/').pop();
    let body = '';
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body);

    const updates = [];
    const values = [];
    if (data.status !== undefined) { updates.push('status=?'); values.push(data.status); }
    if (data.notes !== undefined) { updates.push('notes=?'); values.push(data.notes); }
    if (updates.length === 0) return sendJson(res, 400, { error: 'No fields to update' });
    updates.push('updated_at=?'); values.push(now());
    values.push(id);

    db.prepare(`UPDATE appointments SET ${updates.join(', ')} WHERE id=?`).run(...values);
    audit('appointment.updated', 'appointment', id, JSON.stringify(data));

    const appointment = db.prepare(
      'SELECT appointments.*, patients.label as patient_label FROM appointments LEFT JOIN patients ON appointments.patient_id = patients.id WHERE appointments.id=?'
    ).get(id);
    return sendJson(res, 200, { appointment });
  }

  // ── Clinical Notes (Copilot-assisted) ────────────────────────────────
  if (path === '/api/clinic/clinical-notes' && req.method === 'GET') {
    const notes = db.prepare(
      'SELECT clinical_notes.*, patients.label as patient_label FROM clinical_notes LEFT JOIN patients ON clinical_notes.patient_id = patients.id ORDER BY created_at DESC'
    ).all();
    return sendJson(res, 200, { notes, count: notes.length });
  }

  if (path === '/api/clinic/clinical-notes' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body);

    const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(data.patient_id);
    if (!patient) return sendJson(res, 400, { error: 'Patient not found' });

    const id = randomBytes(16).toString('hex');
    const nowTs = now();
    db.prepare(
      'INSERT INTO clinical_notes(id, patient_id, appointment_id, provider_spid, encounter_type, chief_complaint, history_present_illness, assessment, plan, medications, copilot_assisted, nvidia_model, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(
      id,
      data.patient_id,
      data.appointment_id || null,
      SPID,
      data.encounter_type || null,
      data.chief_complaint || null,
      data.history_present_illness || null,
      data.assessment || null,
      data.plan || null,
      data.medications || null,
      data.copilot_assisted ? 1 : 0,
      data.nvidia_model || null,
      nowTs,
      nowTs
    );
    audit('clinical_note.created', 'clinical_note', id, JSON.stringify({ encounter_type: data.encounter_type }));

    const note = db.prepare('SELECT * FROM clinical_notes WHERE id=?').get(id);
    return sendJson(res, 201, { note });
  }

  // ── NVIDIA AI Copilot ─────────────────────────────────────────────────
  if (path === '/api/clinic/copilot/chat' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { message, context, language = 'en' } = JSON.parse(body);

    // Try NVIDIA Nemotron first
    try {
      const r = await fetch(NVIDIA_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NVIDIA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3.5-super-vl-120b-a12b',
          messages: [
            {
              role: 'system',
              content: `You are BrainSAIT's clinical AI assistant for Dr. Mohamed El Fadil's clinic in Riyadh, Saudi Arabia. Language: ${language}. You are a clinical copilot that produces drafts only - the clinician reviews, edits, and saves. Never provide diagnosis or treatment advice without clinician review. Use Saudi healthcare context (SAR currency, NPHIES context, Saudi time UTC+03:00).`,
            },
            { role: 'user', content: message },
          ],
          max_tokens: 500,
          temperature: 0.7,
          chat_template_kwargs: { enable_thinking: false },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (r.ok) {
        const result = await r.json();
        const response = result.choices?.[0]?.message?.content || 'No response';
        audit('copilot.used', 'copilot', id, `NVIDIA Nemotron: ${message.substring(0, 100)}`);
        return sendJson(res, 200, {
          response,
          model: 'nvidia/nemotron-3.5-super-vl-120b-a12b',
          provider: 'NVIDIA',
          draft: true,
          language,
        });
      }
    } catch {}

    // Fallback to local Qwen3-VL-4B
    try {
      const r = await fetch(`${COPILOT_API}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3-vl-4b',
          messages: [
            { role: 'system', content: `You are BrainSAIT's clinical AI assistant. Language: ${language}. Drafts only.` },
            { role: 'user', content: message },
          ],
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (r.ok) {
        const result = await r.json();
        const response = result.choices?.[0]?.message?.content || 'No response';
        return sendJson(res, 200, {
          response,
          model: 'qwen3-vl-4b',
          provider: 'Local (brainsait-llm)',
          draft: true,
          language,
        });
      }
    } catch {}

    return sendJson(res, 503, {
      error: 'Copilot unavailable',
      message: 'Both NVIDIA and local models are unavailable. Please try again later.',
    });
  }

  // ── NPHIES Integration ───────────────────────────────────────────────
  if (path === '/api/clinic/nphies/check' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { message } = JSON.parse(body);

    // Proxy to registry NPHIES pre-check
    try {
      const r = await fetch(`${REGISTRY}/bpr/nphies/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const result = await r.json();
        return sendJson(res, 200, { ...result, source: 'nphies_desk' });
      }
    } catch {}

    return sendJson(res, 200, {
      ok: true,
      message: 'NPHIES pre-check reference only. Not connected to live NPHIES platform.',
      source: 'reference',
    });
  }

  if (path === '/api/clinic/nphies/eligibility' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { patient_id, service, date } = JSON.parse(body);

    return sendJson(res, 200, {
      eligible: true,
      patient_id,
      service,
      date,
      coverage: 'SAR 100,000 annual limit',
      copay: 'SAR 50 per visit',
      source: 'nphies_reference',
      note: 'Eligibility check is reference only. Verify with NPHIES platform for live claims.',
    });
  }

  // ── Claims ────────────────────────────────────────────────────────────
  if (path === '/api/clinic/claims' && req.method === 'GET') {
    const claims = db.prepare(
      'SELECT claims.*, patients.label as patient_label FROM claims LEFT JOIN patients ON claims.patient_id = patients.id ORDER BY submitted_at DESC'
    ).all();
    return sendJson(res, 200, { claims, count: claims.length });
  }

  if (path === '/api/clinic/claims' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { patient_id, appointment_id, total_amount } = JSON.parse(body);

    const patient = db.prepare('SELECT * FROM patients WHERE id=?').get(patient_id);
    if (!patient) return sendJson(res, 400, { error: 'Patient not found' });

    const id = randomBytes(16).toString('hex');
    const nowTs = now();
    db.prepare(
      'INSERT INTO claims(id, patient_id, appointment_id, status, total_amount, submitted_at) VALUES (?,?,?,?,?,?)'
    ).run(id, patient_id, appointment_id || null, 'draft', total_amount || 0, nowTs);
    audit('claim.created', 'claim', id, JSON.stringify({ total_amount }));

    const claim = db.prepare(
      'SELECT claims.*, patients.label as patient_label FROM claims LEFT JOIN patients ON claims.patient_id = patients.id WHERE claims.id=?'
    ).get(id);
    return sendJson(res, 201, { claim });
  }

  // ── Audit Log ────────────────────────────────────────────────────────
  if (path === '/api/clinic/audit' && req.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const entries = db.prepare(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
    return sendJson(res, 200, { entries, count: entries.length });
  }

  // ── 404 ──────────────────────────────────────────────────────────────
  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`BrainSAIT Clinic API: http://127.0.0.1:${PORT}`);
  console.log(`Provider: Dr. Mohamed El Fadil (SPID: ${SPID})`);
  console.log(`OID: ${OID}`);
});

function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
