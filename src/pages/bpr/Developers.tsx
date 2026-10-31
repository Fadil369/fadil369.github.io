import { useState } from 'react';
import { Copy, Play } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, ExtLink, Failed, Loading, SourceBadge } from '../../components/BprKit';
import { FhirCapability, REGISTRY, useLoad } from '../../lib/bpr';

// The registry's documented public routes. "cors" = a browser on another origin may call it.
const ENDPOINTS: { path: string; cors: boolean; en: string; ar: string }[] = [
  { path: '/api/providers', cors: false, en: 'All listed providers with trust states', ar: 'جميع مقدمي الرعاية مع حالات الثقة' },
  { path: '/api/providers/SA-PHY-000003', cors: false, en: 'One provider', ar: 'مقدم رعاية واحد' },
  { path: '/api/search?q=fadil', cors: false, en: 'Search by name, SPID or specialty', ar: 'بحث بالاسم أو المعرّف أو التخصص' },
  { path: '/api/specialties', cors: false, en: 'Resolved specialties with counts', ar: 'التخصصات مع الأعداد' },
  { path: '/api/organizations', cors: false, en: 'Organizations (commercial-register status)', ar: 'المؤسسات (حالة السجل التجاري)' },
  { path: '/api/research?spid=SA-PHY-000003', cors: false, en: 'Research footprint', ar: 'البصمة البحثية' },
  { path: '/api/status', cors: false, en: 'Operations verdict', ar: 'حالة التشغيل' },
  { path: '/fhir/metadata', cors: false, en: 'FHIR R4 CapabilityStatement', ar: 'بيان قدرات FHIR R4' },
  { path: '/fhir/Practitioner/SA-PHY-000003', cors: false, en: 'Practitioner read', ar: 'قراءة Practitioner' },
  { path: '/fhir/Practitioner?name=fadil&_count=10', cors: false, en: 'Practitioner search', ar: 'بحث Practitioner' },
  { path: '/fhir/PractitionerRole?identifier=SA-PHY-000003', cors: false, en: 'BPR membership window as PractitionerRole', ar: 'فترة العضوية كـ PractitionerRole' },
  { path: '/.well-known/did.json', cors: true, en: 'Issuer DID document (Ed25519 key)', ar: 'وثيقة DID للمُصدر (مفتاح Ed25519)' },
  { path: '/vc/SA-PHY-000003', cors: true, en: 'Current signed credential', ar: 'الاعتماد الموقّع الحالي' },
  { path: '/vc/status/SA-PHY-000003', cors: true, en: 'Live credential status', ar: 'حالة الاعتماد المباشرة' },
  { path: '/transparency/log.json', cors: true, en: 'Full transparency log', ar: 'السجل الشفاف كاملًا' },
  { path: '/transparency/head.json', cors: true, en: 'Signed log head', ar: 'رأس السجل الموقّع' },
];

