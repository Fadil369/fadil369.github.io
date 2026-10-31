import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, FileDown } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, ExtLink, Failed, fmtDate, Loading, SourceBadge } from '../../components/BprKit';
import { ProviderList, Research as ResearchT, ResearchWork, SPID_RE, useLoad } from '../../lib/bpr';

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

const KIND: Record<string, [string, string]> = {
  dataset: ['Dataset', 'مجموعة بيانات'], 'data-set': ['Dataset', 'مجموعة بيانات'], software: ['Software', 'برمجيات'], publication: ['Publication', 'منشور'],
  'journal-article': ['Journal article', 'مقال علمي'], report: ['Report', 'تقرير'], model: ['Model', 'نموذج'], other: ['Other', 'أخرى'],
};
const kindKey = (k: string) => (k === 'data-set' ? 'dataset' : k);
const SOURCE: Record<string, string> = { orcid: 'ORCID', zenodo: 'Zenodo', hf: 'Hugging Face' };
const confirmed = (w: ResearchWork) => w.authorship?.status === 'confirmed';

function download(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
function toCsv(works: ResearchWork[]) {
  const rows = [['title', 'kind', 'year', 'doi', 'url', 'authorship']].concat(works.map((w) => [w.title, kindKey(w.kind), w.year, w.doi || '', w.url, w.authorship?.status || '']));
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
function toBibtex(works: ResearchWork[], orcid: string) {
  const type = (k: string) => (k === 'journal-article' ? 'article' : k === 'software' ? 'software' : kindKey(k) === 'dataset' ? 'dataset' : k === 'report' ? 'techreport' : 'misc');
  return works.map((w, i) => {
    const key = (w.doi || `work${i}`).replace(/[^A-Za-z0-9]+/g, '_');
    return `@${type(w.kind)}{${key},\n  title = {${w.title.replace(/[{}]/g, '')}},\n  year = {${w.year}},\n${w.doi ? `  doi = {${w.doi}},\n` : ''}  url = {${w.url}},\n  note = {Author ORCID ${orcid}}\n}`;
  }).join('\n\n') + '\n';
}

function Footprint({ spid }: { spid: string }) {
  const { ar } = useI18n();
  const valid = SPID_RE.test(spid);
  const r = useLoad<ResearchT>(valid ? `/api/research?spid=${spid}` : null, `research/${spid}.json`);
  const [kind, setKind] = useState('all');
  const [showAll, setShowAll] = useState(false);
  usePageMeta({
    title: `${ar ? 'البصمة البحثية' : 'Research footprint'} · ${spid} — BPR`,
    description: ar ? 'أعمال مطابقة عبر DOI مع مقاييس المشاهدة والتنزيل.' : 'DOI-matched works with view and download metrics.',
    url: `/bpr/research/${spid}`, type: 'website',
  });
  const data = r.state === 'ready' ? r.data : null;
  const src = r.state === 'ready' ? r.source : 'snapshot';
  const pool = data ? data.works.filter((w) => showAll || confirmed(w)) : [];
  const kinds = useMemo(() => [...new Set(pool.map((w) => kindKey(w.kind)))], [pool]);
  const works = pool.filter((w) => kind === 'all' || kindKey(w.kind) === kind);
  const hidden = data ? data.works.filter((w) => !confirmed(w)).length : 0;

  if (!valid || r.state === 'error') return <BprLayout kicker={ar ? 'البحث' : 'Research'} title={spid}><Failed>{ar ? 'لا يوجد سجل بحثي عام لهذا المعرّف.' : 'No public research record for this SPID.'}</Failed></BprLayout>;
  if (!data) return <BprLayout kicker={ar ? 'البحث' : 'Research'} title={spid}><Loading /></BprLayout>;

  const c = data.counts;
  return (
    <BprLayout kicker={`${ar ? 'البحث' : 'Research'} · ${spid}`} title={ar ? 'البصمة البحثية' : 'Research footprint'}
      lead={<>{ar ? 'بيانات ORCID وZenodo وHugging Face العامة مطابقة عبر DOI. تُحتسب مستودعات Hugging Face فقط عندما تذكر بطاقتها معرّف ORCID.' : data.note} <Link className="profile-text-link" to={`/bpr/p/${spid}`}>{ar ? 'ملف مقدم الرعاية' : 'Provider profile'}<ArrowRight size={13} /></Link></>}>
      <section className="bpr-live-strip">
        <div><span>{ar ? 'تأليف مؤكد من الناشر' : 'Authorship confirmed'}</span><strong>{c.publisher_confirmed ?? '—'}</strong><small>{ar ? `من ${c.dois} عملًا عُثر عليها` : `of ${c.dois} works found`}</small><SourceBadge source={src} /></div>
        <div><span>{ar ? 'في مجتمع BPR' : 'In the BPR community'}</span><strong>{c.in_community ?? '—'}</strong><small>Zenodo · bpr-doctors</small></div>
        <div><span>{ar ? 'تنزيلات Zenodo' : 'Zenodo downloads'}</span><strong>{data.metrics.zenodo_downloads}</strong><small>{data.metrics.zenodo_views} {ar ? 'مشاهدة' : 'views'}</small></div>
        <div><span>{ar ? 'تنزيلات Hugging Face' : 'Hugging Face downloads'}</span><strong>{data.metrics.hf_downloads}</strong><small>{c.hf} {ar ? 'مستودع' : 'repos'}</small></div>
      </section>

      <div className="bpr-toolbar">
        <div className="bpr-chips" role="group" aria-label={ar ? 'النوع' : 'Kind'}>
          <button aria-pressed={kind === 'all'} onClick={() => setKind('all')}>{ar ? 'الكل' : 'All'} · {pool.length}</button>
          {kinds.map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND[k]?.[ar ? 1 : 0] || k} · {pool.filter((w) => kindKey(w.kind) === k).length}</button>)}
        </div>
        {hidden > 0 && <label className="bpr-toggle"><input type="checkbox" checked={showAll} onChange={(e) => { setShowAll(e.target.checked); setKind('all'); }} />{ar ? `إظهار ${hidden} أعمال غير مؤكدة من سجل الناشر` : `Show ${hidden} not confirmed by the publisher record`}</label>}
        <div className="bpr-endpoint-actions">
          <button onClick={() => download(`${spid}-research.csv`, toCsv(works), 'text/csv;charset=utf-8')}><FileDown size={13} />CSV</button>
          <button onClick={() => download(`${spid}-research.bib`, toBibtex(works, data.orcid), 'application/x-bibtex;charset=utf-8')}><FileDown size={13} />BibTeX</button>
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
              {w.sources && Object.entries(w.sources).map(([k, u]) => <a key={k} href={u} target="_blank" rel="noreferrer">{SOURCE[k] || k}</a>)}
              {w.metrics?.zenodo?.downloads != null && <small>{w.metrics.zenodo.downloads} ↓ Zenodo</small>}
              {w.metrics?.hf?.downloads != null && <small>{w.metrics.hf.downloads} ↓ HF</small>}
            </div>
          </li>
        ))}
      </ol>

      {data.authorship_rule && <p className="bpr-note">{ar ? 'يُحتسب العمل من تأليف مقدم الرعاية فقط عندما يذكر سجل الناشر (Crossref/DataCite) معرّف ORCID الخاص به. لا تُعرض الأعمال التي ينسبها الناشر إلى معرّف ORCID آخر.' : data.authorship_rule}</p>}
      {data.runs && <p className="bpr-note">{(ar ? 'آخر تحديث: ' : 'Last refreshed: ') + Object.entries(data.runs).map(([k, v]) => `${SOURCE[k] || k} ${v.note.replace(/\D+/g, '')}`).join(' · ') + ' · ' + fmtDate(Object.values(data.runs)[0]?.at, ar, true)}</p>}
    </BprLayout>
  );
}
