import { useState } from 'react';
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
  const [out, setOut] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState('');
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
        ? 'تعذّر الوصول إلى السجل من هذا المتصفح. جرّب curl.'
        : 'The registry could not be reached from this browser. Try curl.' }));
    }
  };
  const copy = (path: string) => navigator.clipboard?.writeText(`curl -s '${REGISTRY}${path}'`).then(() => { setCopied(path); setTimeout(() => setCopied(''), 1600); }, () => {});

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
        <p className="bpr-note">{ar ? 'الأساس' : 'Base'}: <code dir="ltr">{REGISTRY}</code>. {ar ? 'كل المسارات العامة تقبل الطلبات من أي متصفح (CORS) — للقراءة فقط، دون ملفات تعريف الارتباط.' : 'Every public route accepts requests from any browser (CORS) — read-only, no cookies.'}</p>
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
              {open === e.path && out[e.path] && <pre className="bpr-out" dir="ltr">{out[e.path]}</pre>}
            </li>
          ))}
        </ul>
        <p className="bpr-note"><ExtLink href={`${REGISTRY}/fhir/metadata`}>CapabilityStatement</ExtLink></p>
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
