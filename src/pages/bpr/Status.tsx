import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, Failed, fmtDate, Loading, SourceBadge } from '../../components/BprKit';
import { OpsStatus, useLoad } from '../../lib/bpr';

const GOOD = new Set(['ok', 'pass']);
const WORD: Record<string, string> = { vc: 'Credential', ai: 'AI', sms: 'SMS', emr: 'EMR', hf: 'HF', orcid: 'ORCID' };
const label = (k: string) => k.split('_').map((w) => WORD[w] || w[0].toUpperCase() + w.slice(1)).join(' ');
const rank = (v: string) => (GOOD.has(v) ? 3 : v === 'off' ? 2 : v === 'warn' ? 1 : 0);

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
      title={ar ? 'صحة السجل كما يرصدها بنفسه.' : 'Registry health, as the registry reports it.'}
      lead={ar ? 'نتائج مباشرة من نظام المراقبة في السجل، تُعرض كما هي دون تعديل، بما فيها أي إخفاق قائم.' : 'Live results from the registry’s own monitoring, shown unedited — including anything that is failing right now.'}>
      {s.state === 'loading' && <Loading />}
      {s.state === 'error' && <Failed />}
      {d && <>
        <section className={`bpr-verdict ${ops?.verdict === 'ok' || ops?.verdict === 'passing' ? 'ok' : 'fail'}`}>
          <span>{ar ? 'الحكم العام' : 'Overall verdict'}</span>
          <strong>{ops?.verdict || '—'}</strong>
          <small>{ar ? 'فُحص' : 'Checked'} {fmtDate(ops?.checked_at || d.checked_at, ar, true)}</small>
          <SourceBadge source={src} />
          {ops && (() => {
            const v = Object.values(ops.checks);
            const n = (f: (x: string) => boolean) => v.filter(f).length;
            return <p className="bpr-verdict-counts">{ar
              ? `${n((x) => !GOOD.has(x) && x !== 'off' && x !== 'warn')} فشل · ${n((x) => x === 'warn')} تحذير · ${n((x) => x === 'off')} متوقف · ${n((x) => GOOD.has(x))} سليم من ${v.length} فحصًا`
              : `${n((x) => !GOOD.has(x) && x !== 'off' && x !== 'warn')} fail · ${n((x) => x === 'warn')} warn · ${n((x) => x === 'off')} off · ${n((x) => GOOD.has(x))} ok of ${v.length} checks`}</p>;
          })()}
        </section>
        {ops && <section className="bpr-panel">
          <h2>{ar ? 'الفحوصات التشغيلية' : 'Operational checks'}</h2>
          <ul className="bpr-status-grid" dir="ltr">
            {Object.entries(ops.checks).sort((a, b) => rank(a[1]) - rank(b[1])).map(([k, v]) => <li key={k} className={GOOD.has(v) ? 'ok' : v === 'off' ? 'off' : 'fail'}><span>{label(k)}</span><strong>{v}</strong></li>)}
          </ul>
        </section>}
        <section className="bpr-panel">
          <h2>{ar ? 'المواقع المراقبة' : 'Monitored sites'}</h2>
          <p className="bpr-note">{ar ? 'يراقب السجل مواقعه ومواقع شريكة وأخرى غير مرتبطة على الخادم نفسه؛ تعطل موقع شريك يجعل الحكم العام «فاشل» دون أن يؤثر على التحقق.' : 'The registry monitors its own sites plus partner and unrelated domains on the same server; a partner site being down marks the overall verdict as failing without affecting verification.'}</p>
          <ul className="bpr-status-grid sites" dir="ltr">
            {Object.entries(d.sites).sort((a, b) => rank(a[1]) - rank(b[1])).map(([u, v]) => <li key={u} className={GOOD.has(v) ? 'ok' : 'fail'}><span>{u.replace(/^https:\/\//, '').replace(/\/$/, '')}</span><strong>{v}</strong></li>)}
          </ul>
        </section>
      </>}
    </BprLayout>
  );
}
