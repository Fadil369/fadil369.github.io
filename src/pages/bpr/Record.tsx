import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowRight, ArrowUpRight, BadgeCheck, Check as CheckIcon, Copy, Download, FlaskConical, Link2, Printer, Server, Share2, ShieldCheck, Terminal } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ProfileHeader } from '../../components/ProfileHeader';
import { CheckRow, ExtLink, fmtDate, ScfhsPending, SourceBadge, TrustGrid, valueLabel } from '../../components/BprKit';
import { checkAiLedger, AiLedger, checkCredential, CredentialResult, LedgerResult, Provider, REGISTRY, replayLedger, Research, short, useLoad } from '../../lib/bpr';
import { localized } from '../../lib/locale';
import '../../styles/profile.css';
import '../../styles/bpr.css';

// Standalone showcase of one BPR record (the owner's). Every state on this page is read live from
// the registry (snapshot fallback, labelled) and every signature is checked in this browser.
const SPID = 'SA-PHY-000003';
const ORIGIN = 'https://fadil369.github.io';

export default function Record() {
  const { ar } = useI18n();
  const p = useLoad<Provider>(`/api/providers/${SPID}`, `providers/${SPID}.json`);
  const research = useLoad<Research>(`/api/research?spid=${SPID}`, `research/${SPID}.json`);
  const [cred, setCred] = useState<CredentialResult | null>(null);
  const [ledger, setLedger] = useState<LedgerResult | null>(null);
  const [ai, setAi] = useState<AiLedger | null>(null);
  const [err, setErr] = useState({ cred: false, ledger: false });
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState('');
  const verifyUrl = `${ORIGIN}${localized('/bpr/verify')}?spid=${SPID}`;

  useEffect(() => {
    checkCredential(SPID).then(setCred, () => setErr((e) => ({ ...e, cred: true })));
    replayLedger().then(setLedger, () => setErr((e) => ({ ...e, ledger: true })));
    checkAiLedger().then(setAi, () => {});
    QRCode.toString(verifyUrl, { type: 'svg', margin: 3, errorCorrectionLevel: 'M', color: { dark: '#111207', light: '#edf34a' } }).then(setQr, () => {});
  }, [verifyUrl]);

  usePageMeta({
    title: ar ? `د. محمد الفاضل · سجل BPR ${SPID}` : `Dr. Mohamed El Fadil · BPR record ${SPID}`,
    description: ar ? 'سجل مقدم رعاية موقّع: يُتحقق منه مباشرة في متصفحك — التوقيع، الصلاحية، الحالة، السجل الشفاف، والبصمة البحثية.' : 'A signed provider record, checked live in your browser: signature, validity, status, transparency log and research footprint.',
    url: '/bpr/record', type: 'profile', image: `/assets/og/${SPID}.png`,
  });

  const prov = p.state === 'ready' ? p.data : null;
  const res = research.state === 'ready' ? research.data : null;
  const NA = { state: 'unavailable' as const, detail: ar ? 'تعذّر الوصول إلى السجل' : 'registry unreachable' };
  const pending = { state: 'pending' as const };
  const myEntries = ledger ? ledger.entries.filter((e) => e.spid === SPID) : [];
  const myAi = ai?.heads.find((h) => h.instance === SPID);
  const allOk = !!cred && cred.signature.state === 'ok' && cred.expiry.state === 'ok' && cred.status.state === 'ok' && ledger?.chain.state === 'ok';

  const copy = (key: string, text: string) => navigator.clipboard?.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1600); }, () => {});
  const share = () => navigator.share?.({ title: `BPR ${SPID}`, url: `${ORIGIN}${localized('/bpr/record/')}` }).catch(() => {});
  const CMDS = [
    `curl -s ${REGISTRY}/.well-known/did.json   # issuer public key (Ed25519)`,
    `curl -s ${REGISTRY}/vc/${SPID}            # signed credential (vc+jwt, EdDSA)`,
    `curl -s ${REGISTRY}/vc/status/${SPID}     # live status: current / superseded / revoked`,
    `curl -s ${REGISTRY}/transparency/log.json  # append-only, signed hash chain`,
    `curl -s ${REGISTRY}/fhir/Practitioner/${SPID}`,
  ].join('\n');

  return (
    <div className="profile-page bpr-app rec-page" id="top">
      <ProfileHeader />
      <article className="rec">
        <header className="rec-hero">
          <div className="rec-id">
            <div className="profile-eyebrow"><span />{ar ? 'سجل BPR · سجل برينسايت لمقدمي الرعاية' : 'BPR record · BrainSAIT Provider Registry'}</div>
            <h1>{ar ? 'د. محمد الفاضل' : 'Dr. Mohamed El Fadil'}</h1>
            <p className="rec-alt"><bdi>{ar ? 'Dr. Mohamed El Fadil' : 'د. محمد الفاضل'}</bdi> · {ar ? 'طبيب' : 'Physician'} · {ar ? 'الرياض' : 'Riyadh'}</p>
            <code className="rec-spid" dir="ltr">{SPID}</code>
            <div className={`rec-verdict ${allOk ? 'ok' : cred || ledger || err.cred ? 'mixed' : ''}`} role="status" aria-live="polite">
              {allOk ? <BadgeCheck size={20} /> : <ShieldCheck size={20} />}
              <span>{allOk
                ? (ar ? 'الاعتماد والسجل الشفاف فُحصا الآن في متصفحك ونجحا.' : 'Credential and transparency log checked in your browser just now — both pass.')
                : (ar ? 'جارٍ الفحص في متصفحك…' : 'Checking in your browser…')}</span>
            </div>
            <div className="profile-actions">
              <Link className="profile-button primary" to={`/bpr/verify?spid=${SPID}`}>{ar ? 'أعد الفحص بالتفصيل' : 'Re-check in detail'}<ArrowRight size={16} /></Link>
              <button className="profile-button secondary" onClick={() => copy('link', `${ORIGIN}${localized('/bpr/record/')}`)}>{copied === 'link' ? <CheckIcon size={15} /> : <Link2 size={15} />}{copied === 'link' ? (ar ? 'نُسخ' : 'Copied') : (ar ? 'انسخ الرابط' : 'Copy link')}</button>
              {typeof navigator !== 'undefined' && 'share' in navigator && <button className="profile-button secondary" onClick={share}><Share2 size={15} />{ar ? 'مشاركة' : 'Share'}</button>}
              <button className="profile-button secondary rec-noprint" onClick={() => window.print()}><Printer size={15} />{ar ? 'طباعة' : 'Print'}</button>
            </div>
          </div>
          <div className="rec-card" aria-label={ar ? 'بطاقة الاعتماد' : 'Credential card'}>
            <div className="rec-card-top"><span>BPR · W3C VC 2.0</span><BadgeCheck size={22} /></div>
            <div className="rec-card-person"><img src="/assets/img/prof_pic.jpg" alt="" /><div><strong>Dr. Mohamed El Fadil</strong><span>د. محمد الفاضل</span></div></div>
            {qr && <div className="rec-card-qr" role="img" aria-label={ar ? 'رمز QR للتحقق' : 'QR code to verify'} dangerouslySetInnerHTML={{ __html: qr }} />}
            <dl>
              <div><dt>SPID</dt><dd dir="ltr">{SPID}</dd></div>
              <div><dt>{ar ? 'صالح حتى' : 'Valid until'}</dt><dd>{cred ? fmtDate(cred.claims.validUntil, ar) : '…'}</dd></div>
              <div><dt>{ar ? 'المُصدر' : 'Issuer'}</dt><dd dir="ltr">did:web:registry.brainsait.de</dd></div>
            </dl>
            <small>{ar ? 'الصورة ليست جزءًا من الاعتماد الموقّع.' : 'Photo is not part of the signed credential.'}</small>
          </div>
        </header>

        <section className="rec-grid">
          <div className="bpr-panel">
            <div className="bpr-panel-head"><h2><ShieldCheck size={18} />{ar ? 'فُحص الآن' : 'Checked just now'}</h2>{cred && <SourceBadge source={cred.source} />}</div>
            <CheckRow label={ar ? 'توقيع الاعتماد' : 'Credential signature'} check={cred?.signature || (err.cred ? NA : pending)} />
            <CheckRow label={ar ? 'فترة الصلاحية' : 'Validity window'} check={cred?.expiry || (err.cred ? NA : pending)} okText={ar ? 'سارية' : 'In date'} />
            <CheckRow label={ar ? 'الحالة المباشرة' : 'Live status'} check={cred?.status || (err.cred ? NA : pending)} okText={valueLabel(cred?.status.value, ar)} />
            <CheckRow label={ar ? 'سلسلة السجل الشفاف' : 'Transparency chain'} check={ledger?.chain || (err.ledger ? NA : pending)} />
            <CheckRow label={ar ? 'رأس السجل الموقّع' : 'Signed log head'} check={ledger?.headSignature || (err.ledger ? NA : pending)} />
            {myAi && <CheckRow label={ar ? 'منشأ الذكاء الاصطناعي (سجلي الطبي)' : 'AI provenance (my EMR)'} check={myAi.check}><code className="bpr-hash" dir="ltr">{myAi.size} {ar ? 'ملاحظة' : 'notes'} · {short(myAi.hash, 8)}</code></CheckRow>}
          </div>
          <div className="bpr-panel">
            <div className="bpr-panel-head"><h2>{ar ? 'حالة الثقة' : 'Trust, dimension by dimension'}</h2>{p.state === 'ready' && <SourceBadge source={p.source} />}</div>
            {prov ? <TrustGrid trust={prov.trust} /> : <p className="bpr-note">…</p>}
            <ScfhsPending compact />
          </div>
        </section>

        <section className="rec-grid">
          <div className="bpr-panel">
            <h2>{ar ? 'تاريخ الاعتماد' : 'Credential history'}</h2>
            <ol className="rec-timeline">
              {myEntries.map((e) => (
                <li key={e.seq}><span className={`ev ${e.event}`}>{e.event}</span><strong>{ar ? `السطر ${e.seq} في السجل الشفاف` : `Transparency log entry #${e.seq}`}</strong><time>{fmtDate(e.at, ar, true)}</time><code dir="ltr">{short(e.hash, 10)}</code></li>
              ))}
              {prov?.membership_valid_to && <li><span className="ev renewed">{ar ? 'العضوية' : 'membership'}</span><strong>{ar ? `${valueLabel(prov.membership, ar)} حتى` : `${valueLabel(prov.membership, ar)} until`}</strong><time>{fmtDate(prov.membership_valid_to, ar)}</time></li>}
              {!myEntries.length && <li className="bpr-note">{ar ? 'جارٍ إعادة السلسلة…' : 'Replaying the chain…'}</li>}
            </ol>
            <p className="bpr-note"><Link className="profile-text-link" to="/bpr/ledger">{ar ? 'السجل الشفاف كاملًا' : 'The full transparency log'}<ArrowRight size={13} /></Link></p>
          </div>
          <div className="bpr-panel">
            <div className="bpr-panel-head"><h2><FlaskConical size={18} />{ar ? 'البصمة البحثية' : 'Research footprint'}</h2>{research.state === 'ready' && <SourceBadge source={research.source} />}</div>
            {res ? <>
              <div className="rec-stats">
                <div><strong>{res.counts.publisher_confirmed}</strong><span>{ar ? 'تأليف مؤكد من الناشر' : 'publisher-confirmed'}</span></div>
                <div><strong>{res.metrics.zenodo_downloads}</strong><span>{ar ? 'تنزيل Zenodo' : 'Zenodo downloads'}</span></div>
                <div><strong>{res.metrics.hf_downloads}</strong><span>{ar ? 'تنزيل Hugging Face' : 'HF downloads'}</span></div>
              </div>
              <ul className="rec-works">{res.works.filter((w) => w.authorship?.status === 'confirmed').slice(0, 4).map((w) => <li key={w.doi || w.url}><ExtLink href={w.url}>{w.title}</ExtLink><small>{w.year}</small></li>)}</ul>
              <p className="bpr-note"><Link className="profile-text-link" to={`/bpr/research/${SPID}`}>{ar ? 'كل الأعمال' : 'All works'}<ArrowRight size={13} /></Link></p>
            </> : <p className="bpr-note">…</p>}
          </div>
        </section>

        <section className="bpr-panel rec-row">
          <Server size={22} />
          <div><h2>{ar ? 'مساحة العمل' : 'Workspace'}</h2><p>{ar ? 'مساحة OpenEMR خاصة مع المساعد السريري والإملاء العربي تعمل اليوم. التكامل مع نفيس جارٍ؛ ومراجعة الأقران والفرق قادمة تاليًا.' : 'A private OpenEMR workspace with the built-in Copilot and Arabic dictation is live today. NPHIES integration is ongoing; peer review and teams are coming next.'}</p></div>
          <div className="bpr-result-actions" style={{ marginTop: 0 }}>
            <Link className="profile-button secondary" to="/bpr/workspace">{ar ? 'التفاصيل' : 'Details'}<ArrowRight size={14} /></Link>
            <a className="profile-button primary" href="https://calendar.app.google/rAqiE6pNumtECdnd7" target="_blank" rel="noreferrer">{ar ? 'احجز عرضًا توضيحيًا مباشرًا' : 'Book a live demo'}<ArrowUpRight size={14} /></a>
          </div>
        </section>

        <section className="bpr-panel">
          <div className="bpr-panel-head"><h2><Terminal size={18} />{ar ? 'تحقق بنفسك، دون هذا الموقع' : 'Verify it yourself, without this site'}</h2>
            <button className="profile-button secondary rec-noprint" onClick={() => copy('cmd', CMDS)}><Copy size={14} />{copied === 'cmd' ? (ar ? 'نُسخ' : 'Copied') : (ar ? 'انسخ الأوامر' : 'Copy commands')}</button></div>
          <pre className="bpr-out" dir="ltr">{CMDS}</pre>
          <p className="bpr-note">{ar ? 'تحقق من توقيع EdDSA على الاعتماد بالمفتاح العام في did.json، ثم أعد حساب سلسلة التجزئة: hash = sha256(line) و line.prev = التجزئة السابقة.' : 'Check the EdDSA signature on the credential with the public key in did.json, then recompute the hash chain: hash = sha256(line), line.prev = previous hash.'}</p>
          <div className="bpr-result-actions rec-noprint">
            <a className="profile-button secondary" href={`${REGISTRY}/vc/${SPID}.jwt`} download><Download size={14} />{ar ? 'نزّل الاعتماد (.jwt)' : 'Download credential (.jwt)'}</a>
            <a className="profile-button secondary" href={`${REGISTRY}/fhir/Practitioner/${SPID}`} target="_blank" rel="noreferrer">FHIR Practitioner<ArrowUpRight size={14} /></a>
            <Link className="profile-button secondary" to={`/bpr/p/${SPID}`}>{ar ? 'ملف الدليل' : 'Directory profile'}<ArrowRight size={14} /></Link>
          </div>
        </section>
      </article>
    </div>
  );
}
