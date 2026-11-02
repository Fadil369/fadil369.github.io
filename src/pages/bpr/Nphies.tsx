import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle2, ClipboardCheck, FileSearch, Info, Lock, Printer, Search, ShieldCheck, Stethoscope, UploadCloud, XCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, Failed, Loading } from '../../components/BprKit';
import { REGISTRY, SNAPSHOT } from '../../lib/bpr';
import { CheckResult, checkBundle, Finding, makeSpec, Spec } from '../../utils/nphiesCheck';
import { brokenDemoBundle, demoBundle } from '../../data/nphiesDemo';
import { Billing, Facility, FACILITIES, RELEASES, STAGES, STEPS } from '../../data/nphiesReadiness';

// The NPHIES desk: an independent, bilingual reference built from public-labelled NPHIES documents.
// It explains and pre-checks. It does not connect to NPHIES, and status text here must stay true to
// that until a real integration ships (see the workspace page and capabilities.php on the registry).
const KB = `${SNAPSHOT}/nphies/v1`;
const cache = new Map<string, Promise<any>>();
function kb<T>(name: string): Promise<T> {
  if (!cache.has(name)) {
    cache.set(name, fetch(`${KB}/${name}.json`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }));
    cache.get(name)!.catch(() => cache.delete(name));
  }
  return cache.get(name) as Promise<T>;
}
function useKb<T>(name: string | null) {
  const [state, setState] = useState<{ data?: T; failed?: boolean }>({});
  useEffect(() => {
    if (!name) return;
    let live = true;
    kb<T>(name).then((data) => { if (live) setState({ data }); }, () => { if (live) setState({ failed: true }); });
    return () => { live = false; };
  }, [name]);
  return state;
}

interface Reason { code: string; official: string; owner: string; route: string; en: string; ar: string; doEn: string; doAr: string; bpr?: boolean }
interface Route { en: string; ar: string; detailEn: string; detailAr: string; source: string }
interface Reasons { owners: Record<string, [string, string]>; routes: Record<string, Route>; families: Record<string, [string, string]>; items: Reason[] }
interface Manifest { generated: string; status: string; guidance: string; excluded: string; sources: { document: string; version: string; label: string; sha256: string }[]; counts: Record<string, number>; files: Record<string, { path: string; bytes: number }>; sourceDefectsNormalized: string[] }
interface Code { code: string; display: string }

