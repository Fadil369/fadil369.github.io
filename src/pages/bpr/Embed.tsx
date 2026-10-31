import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import { CheckRow, SourceBadge, TrustGrid, valueLabel } from '../../components/BprKit';
import { checkCredential, CredentialResult, Provider, SPID_RE, useLoad } from '../../lib/bpr';
import '../../styles/profile.css';
import '../../styles/bpr.css';

// Iframe-able live card for hospital staff pages: re-checks on every view (never a stale badge).
// <iframe src="https://fadil369.github.io/bpr/embed/SA-PHY-000003" width="380" height="430" title="BPR provider check"></iframe>
export default function Embed() {
  const { ar } = useI18n();
  const spid = (useParams().spid || '').toUpperCase();
  const valid = SPID_RE.test(spid);
  const p = useLoad<Provider>(valid ? `/api/providers/${spid}` : null, `providers/${spid}.json`);
  const [cred, setCred] = useState<CredentialResult | null>(null);
  const prov = p.state === 'ready' ? p.data : null;
  useEffect(() => {
    document.documentElement.classList.add('bpr-embed-root');
    if (prov?.trust.signature === 'current') checkCredential(spid).then(setCred, () => {});
  }, [prov, spid]);

  return (
    <div className="profile-page bpr-app bpr-embed">
      {!valid || p.state === 'error' ? <p className="bpr-note">{ar ? 'لا يوجد سجل عام لهذا المعرّف.' : 'No public record for this SPID.'}</p>
        : !prov ? <p className="bpr-note">{ar ? 'جارٍ التحميل…' : 'Loading…'}</p>
        : <>
          <div className="bpr-embed-head">
            <ShieldCheck size={20} />
            <div><strong>{ar ? prov.name_ar : prov.name_en}</strong><code dir="ltr">{spid}</code></div>
            <SourceBadge source={p.state === 'ready' ? p.source : 'snapshot'} />
          </div>
          <TrustGrid trust={prov.trust} legend={false} />
          {prov.trust.signature === 'current'
            ? <CheckRow label={ar ? 'توقيع الاعتماد' : 'Credential signature'} check={cred?.signature || { state: 'pending' }} />
            : <p className="bpr-note">{ar ? 'لا يوجد اعتماد موقّع ساري.' : 'No current signed credential.'} {valueLabel(prov.trust.signature, ar)}</p>}
          <a className="bpr-ext" href={`https://fadil369.github.io/bpr/p/${spid}`} target="_blank" rel="noreferrer">{ar ? 'السجل الكامل على BPR' : 'Full record on BPR'}<ArrowUpRight size={13} /></a>
        </>}
    </div>
  );
}
