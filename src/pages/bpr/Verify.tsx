import { FormEvent, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Camera, Check as CheckIcon, Download, FileKey2, Link2, Search, Share2, ShieldAlert, Stamp } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, CheckRow, Failed, fmtDate, Loading, ScfhsPending, SourceBadge, valueLabel } from '../../components/BprKit';
import { localized } from '../../lib/locale';
import { bindingProblem, Check, checkCredential, CredentialClaims, validityWindow, CredentialResult, decodeClaims, forgeName, REGISTRY, registryKeys, replayLedger, SPID_RE, verifyJwt } from '../../lib/bpr';

const QrScanner = lazy(() => import('../../components/QrScanner'));

type Mode = 'spid' | 'jwt';
interface PasteResult { claims?: CredentialClaims; signature: Check; expiry?: Check }

export default function Verify() {
  const { ar } = useI18n();
  const [params, setParams] = useSearchParams();
  const initial = (params.get('spid') || '').toUpperCase();
  const stamp = params.get('stamp') || '';
  const [mode, setMode] = useState<Mode>('spid');
  const [spid, setSpid] = useState(initial || 'SA-PHY-000003');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CredentialResult | null>(null);
  const [error, setError] = useState('');
  const [jwt, setJwt] = useState('');
  const [paste, setPaste] = useState<PasteResult | null>(null);
  const [forged, setForged] = useState<Check | null>(null);
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stampCheck, setStampCheck] = useState<(Check & { at?: string; size?: number }) | null>(null);
  const resultHead = useRef<HTMLHeadingElement>(null);
  usePageMeta({
    title: ar ? 'التحقق من مقدم رعاية — BPR' : 'Verify a provider — BPR',
    description: ar ? 'تحقق من شهادة BPR الموقّعة على جهازك: التوقيع والصلاحية والحالة المباشرة.' : 'Check a BPR signed credential on your device: signature, validity window and live status.',
    url: '/bpr/verify', type: 'website',
  });

  const run = async (id: string) => {
    setBusy(true); setResult(null); setError(''); setForged(null);
    if (!SPID_RE.test(id)) { setError(ar ? 'صيغة المعرّف غير صحيحة (مثال SA-PHY-000003).' : 'That is not a valid SPID (e.g. SA-PHY-000003).'); setBusy(false); return; }
    try { setResult(await checkCredential(id)); setTimeout(() => resultHead.current?.focus(), 0); }
    catch { setError(ar ? `لا يوجد اعتماد موقّع منشور للمعرّف ${id}. قد يكون مدرجًا دون اعتماد — راجع ملفه.` : `No signed credential is published for ${id}. The provider may be listed without one — see their profile.`); }
    setBusy(false);
  };
  useEffect(() => { if (initial) run(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // A printed CV carries "stamp=N-hashprefix": the transparency-log state when it was generated.
  // The append-only log lets anyone confirm, years later, that entry N still has that hash.
  useEffect(() => {
    const m = /^(\d{1,7})-([0-9a-f]{8,64})$/.exec(stamp);
    if (!stamp) return;
    if (!m) { setStampCheck({ state: 'fail', detail: 'malformed stamp' }); return; }
    setStampCheck({ state: 'pending' });
    replayLedger().then((log) => {
      const n = Number(m[1]); const e = log.entries[n - 1];
      if (log.chain.state !== 'ok') setStampCheck({ state: 'fail', detail: log.chain.detail });
      else if (e && e.hash.startsWith(m[2])) setStampCheck({ state: 'ok', detail: `#${n} · ${m[2]}`, how: 'device', at: e.at, size: log.entries.length });
      else setStampCheck({ state: 'fail', detail: `no entry #${n} with hash ${m[2]}` });
    }, () => setStampCheck({ state: 'unavailable', detail: 'log unreachable' }));
  }, [stamp]);

  const onScan = useCallback((id: string) => {
    setScanning(false); setMode('spid'); setSpid(id); setParams({ spid: id }, { replace: true }); run(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const shareUrl = () => `${window.location.origin}${localized('/bpr/verify')}?spid=${result!.claims.credentialSubject.spid}`;
  const shareText = () => {
    const id = result!.claims.credentialSubject.spid;
    const when = new Date().toLocaleString(ar ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' });
    return ar ? `${id}: فُحص توقيع اعتماد BPR على جهازي بتاريخ ${when} (الرياض). أعد الفحص بنفسك: ${shareUrl()}`
      : `${id}: BPR credential signature checked on my device ${when} (Riyadh). Re-check it yourself: ${shareUrl()}`;
  };
  const copyLink = () => {
    if (!result) return;
    navigator.clipboard?.writeText(shareText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }, () => {});
  };
  const share = () => { if (result && navigator.share) navigator.share({ title: 'BPR verification', text: shareText(), url: shareUrl() }).catch(() => {}); };

  const submitSpid = (e: FormEvent) => { e.preventDefault(); const id = spid.trim().toUpperCase(); setParams({ spid: id }, { replace: true }); run(id); };
  const submitJwt = async (e: FormEvent) => {
    e.preventDefault(); setPaste(null);
    const keys = await registryKeys().catch(() => null);
    if (!keys) { setPaste({ signature: { state: 'unavailable', detail: 'registry keys unavailable' } }); return; }
    let claims: CredentialClaims | undefined;
    try { claims = decodeClaims(jwt.trim()); } catch { /* reported by verifyJwt */ }
    const bound = claims ? bindingProblem(claims) : '';
    const signature: Check = bound ? { state: 'fail', detail: bound, how: 'device' } : await verifyJwt(jwt, keys.data);
    const expiry: Check | undefined = claims ? validityWindow(claims) : undefined;
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
      <div className="bpr-tabs" role="group" aria-label={ar ? 'طريقة التحقق' : 'How to verify'}>
        <button aria-pressed={mode === 'spid'} onClick={() => setMode('spid')}><Search size={15} />{ar ? 'بالمعرّف' : 'By SPID'}</button>
        <button aria-pressed={mode === 'jwt'} onClick={() => setMode('jwt')}><FileKey2 size={15} />{ar ? 'لصق اعتماد' : 'Paste a credential'}</button>
      </div>
      {stampCheck && <section className="bpr-panel bpr-stamp" aria-live="polite">
        <h2><Stamp size={18} />{ar ? 'ختم مطبوع على السيرة الذاتية' : 'Printed CV stamp'}</h2>
        <CheckRow label={ar ? 'الختم مقابل السجل الشفاف' : 'Stamp against the transparency log'} check={stampCheck} okText={ar ? 'مطابق' : 'Matches'} />
        {stampCheck.state === 'ok' && <p className="bpr-note">{ar
          ? `يطابق هذا الختم المطبوع السطر ${stampCheck.detail?.split(' ')[0]} في السجل العام (${fmtDate(stampCheck.at, ar, true)}). يضم السجل الآن ${stampCheck.size} سطرًا. حالة الاعتماد الحالية أدناه.`
          : `This printed stamp matches entry ${stampCheck.detail?.split(' ')[0]} of the public log (${fmtDate(stampCheck.at, ar, true)}). The log now has ${stampCheck.size} entr${stampCheck.size === 1 ? 'y' : 'ies'}. The credential’s current state is below.`}</p>}
      </section>}

      {mode === 'spid' && <>
        <form className="bpr-verify" onSubmit={submitSpid}>
          <div><div><h2>{ar ? 'معرّف مقدم الرعاية' : 'Provider SPID'}</h2><p>{ar ? 'يحمّل الاعتماد الحالي ويتحقق منه.' : 'Loads the current credential and checks it.'}</p></div></div>
          <div className="bpr-verify-form"><label className="sr-only" htmlFor="v-spid">SPID</label><input id="v-spid" dir="ltr" value={spid} onChange={(e) => setSpid(e.target.value)} placeholder="SA-PHY-000003" /><button type="submit" disabled={busy}>{ar ? 'تحقق' : 'Verify'}<ArrowRight size={16} /></button>
            <button type="button" className="bpr-scan-btn" onClick={() => setScanning((v) => !v)} aria-pressed={scanning}><Camera size={16} />{ar ? 'امسح QR' : 'Scan QR'}</button></div>
        </form>
        {!result && !busy && !error && <div className="bpr-chips bpr-examples" role="group" aria-label={ar ? 'أمثلة' : 'Examples'}>
          <button onClick={() => { setSpid('SA-PHY-000003'); setParams({ spid: 'SA-PHY-000003' }, { replace: true }); run('SA-PHY-000003'); }}><code dir="ltr">SA-PHY-000003</code> · {ar ? 'اعتماد ساري' : 'current credential'}</button>
          <button onClick={() => { setSpid('SA-PHY-000001'); setParams({ spid: 'SA-PHY-000001' }, { replace: true }); run('SA-PHY-000001'); }}><code dir="ltr">SA-PHY-000001</code> · {ar ? 'مدرج دون اعتماد' : 'listed without a credential'}</button>
        </div>}
        {scanning && <Suspense fallback={<Loading />}><QrScanner onSpid={onScan} onClose={() => setScanning(false)} /></Suspense>}
        {busy && <Loading label={ar ? 'جارٍ التحقق…' : 'Verifying…'} />}
        {error && <Failed>{error} {SPID_RE.test(spid.trim().toUpperCase()) && <Link className="profile-text-link" to={`/bpr/p/${spid.trim().toUpperCase()}`}>{ar ? 'الملف' : 'Profile'}<ArrowRight size={13} /></Link>}</Failed>}
        {result && <div className="bpr-profile-grid" aria-live="polite">
          <section className="bpr-panel">
            <div className="bpr-panel-head"><h2 ref={resultHead} tabIndex={-1}>{ar ? 'النتيجة' : 'Result'} · <code dir="ltr">{result.claims.credentialSubject.spid}</code></h2><SourceBadge source={result.source} /></div>
            <CheckRow label={ar ? 'التوقيع' : 'Signature'} check={result.signature} />
            <CheckRow label={ar ? 'فترة الصلاحية' : 'Validity window'} check={result.expiry} okText={ar ? 'سارية' : 'In date'} />
            <CheckRow label={ar ? 'الحالة المباشرة' : 'Live status'} check={result.status} okText={valueLabel(result.status.value, ar)} />
            <div className="bpr-result-actions">
              <button className="profile-button secondary" onClick={copyLink}>{copied ? <CheckIcon size={15} /> : <Link2 size={15} />}{copied ? (ar ? 'نُسخ' : 'Copied') : (ar ? 'انسخ النتيجة والرابط' : 'Copy result & link')}</button>
              {typeof navigator !== 'undefined' && 'share' in navigator && <button className="profile-button secondary" onClick={share}><Share2 size={15} />{ar ? 'مشاركة' : 'Share'}</button>}
              <a className="profile-button secondary" href={`${REGISTRY}/vc/${result.claims.credentialSubject.spid}.jwt`} download><Download size={15} />{ar ? 'نزّل الاعتماد (.jwt)' : 'Download credential (.jwt)'}</a>
              <Link className="profile-button secondary" to={`/bpr/p/${result.claims.credentialSubject.spid}`}>{ar ? 'الملف' : 'Profile'}<ArrowRight size={15} /></Link>
            </div>
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
      {s.verificationLevel === 'not_assessed' && <ScfhsPending compact />}
    </section>
  );
}
