import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowRight, Braces, FlaskConical, IdCard, KeyRound } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, CheckRow, ExtLink, Failed, fmtDate, Loading, ScfhsPending, SourceBadge, TrustGrid, valueLabel } from '../../components/BprKit';
import { checkCredential, CredentialResult, Provider, SPID_RE, useLoad } from '../../lib/bpr';

const ORIGIN = 'https://fadil369.github.io';

export default function ProviderProfile() {
  const { ar } = useI18n();
  const spid = (useParams().spid || '').toUpperCase();
  const valid = SPID_RE.test(spid);
  const p = useLoad<Provider>(valid ? `/api/providers/${spid}` : null, `providers/${spid}.json`);
  const fhir = useLoad<object>(valid ? `/fhir/Practitioner/${spid}` : null, `fhir/Practitioner/${spid}.json`);
  const [cred, setCred] = useState<CredentialResult | null>(null);
  const [credErr, setCredErr] = useState(false);
  const [qr, setQr] = useState('');
  const prov = p.state === 'ready' ? p.data : null;
  const src = p.state === 'ready' ? p.source : 'snapshot';

  useEffect(() => {
    setCred(null); setCredErr(false);
    if (prov?.trust.signature === 'current') checkCredential(spid).then(setCred, () => setCredErr(true));
  }, [prov, spid]);
  useEffect(() => {
    if (!valid) return;
    QRCode.toString(`${ORIGIN}/bpr/verify?spid=${spid}`, { type: 'svg', margin: 4, errorCorrectionLevel: 'M', color: { dark: '#111207', light: '#edf34a' } }).then(setQr, () => setQr(''));
  }, [spid, valid]);

  usePageMeta({
    title: prov ? `${ar ? prov.name_ar : prov.name_en} · ${spid} — BPR` : `${spid} — BPR`,
    description: prov ? (ar ? prov.trust_summary_ar : prov.trust_summary) : 'BrainSAIT Provider Registry profile',
    url: `/bpr/p/${spid}`, type: 'profile',
  });

  if (!valid || p.state === 'error') {
    return <BprLayout kicker="BPR" title={ar ? 'لم يُعثر على مقدم الرعاية' : 'Provider not found'}>
      <Failed>{ar ? `لا يوجد سجل عام للمعرّف ${spid || '—'}.` : `There is no public record for ${spid || '—'}.`}</Failed>
      <p><Link className="profile-text-link" to="/bpr/providers">{ar ? 'العودة إلى الدليل' : 'Back to the directory'}<ArrowRight size={14} /></Link></p>
    </BprLayout>;
  }
  if (!prov) return <BprLayout kicker="BPR" title={spid}><Loading /></BprLayout>;

  return (
    <BprLayout kicker={`BPR · ${prov.type}`} title={ar ? prov.name_ar : prov.name_en}
      lead={<span><bdi dir={ar ? 'ltr' : 'rtl'} lang={ar ? 'en' : 'ar'}>{ar ? prov.name_en : prov.name_ar}</bdi> · <bdi dir="ltr"><code dir="ltr">{spid}</code></bdi> · {prov.specialty || (ar ? 'التخصص غير مذكور' : 'Specialty not stated')}</span>}>
      <div className="bpr-profile-grid">
        <section className="bpr-panel">
          <div className="bpr-panel-head"><h2>{ar ? 'حالة الثقة' : 'Trust, dimension by dimension'}</h2><SourceBadge source={src} /></div>
          <TrustGrid trust={prov.trust} />
          <p className="bpr-note" dir="auto">{ar ? prov.trust_summary_ar : prov.trust_summary}</p>
          {(prov.trust.licence === 'not_assessed' || prov.trust.qualifications === 'not_assessed') && <ScfhsPending />}
          <dl className="bpr-facts">
            <div><dt>{ar ? 'العضوية صالحة حتى' : 'Membership valid to'}</dt><dd>{fmtDate(prov.membership_valid_to, ar)}</dd></div>
            <div><dt>{ar ? 'المستندات' : 'Credentials review'}</dt><dd>{valueLabel(prov.verification.credentials, ar)}</dd></div>
            <div><dt>{ar ? 'ملكية النطاق' : 'Domain ownership'}</dt><dd>{valueLabel(prov.verification.domain_ownership, ar)}</dd></div>
            <div><dt>OID</dt><dd dir="ltr">{prov.publisher_oid_root || '—'}</dd></div>
            <div><dt>{ar ? 'آخر تحديث' : 'Updated'}</dt><dd>{fmtDate(prov.updated_at, ar, true)}</dd></div>
          </dl>
        </section>

        <aside className="bpr-panel bpr-qr-panel">
          <h2><IdCard size={18} />{ar ? 'امسح للتحقق' : 'Scan to verify'}</h2>
          {qr && <div className="bpr-qr" role="img" aria-label={ar ? `رمز QR للتحقق من ${spid}` : `QR code to verify ${spid}`} dangerouslySetInnerHTML={{ __html: qr }} />}
          <small dir="ltr">fadil369.github.io/bpr/verify?spid={spid}</small>
          <div className="bpr-link-list">
            <ExtLink href={prov.profile_url}>{ar ? 'الملف على السجل' : 'Registry profile'}</ExtLink>
            {prov.card_url && <ExtLink href={prov.card_url}>{ar ? 'بطاقة العضوية' : 'Member card'}</ExtLink>}
            {prov.orcid && <ExtLink href={prov.orcid}>ORCID</ExtLink>}
            {prov.passport_url && <ExtLink href={prov.passport_url}>{ar ? 'الصفحة الشخصية' : 'Personal page'}</ExtLink>}
            {spid === 'SA-PHY-000003' && <><Link className="bpr-ext" to="/">{ar ? 'الملف المهني' : 'Professional profile'}<ArrowRight size={13} /></Link><Link className="bpr-ext" to="/cv">{ar ? 'السيرة الذاتية' : 'CV'}<ArrowRight size={13} /></Link></>}
          </div>
        </aside>
      </div>

      <section className="bpr-panel">
        <div className="bpr-panel-head"><h2><KeyRound size={18} />{ar ? 'الاعتماد الموقّع' : 'Signed credential'}</h2>{cred && <SourceBadge source={cred.source} />}</div>
        {prov.trust.signature !== 'current'
          ? <p className="bpr-note">{ar ? 'لا يحمل مقدم الرعاية هذا اعتمادًا موقّعًا ساريًا. يُصدر السجل الاعتماد بعد تأكيد ملكية ORCID.' : 'This provider holds no current signed credential. The registry issues one once ORCID ownership is confirmed.'}</p>
          : credErr ? <Failed />
          : <>
            <CheckRow label={ar ? 'التوقيع' : 'Signature'} check={cred?.signature || { state: 'pending' }} />
            <CheckRow label={ar ? 'فترة الصلاحية' : 'Validity window'} check={cred?.expiry || { state: 'pending' }} okText={ar ? 'سارية' : 'In date'} />
            <CheckRow label={ar ? 'الحالة المباشرة' : 'Live status'} check={cred?.status || { state: 'pending' }} okText={valueLabel(cred?.status.value, ar)} />
            <p><Link className="profile-text-link" to={`/bpr/verify?spid=${spid}`}>{ar ? 'افتح في أداة التحقق' : 'Open in the verifier'}<ArrowRight size={14} /></Link></p>
          </>}
      </section>

      {prov.research_url && <section className="bpr-panel bpr-row-link">
        <FlaskConical size={20} /><div><h2>{ar ? 'البصمة البحثية' : 'Research footprint'}</h2><p>{ar ? 'أعمال مطابقة عبر ORCID وZenodo وHugging Face.' : 'Works matched across ORCID, Zenodo and Hugging Face.'}</p></div>
        <Link className="profile-button secondary" to={`/bpr/research/${spid}`}>{ar ? 'عرض' : 'View'}<ArrowRight size={14} /></Link>
      </section>}

      <section className="bpr-panel">
        <div className="bpr-panel-head"><h2><Braces size={18} />FHIR R4 · Practitioner/{spid}</h2>{fhir.state === 'ready' && <SourceBadge source={fhir.source} />}</div>
        {fhir.state === 'ready'
          ? <details className="bpr-json"><summary>{ar ? 'عرض المورد' : 'Show resource'}</summary><pre dir="ltr">{JSON.stringify(fhir.data, null, 2)}</pre></details>
          : fhir.state === 'loading' ? <Loading /> : <Failed />}
      </section>
    </BprLayout>
  );
}
