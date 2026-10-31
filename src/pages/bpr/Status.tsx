import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, Failed, fmtDate, Loading, SourceBadge } from '../../components/BprKit';
import { OpsStatus, useLoad } from '../../lib/bpr';

const GOOD = new Set(['ok', 'pass']);

export default function Status() {
  const { ar } = useI18n();
  const s = useLoad<OpsStatus>('/api/status', 'status.json');
  usePageMeta({
    title: ar ? 'حالة التشغيل — BPR' : 'Operations status — BPR',
    description: ar ? 'حكم سجل برينسايت على صحته: المواقع والنسخ الاحتياطية والمفاتيح والسجل الشفاف.' : 'The BrainSAIT Provider Registry’s own health verdict: sites, backups, keys and the transparency log.',
    url: '/bpr/status', type: 'website',
  });
  const d = s.state === 'ready' ? s.data : null;
  const src = s.state === 'ready' ? s.source : 'snapshot';
  const ops = d?.operations;
  return (
    <BprLayout kicker={ar ? 'الحالة' : 'Status'}
      title={ar ? 'ما يقوله السجل عن نفسه.' : 'What the registry reports about itself.'}
      lead={ar ? 'تُعرض النتائج كما يرسلها السجل، بما في ذلك الإخفاقات.' : 'Shown exactly as the registry reports it, failures included.'}>
      {s.state === 'loading' && <Loading />}
      {s.state === 'error' && <Failed />}
      {d && <>
        <section className={`bpr-verdict ${ops?.verdict === 'ok' || ops?.verdict === 'passing' ? 'ok' : 'fail'}`}>
          <span>{ar ? 'الحكم العام' : 'Overall verdict'}</span>
          <strong>{ops?.verdict || '—'}</strong>
          <small>{ar ? 'فُحص' : 'Checked'} {fmtDate(ops?.checked_at || d.checked_at, ar, true)}</small>
          <SourceBadge source={src} />
        </section>
        {ops && <section className="bpr-panel">
          <h2>{ar ? 'الفحوصات التشغيلية' : 'Operational checks'}</h2>
          <ul className="bpr-status-grid" dir="ltr">
            {Object.entries(ops.checks).map(([k, v]) => <li key={k} className={GOOD.has(v) ? 'ok' : v === 'off' ? 'off' : 'fail'}><span>{k.replace(/_/g, ' ')}</span><strong>{v}</strong></li>)}
          </ul>
        </section>}
        <section className="bpr-panel">
          <h2>{ar ? 'المواقع المراقبة' : 'Monitored sites'}</h2>
          <ul className="bpr-status-grid sites" dir="ltr">
            {Object.entries(d.sites).map(([u, v]) => <li key={u} className={GOOD.has(v) ? 'ok' : 'fail'}><span>{u.replace(/^https:\/\//, '').replace(/\/$/, '')}</span><strong>{v}</strong></li>)}
          </ul>
        </section>
      </>}
    </BprLayout>
  );
}
