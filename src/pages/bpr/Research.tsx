import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, ExtLink, Failed, fmtDate, Loading, SourceBadge } from '../../components/BprKit';
import { ProviderList, Research as ResearchT, SPID_RE, useLoad } from '../../lib/bpr';

export default function Research() {
  const spid = (useParams().spid || '').toUpperCase();
  return spid ? <Footprint spid={spid} /> : <ResearchIndex />;
}

function ResearchIndex() {
  const { ar } = useI18n();
  const list = useLoad<ProviderList>('/api/providers', 'providers.json');
  usePageMeta({
    title: ar ? 'البصمة البحثية — BPR' : 'Research footprint — BPR',
    description: ar ? 'أعمال مقدمي الرعاية مطابقة عبر DOI من ORCID وZenodo وHugging Face.' : 'Provider works matched by DOI across ORCID, Zenodo and Hugging Face.',
    url: '/bpr/research', type: 'website',
  });
  const withResearch = list.state === 'ready' ? list.data.items.filter((p) => p.research_url) : [];
  return (
    <BprLayout kicker={ar ? 'البحث' : 'Research'}
      title={ar ? 'بحث يمكن نسبته، لا مجرد قائمة.' : 'Research you can attribute — not just a list.'}
      lead={ar
        ? 'يُحتسب العمل فقط عندما يذكر سجل الناشر (Crossref/DataCite) معرّف ORCID الخاص بمقدم الرعاية. تُستبعد الأعمال المنسوبة إلى معرّف آخر.'
        : 'A work counts only when the publisher record (Crossref/DataCite) names the provider’s ORCID iD. Works attributed to a different iD are left out.'}
      actions={<ExtLink href="https://zenodo.org/communities/bpr-doctors/">{ar ? 'مجتمع BPR على Zenodo' : 'BPR community on Zenodo'}</ExtLink>}>
      {list.state === 'loading' && <Loading />}
      {list.state === 'error' && <Failed />}
      {list.state === 'ready' && (withResearch.length
        ? <div className="bpr-provider-grid">{withResearch.map((p) => (
          <Link key={p.spid} to={`/bpr/research/${p.spid}`} className="bpr-provider">
            <div className="bpr-provider-top"><code dir="ltr">{p.spid}</code><SourceBadge source={list.source} /></div>
            <h3>{ar ? p.name_ar : p.name_en}</h3>
            <p className="bpr-provider-spec">{p.orcid?.replace('https://orcid.org/', 'ORCID ')}</p>
            <strong className="bpr-provider-go">{ar ? 'افتح البصمة البحثية' : 'Open research footprint'}<ArrowRight size={14} /></strong>
          </Link>))}</div>
        : <div className="bpr-state">{ar ? 'لا يوجد مقدم رعاية بسجل بحثي مرتبط بعد.' : 'No provider has a linked research record yet.'}</div>)}
    </BprLayout>
  );
}

const KIND: Record<string, [string, string]> = { dataset: ['Dataset', 'مجموعة بيانات'], software: ['Software', 'برمجيات'], publication: ['Publication', 'منشور'], model: ['Model', 'نموذج'], other: ['Other', 'أخرى'] };

