import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Copy, Play } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, ExtLink, Failed, Loading, SourceBadge } from '../../components/BprKit';
import { FhirCapability, REGISTRY, useLoad } from '../../lib/bpr';

// The registry's documented public routes. All of them send Access-Control-Allow-Origin: *.
const ENDPOINTS: { path: string; en: string; ar: string }[] = [
  { path: '/api/providers', en: 'All listed providers with trust states', ar: 'جميع مقدمي الرعاية مع حالات الثقة' },
  { path: '/api/providers/SA-PHY-000003', en: 'One provider', ar: 'مقدم رعاية واحد' },
  { path: '/api/search?q=fadil', en: 'Search by name, SPID or specialty', ar: 'بحث بالاسم أو المعرّف أو التخصص' },
  { path: '/api/specialties', en: 'Resolved specialties with counts', ar: 'التخصصات مع الأعداد' },
  { path: '/api/organizations', en: 'Organizations (commercial-register status)', ar: 'المؤسسات (حالة السجل التجاري)' },
  { path: '/api/research?spid=SA-PHY-000003', en: 'Research footprint', ar: 'البصمة البحثية' },
  { path: '/api/status', en: 'Operations verdict', ar: 'حالة التشغيل' },
  { path: '/fhir/metadata', en: 'FHIR R4 CapabilityStatement', ar: 'بيان قدرات FHIR R4' },
  { path: '/fhir/Practitioner/SA-PHY-000003', en: 'Practitioner read', ar: 'قراءة Practitioner' },
  { path: '/fhir/Practitioner?name=fadil&_count=10', en: 'Practitioner search', ar: 'بحث Practitioner' },
  { path: '/fhir/PractitionerRole?identifier=SA-PHY-000003', en: 'BPR membership window as PractitionerRole', ar: 'فترة العضوية كـ PractitionerRole' },
  { path: '/.well-known/did.json', en: 'Issuer DID document (Ed25519 key)', ar: 'وثيقة DID للمُصدر (مفتاح Ed25519)' },
  { path: '/vc/SA-PHY-000003', en: 'Current signed credential', ar: 'الاعتماد الموقّع الحالي' },
  { path: '/vc/status/SA-PHY-000003', en: 'Live credential status', ar: 'حالة الاعتماد المباشرة' },
  { path: '/transparency/log.json', en: 'Full transparency log', ar: 'السجل الشفاف كاملًا' },
  { path: '/transparency/head.json', en: 'Signed log head', ar: 'رأس السجل الموقّع' },
];

const EMBED = '<iframe src="https://fadil369.github.io/bpr/embed/SA-PHY-000003" width="380" height="430" title="BPR provider check" style="border:0"></iframe>';

