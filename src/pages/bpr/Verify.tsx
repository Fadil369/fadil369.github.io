import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, FileKey2, Search, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, CheckRow, Failed, fmtDate, Loading, SourceBadge, valueLabel } from '../../components/BprKit';
import { Check, checkCredential, CredentialClaims, CredentialResult, decodeClaims, forgeName, registryKeys, SPID_RE, verifyJwt } from '../../lib/bpr';

type Mode = 'spid' | 'jwt';
interface PasteResult { claims?: CredentialClaims; signature: Check; expiry?: Check }

export default function Verify() {
  const { ar } = useI18n();
  const [params, setParams] = useSearchParams();
  const initial = (params.get('spid') || '').toUpperCase();
  const [mode, setMode] = useState<Mode>('spid');
  const [spid, setSpid] = useState(initial || 'SA-PHY-000003');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CredentialResult | null>(null);
  const [error, setError] = useState('');
  const [jwt, setJwt] = useState('');
  const [paste, setPaste] = useState<PasteResult | null>(null);
  const [forged, setForged] = useState<Check | null>(null);
  usePageMeta({
    title: ar ? 'التحقق من مقدم رعاية — BPR' : 'Verify a provider — BPR',
    description: ar ? 'تحقق من شهادة BPR الموقّعة على جهازك: التوقيع والصلاحية والحالة المباشرة.' : 'Check a BPR signed credential on your device: signature, validity window and live status.',
    url: '/bpr/verify', type: 'website',
  });

  const run = async (id: string) => {
    setBusy(true); setResult(null); setError(''); setForged(null);
    if (!SPID_RE.test(id)) { setError(ar ? 'صيغة المعرّف غير صحيحة (مثال SA-PHY-000003).' : 'That is not a valid SPID (e.g. SA-PHY-000003).'); setBusy(false); return; }
    try { setResult(await checkCredential(id)); }
    catch { setError(ar ? `لا يوجد اعتماد موقّع منشور للمعرّف ${id}. قد يكون مدرجًا دون اعتماد — راجع ملفه.` : `No signed credential is published for ${id}. The provider may be listed without one — see their profile.`); }
    setBusy(false);
  };
  useEffect(() => { if (initial) run(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitSpid = (e: FormEvent) => { e.preventDefault(); const id = spid.trim().toUpperCase(); setParams({ spid: id }, { replace: true }); run(id); };
  const submitJwt = async (e: FormEvent) => {
    e.preventDefault(); setPaste(null);
    const keys = await registryKeys().catch(() => null);
    if (!keys) { setPaste({ signature: { state: 'unavailable', detail: 'registry keys unavailable' } }); return; }
    let claims: CredentialClaims | undefined;
    try { claims = decodeClaims(jwt.trim()); } catch { /* reported by verifyJwt */ }
    const signature = await verifyJwt(jwt, keys.data);
    const expiry: Check | undefined = claims ? (Date.parse(claims.validUntil) < Date.now() ? { state: 'fail', detail: `expired ${claims.validUntil}` } : { state: 'ok', detail: claims.validUntil }) : undefined;
    setPaste({ claims, signature, expiry });
  };
  const tryForgery = async () => {
    if (!result) return;
    const keys = await registryKeys();
    setForged(await verifyJwt(forgeName(result.jwt, 'Dr. Someone Else'), keys.data));
  };

  return (
    <BprLayout kicker={ar ? 'التحقق' : 'Verify'}
      title={ar ? 'تحقق من مقدم رعاية — على جهازك.' : 'Verify a provider — on your device.'}
      lead={ar
        ? 'يُفحص توقيع Ed25519 في متصفحك باستخدام المفتاح العام المنشور في did:web:registry.brainsait.de. لا حاجة لحساب، ولا يُرفع أي شيء.'
        : 'The Ed25519 signature is checked in your browser against the public key published at did:web:registry.brainsait.de. No account, nothing uploaded.'}>
      <div className="bpr-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'spid'} onClick={() => setMode('spid')}><Search size={15} />{ar ? 'بالمعرّف' : 'By SPID'}</button>
        <button role="tab" aria-selected={mode === 'jwt'} onClick={() => setMode('jwt')}><FileKey2 size={15} />{ar ? 'لصق اعتماد' : 'Paste a credential'}</button>
      </div>

      {mode === 'spid' && <>
        <form className="bpr-verify" onSubmit={submitSpid}>
          <div><div><h2>{ar ? 'معرّف مقدم الرعاية' : 'Provider SPID'}</h2><p>{ar ? 'يحمّل الاعتماد الحالي ويتحقق منه.' : 'Loads the current credential and checks it.'}</p></div></div>
          <div className="bpr-verify-form"><label className="sr-only" htmlFor="v-spid">SPID</label><input id="v-spid" dir="ltr" value={spid} onChange={(e) => setSpid(e.target.value)} placeholder="SA-PHY-000003" /><button type="submit" disabled={busy}>{ar ? 'تحقق' : 'Verify'}<ArrowRight size={16} /></button></div>
        </form>
        {busy && <Loading label={ar ? 'جارٍ التحقق…' : 'Verifying…'} />}
        {error && <Failed>{error} {SPID_RE.test(spid.trim().toUpperCase()) && <Link className="profile-text-link" to={`/bpr/p/${spid.trim().toUpperCase()}`}>{ar ? 'الملف' : 'Profile'}<ArrowRight size={13} /></Link>}</Failed>}
        {result && <div className="bpr-profile-grid">
          <section className="bpr-panel">
            <div className="bpr-panel-head"><h2>{ar ? 'النتيجة' : 'Result'}</h2><SourceBadge source={result.source} /></div>
            <CheckRow label={ar ? 'التوقيع' : 'Signature'} check={result.signature} />
            <CheckRow label={ar ? 'فترة الصلاحية' : 'Validity window'} check={result.expiry} okText={ar ? 'سارية' : 'In date'} />
            <CheckRow label={ar ? 'الحالة المباشرة' : 'Live status'} check={result.status} okText={valueLabel(result.status.value, ar)} />
            <div className="bpr-forge">
              <ShieldAlert size={18} />
              <div><strong>{ar ? 'جرّب التزوير' : 'Try a forgery'}</strong><p>{ar ? 'نغيّر الاسم داخل الاعتماد ونُبقي التوقيع الأصلي — يجب أن يفشل الفحص.' : 'Change the name inside the credential, keep the original signature — the check must fail.'}</p></div>
              <button className="profile-button secondary" onClick={tryForgery}>{ar ? 'زوّر الاسم' : 'Forge the name'}</button>
            </div>
            {forged && <CheckRow label={ar ? 'اعتماد مزوّر' : 'Forged credential'} check={forged} />}
            {forged && <p className="bpr-note">{forged.state === 'fail' ? (ar ? 'رُفض التزوير كما ينبغي.' : 'Rejected, as it should be.') : (ar ? 'تحذير: لم يُرفض التزوير.' : 'Warning: the forgery was not rejected.')}</p>}
          </section>
          <ClaimsPanel claims={result.claims} />
        </div>}
      </>}

      {mode === 'jwt' && <>
        <form className="bpr-panel" onSubmit={submitJwt}>
          <label htmlFor="v-jwt"><h2>{ar ? 'الصق اعتماد vc+jwt' : 'Paste a vc+jwt credential'}</h2></label>
          <p className="bpr-note">{ar ? 'يبقى النص في هذه الصفحة؛ لا يُرسل إلى أي خادم ما دام متصفحك يدعم Ed25519.' : 'The text stays in this page; it is sent nowhere as long as your browser supports Ed25519.'}</p>
          <textarea id="v-jwt" dir="ltr" rows={5} value={jwt} onChange={(e) => setJwt(e.target.value)} placeholder="eyJhbGciOiJFZERTQSIs…" spellCheck={false} />
          <button className="profile-button primary" type="submit" disabled={!jwt.trim()}>{ar ? 'تحقق' : 'Verify'}<ArrowRight size={16} /></button>
        </form>
        {paste && <div className="bpr-profile-grid">
          <section className="bpr-panel">
            <h2>{ar ? 'النتيجة' : 'Result'}</h2>
            <CheckRow label={ar ? 'التوقيع' : 'Signature'} check={paste.signature} />
            {paste.expiry && <CheckRow label={ar ? 'فترة الصلاحية' : 'Validity window'} check={paste.expiry} okText={ar ? 'سارية' : 'In date'} />}
            {paste.claims?.credentialSubject?.spid && <p><Link className="profile-text-link" to={`/bpr/verify?spid=${paste.claims.credentialSubject.spid}`} onClick={() => { setMode('spid'); run(paste.claims!.credentialSubject.spid); }}>{ar ? 'افحص الحالة المباشرة' : 'Check live status'}<ArrowRight size={13} /></Link></p>}
          </section>
          {paste.claims && <ClaimsPanel claims={paste.claims} />}
        </div>}
      </>}
    </BprLayout>
  );
}

function ClaimsPanel({ claims }: { claims: CredentialClaims }) {
  const { ar } = useI18n();
  const s = claims.credentialSubject;
  return (
    <section className="bpr-panel">
      <h2>{ar ? 'ما يقوله الاعتماد' : 'What the credential says'}</h2>
      <dl className="bpr-facts">
        <div><dt>{ar ? 'الاسم' : 'Name'}</dt><dd dir="auto">{s.name}{s.nameAr ? ` · ${s.nameAr}` : ''}</dd></div>
        <div><dt>SPID</dt><dd dir="ltr">{s.spid}</dd></div>
        <div><dt>{ar ? 'المهنة' : 'Profession'}</dt><dd>{s.profession}{s.specialty ? ` · ${s.specialty}` : ''}</dd></div>
        <div><dt>{ar ? 'مستوى التحقق' : 'Verification level'}</dt><dd>{valueLabel(s.verificationLevel, ar)}</dd></div>
        <div><dt>{ar ? 'العضوية' : 'Membership'}</dt><dd>{valueLabel(s.membership?.state, ar)}{s.membership?.validTo ? ` · ${fmtDate(s.membership.validTo, ar)}` : ''}</dd></div>
        <div><dt>{ar ? 'المؤهلات الموثقة' : 'Verified qualifications'}</dt><dd>{s.qualifications?.length ? s.qualifications.map((q) => q.kind).join(', ') : (ar ? 'لا شيء بعد' : 'None yet')}</dd></div>
        <div><dt>{ar ? 'صالحة من' : 'Valid from'}</dt><dd>{fmtDate(claims.validFrom, ar, true)}</dd></div>
        <div><dt>{ar ? 'صالحة حتى' : 'Valid until'}</dt><dd>{fmtDate(claims.validUntil, ar, true)}</dd></div>
        <div><dt>{ar ? 'المُصدر' : 'Issuer'}</dt><dd dir="ltr">{claims.issuer.id}</dd></div>
        <div><dt>ID</dt><dd dir="ltr" className="bpr-mono">{claims.id}</dd></div>
      </dl>
      <p className="bpr-note">{ar ? 'الاعتماد يحمل بيانات عامة فقط — لا أرقام تراخيص.' : 'Public facts only — the credential never carries licence numbers.'}</p>
    </section>
  );
}
