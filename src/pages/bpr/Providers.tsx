import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, Failed, Loading, SourceBadge, TRUST_LABEL, TrustGlyph, trustTone, valueLabel } from '../../components/BprKit';
import type { Trust } from '../../lib/bpr';
import { ProviderList, useLoad } from '../../lib/bpr';

type Filter = 'all' | 'orcid' | 'signed' | 'member';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا');

export default function Providers() {
  const { ar } = useI18n();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const list = useLoad<ProviderList>('/api/providers', 'providers.json');
  usePageMeta({
    title: ar ? 'دليل مقدمي الرعاية — BPR' : 'Provider directory — BPR',
    description: ar ? 'ابحث في مقدمي الرعاية المدرجين في سجل برينسايت وشاهد كل بُعد للثقة بشكل منفصل.' : 'Search providers listed in the BrainSAIT Provider Registry, with each trust dimension shown separately.',
    url: '/bpr/providers', type: 'website',
  });

  const items = useMemo(() => {
    if (list.state !== 'ready') return [];
    const n = norm(q.trim());
    return list.data.items.filter((p) => {
      if (filter === 'orcid' && p.trust.identity !== 'confirmed') return false;
      if (filter === 'signed' && p.trust.signature !== 'current') return false;
      if (filter === 'member' && !['active', 'renew_due'].includes(p.membership)) return false;
      return !n || [p.name_en, p.name_ar, p.spid, p.specialty || '', p.type].some((f) => norm(f).includes(n));
    });
  }, [list, q, filter]);

  const FILTERS: [Filter, string, string][] = [
    ['all', 'All', 'الكل'], ['orcid', 'ORCID confirmed', 'ORCID مؤكد'], ['signed', 'Signed credential', 'اعتماد موقّع'], ['member', 'Members', 'الأعضاء'],
  ];

  return (
    <BprLayout
      kicker={ar ? 'الدليل' : 'Directory'}
      title={ar ? 'الممارسون الصحيون المدرجون' : 'Listed healthcare professionals'}
      lead={ar
        ? 'كل ممارس مدرج في لمحة واحدة: الهوية والتوقيع والعضوية والترخيص، كلٌّ في خانته، مباشرة من السجل.'
        : 'Every listed professional at a glance: identity, signature, membership and licence, each in its own place, straight from the registry.'}
    >
      <div className="bpr-toolbar">
        <label className="bpr-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{ar ? 'بحث' : 'Search'}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? 'الاسم أو SPID أو التخصص' : 'Name, SPID or specialty'} />
        </label>
        <div className="bpr-chips" role="group" aria-label={ar ? 'تصفية' : 'Filter'}>
          {FILTERS.map(([k, en, a]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{ar ? a : en}</button>)}
        </div>
        {list.state === 'ready' && <SourceBadge source={list.source} />}
      </div>

      {list.state === 'loading' && <Loading />}
      {list.state === 'error' && <Failed />}
      {list.state === 'ready' && (items.length === 0
        ? <div className="bpr-state"><span>{ar ? 'لا يطابق بحثك أي مقدم رعاية في هذا العرض.' : 'No providers match this search and filter.'}</span><button className="profile-text-link" onClick={() => { setQ(''); setFilter('all'); }}>{ar ? 'مسح البحث والتصفية' : 'Clear search & filters'}</button></div>
        : <div className="bpr-provider-grid">
          {items.map((p) => (
            <Link key={p.spid} to={`/bpr/p/${p.spid}`} className="bpr-provider">
              <div className="bpr-provider-top"><code dir="ltr">{p.spid}</code><span>{p.type}</span></div>
              <h3>{ar ? p.name_ar : p.name_en}</h3>
              <p className="bpr-provider-alt">{ar ? p.name_en : p.name_ar}</p>
              <p className="bpr-provider-spec">{p.specialty || (ar ? 'التخصص غير مذكور' : 'Specialty not stated')}</p>
              <ul className="bpr-pills" aria-label={ar ? 'حالات الثقة' : 'Trust states'}>
                {(Object.keys(TRUST_LABEL) as (keyof Trust)[]).map((k) => (
                  <li key={k} className={trustTone(p.trust[k])}><TrustGlyph tone={trustTone(p.trust[k])} />{TRUST_LABEL[k][ar ? 1 : 0]} · {valueLabel(p.trust[k], ar)}</li>
                ))}
              </ul>
              <strong className="bpr-provider-go">{ar ? 'افتح الملف' : 'Open profile'}<ArrowRight size={14} /></strong>
            </Link>
          ))}
        </div>)}
      <p className="bpr-note">{ar
        ? 'هوية ORCID = ملكية المعرّف عبر تسجيل الدخول، لا التأليف ولا الترخيص · الاعتماد الموقّع = توقيع برينسايت · العضوية = اشتراك BPR التجاري · الترخيص والمؤهلات = تُراجع لدى الجهة المصدِرة، وإلا «لم تُقيَّم» · الامتيازات = المسجلة لدى المستشفى.'
        : 'ORCID identity = ownership of the iD via sign-in, not authorship or licensure · Signed credential = BrainSAIT signature · Membership = commercial BPR membership · Licence & qualifications = checked with the issuer, otherwise “not assessed” · Privileges = recorded hospital privileges.'}</p>
    </BprLayout>
  );
}