export default function Developers() {
  const { ar } = useI18n();
  const cap = useLoad<FhirCapability>('/fhir/metadata', 'fhir/metadata.json');
  const [open, setOpen] = useState<string | null>(null);
  const [out, setOut] = useState<Record<string, string>>({});
  usePageMeta({
    title: ar ? 'FHIR والواجهة العامة — BPR' : 'FHIR R4 & public API — BPR',
    description: ar ? 'موارد FHIR R4 وواجهة JSON عامة ونقاط التحقق لسجل برينسايت.' : 'FHIR R4 resources, the public JSON API and verification endpoints of the BrainSAIT Provider Registry.',
    url: '/bpr/developers', type: 'website',
  });

  const tryIt = async (path: string) => {
    setOpen(path);
    setOut((o) => ({ ...o, [path]: '…' }));
    try {
      const r = await fetch(REGISTRY + path, { cache: 'no-store' });
      const t = await r.text();
      let body = t;
      try { body = JSON.stringify(JSON.parse(t), null, 2); } catch { /* not JSON */ }
      setOut((o) => ({ ...o, [path]: `HTTP ${r.status}\n\n${body.slice(0, 6000)}${body.length > 6000 ? '\n…' : ''}` }));
    } catch {
      setOut((o) => ({ ...o, [path]: ar
        ? 'حظر المتصفح الطلب: هذا المسار لا يرسل ترويسة CORS. استدعِه من خادمك أو عبر curl.'
        : 'The browser blocked this request: the route sends no CORS header. Call it from your server or with curl.' }));
    }
  };
  const copy = (path: string) => navigator.clipboard?.writeText(`curl -s '${REGISTRY}${path}'`).catch(() => {});

  return (
    <BprLayout kicker={ar ? 'للمطورين' : 'Developers'}
      title={ar ? 'اقرأ مقدمي الرعاية كبيانات، لا كصور.' : 'Read providers as data, not screenshots.'}
      lead={ar
        ? 'موارد FHIR R4 وواجهة JSON للبيانات العامة فقط — لا تُنشر أرقام التراخيص أبدًا. لا يُدّعى توافق مع NPHIES.'
        : 'FHIR R4 resources and a JSON API over public fields only — licence numbers are never published. No NPHIES conformance is claimed.'}>
      <section className="bpr-panel">
        <div className="bpr-panel-head"><h2>FHIR {cap.state === 'ready' ? cap.data.fhirVersion : 'R4'} · CapabilityStatement</h2>{cap.state === 'ready' && <SourceBadge source={cap.source} />}</div>
        {cap.state === 'loading' && <Loading />}
        {cap.state === 'error' && <Failed />}
        {cap.state === 'ready' && <div className="bpr-table-wrap"><table className="bpr-table" dir="ltr">
          <thead><tr><th>Resource</th><th>Interactions</th><th>Search parameters</th></tr></thead>
          <tbody>{cap.data.rest[0].resource.map((r) => (
            <tr key={r.type}><td><strong>{r.type}</strong></td><td>{(r.interaction || []).map((i) => <code key={i.code}>{i.code}</code>)}</td><td>{(r.searchParam || []).map((s) => <code key={s.name} title={s.documentation}>{s.name}</code>)}</td></tr>
          ))}</tbody>
        </table></div>}
        {cap.state === 'ready' && <p className="bpr-note" dir="ltr">{cap.data.title} · v{cap.data.version} · {cap.data.date}</p>}
      </section>

      <section className="bpr-panel">
        <h2>{ar ? 'نقاط الوصول العامة' : 'Public endpoints'}</h2>
        <p className="bpr-note">{ar ? 'الأساس' : 'Base'}: <code dir="ltr">{REGISTRY}</code>. {ar ? 'مسارات CORS يمكن استدعاؤها من أي متصفح؛ البقية من الخادم.' : 'CORS routes can be called from any browser; the rest from a server.'}</p>
        <ul className="bpr-endpoints">
          {ENDPOINTS.map((e) => (
            <li key={e.path}>
              <div className="bpr-endpoint-row">
                <span className="bpr-method">GET</span>
                <code dir="ltr">{e.path}</code>
                <span className={`bpr-cors ${e.cors ? 'yes' : ''}`}>{e.cors ? 'CORS' : (ar ? 'خادم' : 'server')}</span>
                <small>{ar ? e.ar : e.en}</small>
                <div className="bpr-endpoint-actions">
                  <button onClick={() => tryIt(e.path)} aria-label={`${ar ? 'جرّب' : 'Try'} ${e.path}`}><Play size={13} />{ar ? 'جرّب' : 'Try'}</button>
                  <button onClick={() => copy(e.path)} aria-label={`${ar ? 'انسخ curl' : 'Copy curl'} ${e.path}`}><Copy size={13} />curl</button>
                </div>
              </div>
              {open === e.path && out[e.path] && <pre className="bpr-out" dir="ltr">{out[e.path]}</pre>}
            </li>
          ))}
        </ul>
        <p className="bpr-note"><ExtLink href={`${REGISTRY}/fhir/metadata`}>CapabilityStatement</ExtLink></p>
      </section>
    </BprLayout>
  );
}