export default function Developers() {
  const { ar } = useI18n();
  const cap = useLoad<FhirCapability>('/fhir/metadata', 'fhir/metadata.json');
  const [open, setOpen] = useState<string | null>(null);
  const [out, setOut] = useState<Record<string, { body: string; status?: number; elapsed?: number; contentType?: string; truncated?: boolean; loading?: boolean }>>({});
  const [copied, setCopied] = useState('');
  const activeRequest = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  useEffect(() => () => activeRequest.current?.abort(), []);
  usePageMeta({
    title: ar ? 'FHIR والواجهة العامة — BPR' : 'FHIR R4 & public API — BPR',
    description: ar ? 'موارد FHIR R4 وواجهة JSON عامة ونقاط التحقق لسجل برينسايت.' : 'FHIR R4 resources, the public JSON API and verification endpoints of the BrainSAIT Provider Registry.',
    url: '/bpr/developers', type: 'website',
  });

  const tryIt = async (path: string) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const id = ++requestId.current;
    const started = performance.now();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    setOpen(path);
    setOut((o) => ({ ...o, [path]: { body: ar ? 'جارٍ تنفيذ الطلب…' : 'Requesting…', loading: true } }));
    try {
      const r = await fetch(REGISTRY + path, { cache: 'no-store', signal: controller.signal, headers: { Accept: path.startsWith('/fhir/') ? 'application/fhir+json, application/json' : 'application/json' } });
      const raw = await r.text();
      const elapsed = Math.round(performance.now() - started);
      const truncated = raw.length > 12000;
      const excerpt = raw.slice(0, 12000);
      let body = excerpt;
      try { body = JSON.stringify(JSON.parse(excerpt), null, 2); } catch { /* show non-JSON responses as text */ }
      if (id === requestId.current) setOut((o) => ({ ...o, [path]: { body, status: r.status, elapsed, contentType: r.headers.get('content-type') || 'unknown', truncated } }));
    } catch (error) {
      if (id !== requestId.current) return;
      const timedOut = controller.signal.aborted;
      setOut((o) => ({ ...o, [path]: { body: timedOut
        ? (ar ? 'انتهت مهلة الطلب بعد 10 ثوانٍ. أعد المحاولة أو استخدم curl.' : 'Request timed out after 10 seconds. Retry or use curl.')
        : (ar ? 'تعذّر الوصول إلى السجل من هذا المتصفح. افحص اتصال الشبكة أو استخدم curl.' : 'The registry could not be reached from this browser. Check network access or try curl.'), elapsed: Math.round(performance.now() - started) } }));
    } finally {
      window.clearTimeout(timeout);
      if (id === requestId.current) activeRequest.current = null;
    }
  };
  const cancelRequest = () => { requestId.current += 1; activeRequest.current?.abort(); activeRequest.current = null; };
  const copy = async (path: string) => {
    try { await navigator.clipboard.writeText(`curl -i -H 'Accept: application/json' '${REGISTRY}${path}'`); setCopied(path); window.setTimeout(() => setCopied(''), 1800); }
    catch { setCopied(''); }
  };

  return (
    <BprLayout kicker={ar ? 'للمطورين' : 'For developers'}
      title={ar ? 'بيانات مقدمي الرعاية، جاهزة لأنظمتكم.' : 'Provider data your systems can read directly.'}
      lead={ar
        ? 'موارد FHIR R4 قياسية وواجهة JSON مفتوحة، تستدعيها من أي متصفح أو خادم دون مفاتيح ولا تسجيل. اربط نظامك اليوم، وبياناتك المهنية العامة محمية: لا تُنشر أرقام التراخيص إطلاقًا.'
        : 'Standard FHIR R4 resources and an open JSON API — call them from any browser or server, no keys, no sign-up. Integrate today; licence numbers are never published.'}>
      <section className="bpr-panel">
        <div className="bpr-panel-head"><h2>FHIR {cap.state === 'ready' ? cap.data.fhirVersion : 'R4'} · CapabilityStatement</h2>{cap.state === 'ready' && <SourceBadge source={cap.source} />}</div>
        {cap.state === 'loading' && <Loading />}
        {cap.state === 'error' && <Failed />}
        {cap.state === 'ready' && <div className="bpr-table-wrap" tabIndex={0} role="region" aria-label={ar ? 'جدول موارد FHIR' : 'FHIR resources table'}><table className="bpr-table" dir="ltr">
          <thead><tr><th>Resource</th><th>Interactions</th><th>Search parameters</th></tr></thead>
          <tbody>{cap.data.rest[0].resource.map((r) => (
            <tr key={r.type}><td><strong>{r.type}</strong></td><td>{(r.interaction || []).map((i) => <code key={i.code}>{i.code}</code>)}</td><td>{(r.searchParam || []).map((s) => <code key={s.name} title={s.documentation}>{s.name}</code>)}</td></tr>
          ))}</tbody>
        </table></div>}
        {cap.state === 'ready' && <p className="bpr-note" dir="ltr">{cap.data.title} · v{cap.data.version} · {cap.data.date}</p>}
      </section>

      <section className="bpr-panel">
        <h2>{ar ? 'نقاط الوصول العامة' : 'Public endpoints'}</h2>
        <p className="bpr-note">{ar ? 'الأساس' : 'Base'}: <code dir="ltr">{REGISTRY}</code>. {ar ? 'مسارات القراءة العامة متاحة للمتصفح (CORS) ولا تحتاج إلى ملفات تعريف ارتباط. تستعمل هذه الأداة GET فقط ولا ترسل عمليات كتابة.' : 'Public read routes are browser-accessible (CORS) and require no cookies. This explorer uses GET only; it never sends writes.'}</p>
        <ul className="bpr-endpoints">
          {ENDPOINTS.map((e) => (
            <li key={e.path}>
              <div className="bpr-endpoint-row">
                <span className="bpr-method">GET</span>
                <code dir="ltr">{e.path}</code>
                <small>{ar ? e.ar : e.en}</small>
                <div className="bpr-endpoint-actions">
                  <button onClick={() => tryIt(e.path)} aria-label={`${ar ? 'جرّب' : 'Try'} ${e.path}`}><Play size={13} />{ar ? 'جرّب' : 'Try'}</button>
                  <button onClick={() => copy(e.path)} aria-label={`${ar ? 'انسخ curl' : 'Copy curl'} ${e.path}`}><Copy size={13} />{copied === e.path ? (ar ? 'نُسخ' : 'Copied') : 'curl'}</button>
                </div>
              </div>
              {open === e.path && out[e.path] && <div className="bpr-api-response">
                <div className="bpr-api-response-head" aria-live="polite">
                  <span>{out[e.path].loading ? (ar ? 'جارٍ الاتصال…' : 'Connecting…') : out[e.path].status ? `HTTP ${out[e.path].status}` : (ar ? 'تعذّر الاتصال' : 'Connection error')}</span>
                  {Number.isFinite(out[e.path].elapsed) && <span>{out[e.path].elapsed} ms</span>}
                  {out[e.path].contentType && <span>{out[e.path].contentType}</span>}
                  {out[e.path].loading && <button type="button" onClick={cancelRequest}>{ar ? 'إيقاف' : 'Cancel'}</button>}
                </div>
                <pre className="bpr-out" dir="ltr">{out[e.path].body}{out[e.path].truncated ? '\n\n… response preview capped at 12,000 characters' : ''}</pre>
              </div>}
            </li>
          ))}
        </ul>
        <p className="bpr-note"><ExtLink href={`${REGISTRY}/fhir/metadata`}>CapabilityStatement</ExtLink></p>
      </section>

      <section className="bpr-panel">
        <h2>{ar ? 'وثائق نفيس كخدمة' : 'NPHIES docs as a service'}</h2>
        <p>{ar ? 'رموز الرفض والأخطاء والتخصصات والملفات التعريفية بصيغة JSON ثابتة بمصدر معلن وبصمة لكل وثيقة.' : 'Rejection codes, error codes, practice codes and profile requirements as static JSON, with a declared source and fingerprint for each document.'}</p>
        <p><Link to="/bpr/nphies?tab=api">{ar ? 'افتح واجهة الوثائق' : 'Open the docs API'}</Link> · <a href="/assets/bpr-data/nphies/v1/manifest.json"><code dir="ltr">manifest.json</code></a></p>
      </section>

      <section className="bpr-panel">
        <h2>{ar ? 'بطاقة تحقق قابلة للتضمين' : 'Embeddable live check'}</h2>
        <p className="bpr-note">{ar ? 'ضعها في صفحة الطاقم لدى المستشفى. تعيد الفحص عند كل عرض — لا شارة ثابتة قد تبقى بعد الإلغاء.' : 'Put it on a hospital staff page. It re-checks on every view — never a static badge that outlives a revocation.'}</p>
        <pre className="bpr-out" dir="ltr">{EMBED}</pre>
        <div className="bpr-endpoint-actions"><button onClick={() => navigator.clipboard?.writeText(EMBED).then(() => { setCopied('embed'); setTimeout(() => setCopied(''), 1600); }, () => {})}><Copy size={13} />{copied === 'embed' ? (ar ? 'نُسخ' : 'Copied') : (ar ? 'انسخ الشيفرة' : 'Copy snippet')}</button></div>
        <iframe className="bpr-embed-frame" src="/bpr/embed/SA-PHY-000003" title={ar ? 'معاينة بطاقة التحقق' : 'Live check preview'} loading="lazy" />
      </section>
    </BprLayout>
  );
}
