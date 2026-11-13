import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Download, LayoutGrid, Link2, List, Search } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, Failed, Loading, SourceBadge, TRUST_LABEL, TrustGlyph, trustTone, valueLabel } from '../../components/BprKit';
import type { Trust } from '../../lib/bpr';
import { ProviderList, useLoad } from '../../lib/bpr';
import { applyDirectory, coverage, DEFAULT_STATE, parseState, registryCoverage, serializeState, toCsv } from '../../lib/directory';
import type { DirectoryState, Dimension, Filter, Sort } from '../../lib/directory';

export default function Providers() {
  const { ar } = useI18n();
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseState(params), [params]);
  const [notice, setNotice] = useState('');
  // BRAINSAIT: filter state lives in the URL so a view can be shared; only public, non-PHI fields are listed.
  const patch = (next: Partial<DirectoryState>) => setParams(new URLSearchParams(serializeState({ ...state, ...next })), { replace: true });
  const list = useLoad<ProviderList>('/api/providers', 'providers.json');
  usePageMeta({
    title: ar ? 'دليل مقدمي الرعاية — BPR' : 'Provider directory — BPR',
    description: ar ? 'ابحث في مقدمي الرعاية المدرجين في سجل برينسايت وشاهد كل بُعد للثقة بشكل منفصل.' : 'Search providers listed in the BrainSAIT Provider Registry, with each trust dimension shown separately.',
    url: '/bpr/providers', type: 'website',
  });

  const items = useMemo(() => (list.state === 'ready' ? applyDirectory(list.data.items, state) : []), [list, state]);
  const gapMap = useMemo(() => (list.state === 'ready' ? registryCoverage(list.data.items) : []), [list]);
  const FILTERS: [Filter, string, string][] = [
    ['all', 'All', 'الكل'], ['orcid', 'ORCID confirmed', 'ORCID مؤكد'], ['signed', 'Signed credential', 'اعتماد موقّع'], ['member', 'Members', 'الأعضاء'],
  ];
  const SORTS: [Sort, string, string][] = [['name', 'Name', 'الاسم'], ['gaps', 'Most open checks', 'الأكثر فحوصًا مفتوحة'], ['spid', 'SPID', 'SPID']];
  const dimName = (d: Dimension) => TRUST_LABEL[d][ar ? 1 : 0];
  const flash = (m: string) => { setNotice(m); window.setTimeout(() => setNotice(''), 3000); };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); flash(ar ? 'نُسخ رابط هذا العرض.' : 'Link to this view copied.'); }
    catch { flash(ar ? 'تعذّر النسخ؛ انسخ الرابط من شريط العنوان.' : 'Could not copy; use the address bar instead.'); }
  };
  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob(['\ufeff' + toCsv(items)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'bpr-providers.csv'; a.click(); URL.revokeObjectURL(url);
    flash(ar ? `صُدّر ${items.length} سجلًا (حقول عامة فقط).` : `Exported ${items.length} record(s), public fields only.`);
  };
  const Meter = ({ trust }: { trust: Trust }) => {
    const c = coverage(trust);
    return (
      <div className="bpr-coverage">
        <div className="bpr-coverage-bar" role="img" aria-label={ar ? `${c.checked} من ${c.total} فحوص مكتملة` : `${c.checked} of ${c.total} checks completed`}>
          {Array.from({ length: c.total }, (_, i) => <span key={i} data-on={i < c.checked} />)}
        </div>
        <small>{ar ? `${c.checked} من ${c.total} فحوص مكتملة` : `${c.checked} of ${c.total} checks completed`}{c.gaps.length ? ` · ${ar ? 'مفتوحة' : 'open'}: ${c.gaps.map(dimName).join(ar ? '، ' : ', ')}` : ''}</small>
      </div>
    );
  };

  return (
    <BprLayout
      kicker={ar ? 'الدليل' : 'Directory'}
      title={ar ? 'الممارسون الصحيون المدرجون' : 'Listed healthcare professionals'}
      lead={ar
        ? 'كل ممارس مدرج في لمحة واحدة: الهوية والتوقيع والعضوية والترخيص، كلٌّ في خانته، مباشرة من السجل.'
        : 'Every listed professional at a glance: identity, signature, membership and licence, each in its own place, straight from the registry.'}
    >
      {list.state === 'ready' && (
        <section className="bpr-gapmap" aria-label={ar ? 'خريطة الفحوص المفتوحة في السجل' : 'Registry gap map'}>
          <h2>{ar ? 'أين الفجوات؟' : 'Where are the gaps?'}</h2>
          <p>{ar ? 'عدد الممارسين الذين اكتمل فحص كل بُعد لديهم. اختر بُعدًا لعرض من لم يُفحص بعد. هذا عدّ للفحوص لا درجة ثقة.' : 'How many listed providers have each dimension checked. Pick one to see who is still open. A count of checks, not a trust score.'}</p>
          <ul>
            {gapMap.map(({ dimension, checked, total }) => (
              <li key={dimension}>
                <button aria-pressed={state.gap === dimension} onClick={() => patch({ gap: state.gap === dimension ? null : dimension })}>
                  <span>{dimName(dimension)}</span><strong dir="ltr">{checked}/{total}</strong>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="bpr-toolbar">
        <label className="bpr-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{ar ? 'بحث' : 'Search'}</span>
          <input value={state.q} onChange={(e) => patch({ q: e.target.value })} placeholder={ar ? 'الاسم أو SPID أو التخصص' : 'Name, SPID or specialty'} />
        </label>
        <div className="bpr-chips" role="group" aria-label={ar ? 'تصفية' : 'Filter'}>
          {FILTERS.map(([k, en, a]) => <button key={k} aria-pressed={state.filter === k} onClick={() => patch({ filter: k })}>{ar ? a : en}</button>)}
        </div>
        {list.state === 'ready' && <SourceBadge source={list.source} />}
      </div>
      {list.state === 'ready' && (
        <div className="bpr-toolbar bpr-toolbar-tools">
          <label className="bpr-select"><span>{ar ? 'الترتيب' : 'Sort'}</span>
            <select value={state.sort} onChange={(e) => patch({ sort: e.target.value as Sort })}>{SORTS.map(([k, en, a]) => <option key={k} value={k}>{ar ? a : en}</option>)}</select>
          </label>
          <div className="bpr-chips" role="group" aria-label={ar ? 'طريقة العرض' : 'View'}>
            <button aria-pressed={state.view === 'cards'} onClick={() => patch({ view: 'cards' })}><LayoutGrid size={14} aria-hidden="true" /> {ar ? 'بطاقات' : 'Cards'}</button>
            <button aria-pressed={state.view === 'list'} onClick={() => patch({ view: 'list' })}><List size={14} aria-hidden="true" /> {ar ? 'قائمة' : 'List'}</button>
          </div>
          <div className="bpr-chips">
            <button onClick={copyLink}><Link2 size={14} aria-hidden="true" /> {ar ? 'انسخ رابط العرض' : 'Copy link to this view'}</button>
            <button onClick={downloadCsv} disabled={items.length === 0}><Download size={14} aria-hidden="true" /> CSV</button>
          </div>
          <p className="bpr-result-count" role="status" aria-live="polite">{notice || (ar ? `${items.length} من ${list.data.items.length} ممارسين` : `${items.length} of ${list.data.items.length} providers`)}</p>
        </div>
      )}

      {list.state === 'loading' && <Loading />}
      {list.state === 'error' && <Failed />}
      {list.state === 'ready' && (items.length === 0
        ? <div className="bpr-state"><span>{ar ? 'لا يطابق بحثك أي مقدم رعاية في هذا العرض.' : 'No providers match this search and filter.'}</span><button className="profile-text-link" onClick={() => { setParams(new URLSearchParams(), { replace: true }); }}>{ar ? 'مسح البحث والتصفية' : 'Clear search & filters'}</button></div>
        : state.view === 'list'
        ? <div className="bpr-table-wrap"><table className="bpr-table">
          <caption className="sr-only">{ar ? 'الممارسون المدرجون' : 'Listed providers'}</caption>
          <thead><tr><th scope="col">{ar ? 'الاسم' : 'Name'}</th><th scope="col">SPID</th>{(Object.keys(TRUST_LABEL) as (keyof Trust)[]).map((k) => <th scope="col" key={k}>{TRUST_LABEL[k][ar ? 1 : 0]}</th>)}<th scope="col">{ar ? 'الفحوص' : 'Checks'}</th></tr></thead>
          <tbody>{items.map((p) => (
            <tr key={p.spid}>
              <th scope="row"><Link to={`/bpr/p/${p.spid}`}>{ar ? p.name_ar : p.name_en}</Link></th>
              <td><code dir="ltr">{p.spid}</code></td>
              {(Object.keys(TRUST_LABEL) as (keyof Trust)[]).map((k) => <td key={k} className={trustTone(p.trust[k])}><TrustGlyph tone={trustTone(p.trust[k])} /> {valueLabel(p.trust[k], ar)}</td>)}
              <td dir="ltr">{coverage(p.trust).checked}/{coverage(p.trust).total}</td>
            </tr>))}</tbody>
        </table></div>
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
              <Meter trust={p.trust} />
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