function Footprint({ spid }: { spid: string }) {
  const { ar } = useI18n();
  const valid = SPID_RE.test(spid);
  const r = useLoad<ResearchT>(valid ? `/api/research?spid=${spid}` : null, `research/${spid}.json`);
  const [kind, setKind] = useState('all');
  usePageMeta({
    title: `${ar ? 'البصمة البحثية' : 'Research footprint'} · ${spid} — BPR`,
    description: ar ? 'أعمال مطابقة عبر DOI مع مقاييس المشاهدة والتنزيل.' : 'DOI-matched works with view and download metrics.',
    url: `/bpr/research/${spid}`, type: 'website',
  });
  const data = r.state === 'ready' ? r.data : null;
  const src = r.state === 'ready' ? r.source : 'snapshot';
  const kinds = useMemo(() => (data ? [...new Set(data.works.map((w) => w.kind))] : []), [data]);
  const works = data ? data.works.filter((w) => kind === 'all' || w.kind === kind) : [];

  if (!valid || r.state === 'error') return <BprLayout kicker={ar ? 'البحث' : 'Research'} title={spid}><Failed>{ar ? 'لا يوجد سجل بحثي عام لهذا المعرّف.' : 'No public research record for this SPID.'}</Failed></BprLayout>;
  if (!data) return <BprLayout kicker={ar ? 'البحث' : 'Research'} title={spid}><Loading /></BprLayout>;

  const c = data.counts;
  return (
    <BprLayout kicker={`${ar ? 'البحث' : 'Research'} · ${spid}`} title={ar ? 'البصمة البحثية' : 'Research footprint'}
      lead={<>{data.note} <Link className="profile-text-link" to={`/bpr/p/${spid}`}>{ar ? 'ملف مقدم الرعاية' : 'Provider profile'}<ArrowRight size={13} /></Link></>}>
      <section className="bpr-live-strip">
        <div><span>DOIs</span><strong>{c.dois ?? '—'}</strong><SourceBadge source={src} /></div>
        <div><span>{ar ? 'مؤكدة من الناشر' : 'Publisher-confirmed'}</span><strong>{c.publisher_confirmed ?? '—'}</strong><small>{ar ? 'من' : 'of'} {c.dois}</small></div>
        <div><span>{ar ? 'تنزيلات Zenodo' : 'Zenodo downloads'}</span><strong>{data.metrics.zenodo_downloads}</strong><small>{data.metrics.zenodo_views} {ar ? 'مشاهدة' : 'views'}</small></div>
        <div><span>{ar ? 'تنزيلات Hugging Face' : 'Hugging Face downloads'}</span><strong>{data.metrics.hf_downloads}</strong><small>{c.hf} {ar ? 'مستودع' : 'repos'}</small></div>
      </section>

      <div className="bpr-toolbar">
        <div className="bpr-chips" role="group" aria-label={ar ? 'النوع' : 'Kind'}>
          <button aria-pressed={kind === 'all'} onClick={() => setKind('all')}>{ar ? 'الكل' : 'All'} · {data.works.length}</button>
          {kinds.map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND[k]?.[ar ? 1 : 0] || k} · {data.works.filter((w) => w.kind === k).length}</button>)}
        </div>
      </div>

      <ol className="bpr-works">
        {works.map((w) => (
          <li key={w.doi || w.url}>
            <div className="bpr-work-meta"><span>{KIND[w.kind]?.[ar ? 1 : 0] || w.kind}</span><span>{w.year}</span>
              {w.authorship?.status && <span className={w.authorship.status === 'confirmed' ? 'pos' : ''}>{w.authorship.status === 'confirmed' ? (ar ? 'تأليف مؤكد' : 'Authorship confirmed') : (ar ? 'غير مؤكد' : 'Not confirmed')}</span>}
              {w.in_community && <span>bpr-doctors</span>}</div>
            <a href={w.url} target="_blank" rel="noreferrer"><h3 dir="auto">{w.title}</h3></a>
            <div className="bpr-work-foot">
              {w.doi && <code dir="ltr">{w.doi}</code>}
              {w.sources && Object.entries(w.sources).map(([k, u]) => <a key={k} href={u} target="_blank" rel="noreferrer">{k}</a>)}
              {w.metrics?.zenodo?.downloads != null && <small>{w.metrics.zenodo.downloads} ↓ Zenodo</small>}
              {w.metrics?.hf?.downloads != null && <small>{w.metrics.hf.downloads} ↓ HF</small>}
            </div>
          </li>
        ))}
      </ol>

      {data.authorship_rule && <p className="bpr-note">{data.authorship_rule}</p>}
      {data.runs && <p className="bpr-note" dir="ltr">{Object.entries(data.runs).map(([k, v]) => `${k}: ${v.note} (${fmtDate(v.at, ar, true)})`).join(' · ')}</p>}
    </BprLayout>
  );
}