const TABS = [
  { id: 'decode', icon: FileSearch, en: 'Decode a rejection', ar: 'افهم سبب الرفض' },
  { id: 'check', icon: ClipboardCheck, en: 'Pre-check a message', ar: 'افحص الرسالة' },
  { id: 'ready', icon: ShieldCheck, en: 'Readiness plan', ar: 'خطة الجاهزية' },
  { id: 'clinician', icon: Stethoscope, en: 'Clinician data', ar: 'بيانات الممارس' },
  { id: 'changes', icon: Info, en: 'What changed', ar: 'ما الذي تغيّر' },
  { id: 'api', icon: ArrowUpRight, en: 'Docs API', ar: 'واجهة الوثائق' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function reasonLink(code: string) { return `/bpr/nphies?tab=decode&code=${encodeURIComponent(code)}`; }

// ── Decode ────────────────────────────────────────────────────────────────────────────────────
function ReasonCard({ r, data, open }: { r: Reason; data: Reasons; open: boolean }) {
  const { ar } = useI18n();
  const route = data.routes[r.route];
  const owner = data.owners[r.owner];
  return (
    <details className="nph-reason" open={open} id={`r-${r.code}`}>
      <summary>
        <code dir="ltr">{r.code}</code>
        <span>{ar ? r.ar : r.en}</span>
        {r.bpr && <em className="nph-tag">{ar ? 'يخص بيانات الممارس' : 'Clinician data'}</em>}
      </summary>
      <div className="nph-reason-body">
        <p className="nph-do"><strong>{ar ? 'ماذا تفعل' : 'What to do'}</strong> {ar ? r.doAr : r.doEn}</p>
        <dl>
          <div><dt>{ar ? 'المسؤول' : 'Who owns it'}</dt><dd>{owner[ar ? 1 : 0]}</dd></div>
          <div><dt>{ar ? 'المسار' : 'Route'}</dt><dd><strong>{ar ? route.ar : route.en}.</strong> {ar ? route.detailAr : route.detailEn} <small dir="ltr">{route.source}</small></dd></div>
          <div><dt>{ar ? 'النص الرسمي' : 'Official wording'}</dt><dd dir="ltr" className="nph-official">{r.official}</dd></div>
        </dl>
        {r.bpr && <p className="nph-note"><Link to="/bpr/nphies?tab=clinician">{ar ? 'تحقق من جاهزية بيانات الممارس' : 'Check a clinician’s data readiness'}</Link>{ar ? '. يعرض BPR حالة الترخيص «لم تُقيَّم» إلى أن يكتمل التكامل مع الهيئة.' : '. BPR shows licence status as “not assessed” until the SCFHS integration is complete.'}</p>}
      </div>
    </details>
  );
}

function Decode({ code }: { code: string | null }) {
  const { ar } = useI18n();
  const { data, failed } = useKb<Reasons>('rejection-reasons');
  const [q, setQ] = useState(code ?? '');
  const [family, setFamily] = useState('');
  const term = q.trim().toLowerCase();
  // The long technical error list loads only once someone searches.
  const errors = useKb<{ items: Code[] }>(term.length >= 2 ? 'adjudication-errors' : null);
  useEffect(() => { if (code) setQ(code); }, [code]);
  const shown = useMemo(() => (data?.items ?? []).filter((r) => (!family || r.code.startsWith(family)) && (!term || [r.code, r.official, r.en, r.ar, r.doEn, r.doAr].some((s) => s.toLowerCase().includes(term)))), [data, family, term]);
  const hits = useMemo(() => (term.length >= 2 ? (errors.data?.items ?? []).filter((e) => e.code === term || e.display.toLowerCase().includes(term)).slice(0, 12) : []), [errors.data, term]);
  if (failed) return <Failed />;
  if (!data) return <Loading />;
  return (
    <section className="bpr-panel" aria-labelledby="nph-decode">
      <h2 id="nph-decode">{ar ? 'ماذا يعني رمز الرفض، ومن يعالجه، وكيف؟' : 'What a rejection code means, who owns it, and how to respond'}</h2>
      <p className="nph-lead">{ar ? `${data.items.length} رمزًا رسميًا من أسباب الرفض بلغة واضحة. النص الرسمي من رموز نفيس، أما الشرح والخطوات فإرشادات من برينسايت.` : `All ${data.items.length} official rejection reasons in plain language. The official wording comes from the NPHIES code sets. The explanations and steps are BrainSAIT guidance.`}</p>
      <div className="nph-search">
        <label htmlFor="nph-q"><Search size={15} aria-hidden="true" /><span className="sr-only">{ar ? 'ابحث' : 'Search'}</span></label>
        <input id="nph-q" dir="auto" value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? 'رمز أو كلمة، مثل AD-1-8 أو الترخيص أو 1042' : 'A code or word, such as AD-1-8, licence or 1042'} autoComplete="off" />
      </div>
      <div className="nph-chips" role="group" aria-label={ar ? 'تصفية حسب الفئة' : 'Filter by family'}>
        <button type="button" aria-pressed={!family} onClick={() => setFamily('')}>{ar ? 'الكل' : 'All'}</button>
        {Object.entries(data.families).map(([k, v]) => <button type="button" key={k} aria-pressed={family === k} onClick={() => setFamily(family === k ? '' : k)}>{v[ar ? 1 : 0]}</button>)}
      </div>
      <p className="nph-count" role="status">{ar ? `النتائج: ${shown.length}` : `${shown.length} shown`}</p>
      <div className="nph-reasons">{shown.map((r) => <ReasonCard key={r.code} r={r} data={data} open={!!code && r.code.toLowerCase() === code.toLowerCase()} />)}</div>
      {hits.length > 0 && (
        <div className="nph-errors">
          <h3>{ar ? 'أخطاء تقنية مطابقة' : 'Matching technical errors'}</h3>
          <p className="nph-note">{ar ? 'رموز adjudication-error تصف مشكلة في بنية الرسالة أو بياناتها.' : 'Adjudication-error codes describe a problem with the message structure or data.'}</p>
          <ul dir="ltr">{hits.map((e) => <li key={e.code}><code>{e.code}</code> {e.display}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

// ── Pre-check ─────────────────────────────────────────────────────────────────────────────────
const SEV: Record<Finding['severity'], { icon: typeof XCircle; en: string; ar: string }> = {
  error: { icon: XCircle, en: 'Fix before sending', ar: 'أصلحه قبل الإرسال' },
  warn: { icon: AlertTriangle, en: 'Check this', ar: 'راجع هذا' },
  info: { icon: Info, en: 'Worth knowing', ar: 'للعلم' },
};

function Check() {
  const { ar } = useI18n();
  const [text, setText] = useState('');
  const [spec, setSpec] = useState<Spec | null>(null);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  useEffect(() => {
    Promise.all([kb<any>('profiles'), kb<any>('code-systems'), kb<any>('practice-codes')])
      .then(([p, s, c]) => setSpec(makeSpec(p, s, c)), () => setFailed(true));
  }, []);
  const run = (value: string) => { if (spec) setResult(checkBundle(value, spec)); };
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => { setText(t); run(t); });
    e.target.value = '';
  };
  const demo = (b: unknown) => { const t = JSON.stringify(b, null, 2); setText(t); run(t); };
  const counts = result ? { error: result.findings.filter((f) => f.severity === 'error').length, warn: result.findings.filter((f) => f.severity === 'warn').length, info: result.findings.filter((f) => f.severity === 'info').length } : null;
  if (failed) return <Failed />;
  return (
    <section className="bpr-panel" aria-labelledby="nph-check">
      <h2 id="nph-check">{ar ? 'افحص رسالة نفيس قبل إرسالها' : 'Pre-check a NPHIES message before you send it'}</h2>
      <p className="nph-private"><Lock size={15} aria-hidden="true" /><span>{ar ? 'يتم الفحص بالكامل في متصفحك، ولا يُرفع النص ولا يُحفظ. استخدم بيانات مصطنعة أو منزوعة الهوية مع ذلك.' : 'The check runs entirely in your browser. Nothing is uploaded or stored. Even so, use synthetic or de-identified data.'}</span></p>
      <label className="nph-label" htmlFor="nph-bundle">{ar ? 'الصق حزمة FHIR بصيغة JSON' : 'Paste a FHIR Bundle as JSON'}</label>
      <textarea id="nph-bundle" dir="ltr" rows={10} spellCheck={false} autoComplete="off" value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder='{"resourceType":"Bundle","type":"message", ...}' />
      <div className="profile-actions">
        <button type="button" className="profile-button primary" disabled={!spec || !text.trim()} onClick={() => run(text)}>{ar ? 'افحص' : 'Run the check'}<ArrowRight size={16} /></button>
        <label className="profile-button secondary nph-file"><UploadCloud size={16} aria-hidden="true" />{ar ? 'اختر ملفًا' : 'Choose a file'}<input type="file" accept=".json,application/json,application/fhir+json" onChange={onFile} /></label>
        <button type="button" className="profile-button secondary" disabled={!spec} onClick={() => demo(brokenDemoBundle())}>{ar ? 'جرّب مثالًا به أخطاء' : 'Try an example with mistakes'}</button>
        <button type="button" className="profile-button secondary" disabled={!spec} onClick={() => demo(demoBundle())}>{ar ? 'جرّب مثالًا سليمًا' : 'Try a clean example'}</button>
        {text && <button type="button" className="profile-button secondary" onClick={() => { setText(''); setResult(null); }}>{ar ? 'امسح' : 'Clear'}</button>}
      </div>
      {result && counts && (
        <div className="nph-result" role="status">
          <div className={`nph-verdict ${result.ok ? 'ok' : 'bad'}`}>
            {result.ok ? <CheckCircle2 size={20} aria-hidden="true" /> : <XCircle size={20} aria-hidden="true" />}
            <div>
              <strong>{result.ok ? (ar ? 'لا توجد أخطاء ضمن ما فحصناه' : 'No errors in what we checked') : (ar ? `أخطاء تجب معالجتها: ${counts.error}` : `${counts.error} ${counts.error === 1 ? 'error' : 'errors'} to fix`)}</strong>
              <small>{ar ? `تحذيرات: ${counts.warn} · ملاحظات: ${counts.info} · فحوص منفذة: ${result.checked}` : `${counts.warn} warnings · ${counts.info} notes · ${result.checked} checks run`}{result.profile ? <> · <span dir="ltr">{result.profile}</span></> : null}</small>
            </div>
          </div>
          {result.findings.length > 0 && <ul className="nph-findings">{[...result.findings].sort((a, b) => ['error', 'warn', 'info'].indexOf(a.severity) - ['error', 'warn', 'info'].indexOf(b.severity)).map((f, i) => {
            const S = SEV[f.severity];
            return (
              <li key={`${f.id}-${f.where}-${i}`} className={f.severity}>
                <S.icon size={16} aria-label={ar ? S.ar : S.en} />
                <div>
                  <p>{ar ? f.ar : f.en}</p>
                  <small><code dir="ltr">{f.where}</code>{f.rule && <> · <span dir="ltr">{f.rule}</span></>}{f.reason && <> · <Link to={reasonLink(f.reason)}>{ar ? `قد يؤدي إلى ${f.reason}` : `can lead to ${f.reason}`}</Link></>}</small>
                </div>
              </li>
            );
          })}</ul>}
        </div>
      )}
      <p className="nph-note">{ar ? 'هذا فحص أولي وليس تحققًا من نفيس. يغطي جزءًا من المتطلبات المنشورة، ونجاحه لا يعني قبول الرسالة من المنصة أو شركة التأمين. ولا تُفحص هنا قوائم الرموز المرخصة.' : 'This is a first pass, not NPHIES validation. It covers part of the published requirements, and passing does not mean the platform or a payer will accept the message. Licensed code lists are not checked here.'}</p>
    </section>
  );
}

// ── Readiness ─────────────────────────────────────────────────────────────────────────────────
function Ready() {
  const { ar } = useI18n();
  const [facility, setFacility] = useState<Facility>('hospital');
  const [billing, setBilling] = useState<Billing>('shadow');
  const steps = STEPS.filter((s) => (!s.who || s.who.includes(facility)) && (!s.billing || (facility === 'hospital' && s.billing.includes(billing))));
  const selected = FACILITIES.find((f) => f.id === facility)!;
  return (
    <section className="bpr-panel" aria-labelledby="nph-ready">
      <h2 id="nph-ready">{ar ? 'خطة جاهزية حسب نوع منشأتك' : 'A readiness plan for your type of facility'}</h2>
      <div className="nph-form">
        <fieldset><legend>{ar ? 'نوع المنشأة' : 'Facility type'}</legend>
          <div className="nph-chips">{FACILITIES.map((f) => <button type="button" key={f.id} aria-pressed={facility === f.id} onClick={() => setFacility(f.id)}>{ar ? f.ar : f.en}</button>)}</div>
        </fieldset>
        {facility === 'hospital' && <fieldset><legend>{ar ? 'مرحلة DRG' : 'DRG phase'}</legend>
          <div className="nph-chips">{([['none', 'Not started', 'لم تبدأ'], ['shadow', 'Shadow billing', 'فوترة موازية'], ['actual', 'Actual billing', 'فوترة فعلية']] as const).map(([id, en, a]) => <button type="button" key={id} aria-pressed={billing === id} onClick={() => setBilling(id)}>{ar ? a : en}</button>)}</div>
        </fieldset>}
      </div>
      <p className="nph-count">{ar ? 'الملف المستخدم:' : 'Profile used:'} <code dir="ltr">{selected.profile}</code> · {ar ? `الخطوات: ${steps.length}` : `${steps.length} steps`}
        <button type="button" className="nph-print" onClick={() => window.print()}><Printer size={14} aria-hidden="true" />{ar ? 'اطبع' : 'Print'}</button></p>
      <div className="nph-stages">{STAGES.map((st) => {
        const list = steps.filter((s) => s.stage === st.id);
        if (!list.length) return null;
        return (
          <div key={st.id} className="nph-stage">
            <h3>{ar ? st.ar : st.en}</h3>
            <ol>{list.map((s) => (
              <li key={s.en}>
                <p>{ar ? s.ar : s.en}</p>
                <small><span dir="ltr">{s.source}</span>{s.because?.length ? <> · {ar ? 'يمنع' : 'Prevents'} {s.because.map((c, i) => <span key={c}>{i > 0 ? ' ' : ''}<Link dir="ltr" to={reasonLink(c)}>{c}</Link></span>)}</> : null}</small>
              </li>
            ))}</ol>
          </div>
        );
      })}</div>
    </section>
  );
}

// ── Clinician data ────────────────────────────────────────────────────────────────────────────
type Row = { need: [string, string]; path: string; state: 'ready' | 'private' | 'gap' | 'pending'; note: [string, string]; reason?: string };
const STATE: Record<Row['state'], [string, string]> = { ready: ['Available', 'متوفر'], private: ['Private field needed', 'يلزم حقل خاص'], gap: ['Not recorded yet', 'غير مسجل بعد'], pending: ['Not assessed', 'لم يُقيَّم'] };

function Clinician() {
  const { ar } = useI18n();
  const [spid, setSpid] = useState('SA-PHY-000003');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed' | 'invalid'>('idle');
  const [q, setQ] = useState('');
  const practice = useKb<{ items: Code[] }>('practice-codes');
  const load = (id: string) => {
    const clean = id.trim().toUpperCase();
    if (!/^SA-[A-Z]{2,4}-\d{6}$/.test(clean)) { setStatus('invalid'); setRows(null); return; }
    setStatus('loading');
    fetch(`${REGISTRY}/fhir/Practitioner/${encodeURIComponent(clean)}`, { headers: { Accept: 'application/fhir+json' } })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((p: any) => {
        const hasName = (p.name ?? []).length > 0;
        const hasSpecialty = (p.qualification ?? []).length > 0;
        setRows([
          { need: ['Record is active', 'السجل نشط'], path: 'Practitioner.active', state: p.active === true ? 'ready' : 'gap', note: ['Read live from the BPR FHIR record.', 'يُقرأ مباشرة من سجل FHIR في BPR.'] },
          { need: ['Name', 'الاسم'], path: 'Practitioner.name', state: hasName ? 'ready' : 'gap', note: ['Optional in the profile, and useful for matching.', 'اختياري في الملف التعريفي ومفيد في المطابقة.'] },
          { need: ['Licence identifier', 'معرّف الترخيص'], path: 'Practitioner.identifier', state: 'private', reason: 'AD-1-8', note: ['Required. BPR never publishes licence numbers, so this must come from a private, consented field when a claim is built.', 'إلزامي. لا ينشر BPR أرقام التراخيص، لذا يأتي من حقل خاص بموافقة الممارس عند إنشاء المطالبة.'] },
          { need: ['Practice code', 'رمز التخصص'], path: 'Claim.careTeam.qualification', state: hasSpecialty ? 'ready' : 'gap', reason: 'AD-1-6', note: ['Required on every claim. Find the code below and record it on the BPR profile.', 'إلزامي في كل مطالبة. ابحث عن الرمز أدناه وسجّله في ملف BPR.'] },
          { need: ['Licence valid on the service date', 'سريان الترخيص في تاريخ الخدمة'], path: 'SCFHS', state: 'pending', reason: 'AD-1-8', note: ['Shows “not assessed” until the SCFHS integration is complete.', 'تظهر «لم تُقيَّم» إلى أن يكتمل التكامل مع الهيئة.'] },
        ]);
        setStatus('idle');
      })
      .catch(() => { setStatus('failed'); setRows(null); });
  };
  useEffect(() => { load(spid); /* first paint shows the sample record */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const term = q.trim().toLowerCase();
  const codes = (practice.data?.items ?? []).filter((c) => !term || c.code.includes(term) || c.display.toLowerCase().includes(term)).slice(0, term ? 40 : 12);
  return (
    <section className="bpr-panel" aria-labelledby="nph-clin">
      <h2 id="nph-clin">{ar ? 'ما الذي تحتاجه المطالبة عن الممارس؟' : 'What a claim needs to know about a clinician'}</h2>
      <p className="nph-lead">{ar ? 'تُقرأ البيانات العامة للممارس مباشرة من BPR وتُقارن بالملف التعريفي للممارس في نفيس. هذا لا يعني أنه معتمد في نفيس.' : 'This reads a clinician’s public BPR record live and compares it with the NPHIES practitioner profile. It does not mean the clinician is registered on NPHIES.'}</p>
      <form className="nph-search" onSubmit={(e) => { e.preventDefault(); load(spid); }}>
        <label htmlFor="nph-spid" className="sr-only">SPID</label>
        <input id="nph-spid" dir="ltr" value={spid} onChange={(e) => setSpid(e.target.value)} autoComplete="off" />
        <button type="submit" className="profile-button secondary">{ar ? 'افحص' : 'Check'}</button>
      </form>
      {status === 'loading' && <Loading />}
      {status === 'invalid' && <p className="nph-note" role="alert">{ar ? 'الصيغة المتوقعة: SA-PHY-000003' : 'Expected format: SA-PHY-000003'}</p>}
      {status === 'failed' && <Failed>{ar ? 'تعذرت قراءة هذا السجل من BPR.' : 'This record could not be read from BPR.'}</Failed>}
      {rows && <div className="nph-table-wrap"><table className="nph-table">
        <thead><tr><th>{ar ? 'المطلوب' : 'Needed'}</th><th>{ar ? 'الحالة' : 'State'}</th><th>{ar ? 'التفاصيل' : 'Details'}</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.path}>
            <td><strong>{r.need[ar ? 1 : 0]}</strong><code dir="ltr">{r.path}</code></td>
            <td><span className={`nph-state ${r.state}`}>{STATE[r.state][ar ? 1 : 0]}</span></td>
            <td>{r.note[ar ? 1 : 0]}{r.reason && <> <Link dir="ltr" to={reasonLink(r.reason)}>{r.reason}</Link></>}</td>
          </tr>
        ))}</tbody>
      </table></div>}
      <h3 className="nph-sub">{ar ? 'ابحث عن رمز التخصص' : 'Find a practice code'}</h3>
      <div className="nph-search">
        <label htmlFor="nph-pc"><Search size={15} aria-hidden="true" /><span className="sr-only">{ar ? 'ابحث عن رمز التخصص' : 'Search practice codes'}</span></label>
        <input id="nph-pc" dir="ltr" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cardiology, 08.02" autoComplete="off" />
      </div>
      {practice.failed ? <Failed /> : <ul className="nph-codes" dir="ltr">{codes.map((c) => <li key={c.code}><code>{c.code}</code> {c.display}</li>)}</ul>}
      <p className="nph-count" role="status">{ar ? `معروض ${codes.length} من ${practice.data?.items.length ?? 0}` : `Showing ${codes.length} of ${practice.data?.items.length ?? 0}`}</p>
    </section>
  );
}

// ── Changes ───────────────────────────────────────────────────────────────────────────────────
function Changes() {
  const { ar } = useI18n();
  const { data, failed } = useKb<{ diff: { profiles: any; codes: any } }>('changes');
  if (failed) return <Failed />;
  return (
    <section className="bpr-panel" aria-labelledby="nph-changes">
      <h2 id="nph-changes">{ar ? 'ما الذي تغيّر، ومن يهمه ذلك؟' : 'What changed, and who it affects'}</h2>
      <p className="nph-note">{ar ? 'ملخص من برينسايت لسجلات التغيير المنشورة. تأكد من مواعيد التطبيق لمنشأتك عبر نفيس.' : 'A BrainSAIT summary of the published change logs. Confirm the go-live dates for your facility with NPHIES.'}</p>
      <div className="nph-releases">{RELEASES.map((r) => (
        <article key={r.id}>
          <header><h3>{ar ? r.ar : r.en}</h3><small dir="ltr">{r.when}</small></header>
          <p className="nph-who"><strong>{ar ? 'يهم:' : 'Affects:'}</strong> {r.who[ar ? 1 : 0]}</p>
          <ul>{(ar ? r.pointsAr : r.pointsEn).map((p) => <li key={p}>{p}</li>)}</ul>
          <small dir="ltr">{r.docs}</small>
        </article>
      ))}</div>
      {data && <div className="nph-diff">
        <h3>{ar ? 'الفروق المحتسبة بين الإصدارين' : 'Computed difference between versions'}</h3>
        <dl dir="ltr">
          <div><dt>Profiles {data.diff.profiles.from} → {data.diff.profiles.to}</dt><dd>Sheets added: {data.diff.profiles.sheetsAdded.join(', ') || 'none'}</dd></div>
          <div><dt>Code sets {data.diff.codes.from} → {data.diff.codes.to}</dt><dd>Systems added: {data.diff.codes.systemsAdded.join(', ')}. Removed: {data.diff.codes.systemsRemoved.join(', ') || 'none'}.</dd></div>
          {Object.entries<string[]>(data.diff.codes.codesAdded).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v.join(', ')}</dd></div>)}
        </dl>
      </div>}
    </section>
  );
}

// ── Docs API ──────────────────────────────────────────────────────────────────────────────────
function Api() {
  const { ar } = useI18n();
  const { data, failed } = useKb<Manifest>('manifest');
  if (failed) return <Failed />;
  if (!data) return <Loading />;
  const origin = 'https://fadil369.github.io';
  return (
    <section className="bpr-panel" aria-labelledby="nph-api">
      <h2 id="nph-api">{ar ? 'الوثائق كخدمة: ملفات JSON ثابتة بمصدر معلن' : 'Docs as a service: static JSON with declared sources'}</h2>
      <p className="nph-lead">{ar ? 'ملفات عامة للقراءة فقط، يمكن للأنظمة والوكلاء الأذكياء استخدامها. يذكر الملف الرئيسي مصدر كل مجموعة بياناتها وإصدارها وبصمة SHA-256.' : 'Public, read-only files that systems and AI agents can use. The manifest names each source document, its version and its SHA-256 fingerprint.'}</p>
      <div className="nph-table-wrap"><table className="nph-table" dir="ltr">
        <thead><tr><th>Endpoint</th><th>Size</th></tr></thead>
        <tbody>
          <tr><td><a href={`${KB}/manifest.json`}><code>{KB}/manifest.json</code></a></td><td>index</td></tr>
          {Object.values(data.files).map((f) => <tr key={f.path}><td><a href={f.path}><code>{f.path}</code></a></td><td>{Math.ceil(f.bytes / 1024)} KB</td></tr>)}
        </tbody>
      </table></div>
      <pre className="nph-pre" dir="ltr" tabIndex={0}>{`curl -s ${origin}${KB}/rejection-reasons.json \\\n  | jq '.items[] | select(.code=="AD-1-8") | {code, official, en, ar, doEn, route}'`}</pre>
      <h3 className="nph-sub">{ar ? 'المصادر' : 'Sources'}</h3>
      <div className="nph-table-wrap"><table className="nph-table" dir="ltr">
        <thead><tr><th>Document</th><th>Version</th><th>Label</th><th>SHA-256</th></tr></thead>
        <tbody>{data.sources.map((s) => <tr key={s.sha256}><td>{s.document}</td><td>{s.version}</td><td>{s.label}</td><td><code title={s.sha256}>{s.sha256.slice(0, 16)}…</code></td></tr>)}</tbody>
      </table></div>
      <p className="nph-note">{ar ? 'لا تُعاد هنا قوائم SBS وICD-10-AM وAR-DRG وGMDN وLOINC ولا نصوص قواعد التحقق. وهذا مرجع مستقل لا يصدره مجلس الضمان الصحي أو نفيس ولا يقرّانه.' : `${data.excluded} ${data.status}`}</p>
      <p className="nph-note">{ar ? 'تاريخ البناء:' : 'Built:'} <span dir="ltr">{data.generated}</span> · <a href="/llms.txt">llms.txt</a></p>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────────────────────
export default function Nphies() {
  const { ar } = useI18n();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : 'decode';
  usePageMeta({
    title: ar ? 'مكتب نفيس: رموز الرفض والفحص والجاهزية — BPR' : 'NPHIES desk: rejection codes, pre-check and readiness — BPR',
    description: ar ? 'افهم رموز رفض نفيس بالعربية والإنجليزية، وافحص رسائلك على جهازك، واحصل على خطة جاهزية لمنشأتك.' : 'Understand NPHIES rejection codes in Arabic and English, pre-check messages on your device, and get a readiness plan for your facility.',
    url: '/bpr/nphies', type: 'website',
  });
  return (
    <BprLayout kicker={ar ? 'مكتب نفيس' : 'NPHIES desk'}
      title={ar ? 'افهم سبب الرفض، وأصلحه، وامنع تكراره.' : 'Understand the rejection, fix it, and stop it coming back.'}
      lead={ar ? 'مرجع ثنائي اللغة مبني على وثائق نفيس المصنفة عامة: كل رمز رفض بلغة واضحة، وفحص أولي على جهازك، وخطة حسب نوع منشأتك.' : 'A bilingual reference built from NPHIES documents labelled public: every rejection code in plain language, a pre-check that runs on your device, and a plan for your type of facility.'}>
      <div className="nph-status" role="note">
        <span className="ws-status live">{ar ? 'يعمل اليوم' : 'Live today'}</span><span>{ar ? 'هذا المكتب المرجعي' : 'This reference desk'}</span>
        <span className="ws-status awaiting">{ar ? 'تكامل جارٍ' : 'Ongoing integration'}</span><span>{ar ? 'إرسال المعاملات إلى نفيس' : 'Sending transactions to NPHIES'}</span>
        <small>{ar ? 'عرض توضيحي: الشروح والخطوات إرشادات من برينسايت وما زالت قيد المراجعة، فلا تعتمد عليها في قرار مطالبة فعلية. وهو مرجع مستقل، غير متصل بنفيس وغير معتمد منه، ولا يصدر عن مجلس الضمان الصحي.' : 'Demonstration: the explanations and steps are BrainSAIT guidance still under review, so do not rely on them for a live claim decision. Independent reference. Not connected to or certified by NPHIES, and not issued by the Council of Health Insurance.'}</small>
      </div>
      <nav className="nph-tabs" aria-label={ar ? 'أقسام مكتب نفيس' : 'NPHIES desk sections'}>
        {TABS.map((t) => (
          <button type="button" key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setParams(t.id === 'decode' ? {} : { tab: t.id })}>
            <t.icon size={15} aria-hidden="true" />{ar ? t.ar : t.en}
          </button>
        ))}
      </nav>
      {tab === 'decode' && <Decode code={params.get('code')} />}
      {tab === 'check' && <Check />}
      {tab === 'ready' && <Ready />}
      {tab === 'clinician' && <Clinician />}
      {tab === 'changes' && <Changes />}
      {tab === 'api' && <Api />}
    </BprLayout>
  );
}
