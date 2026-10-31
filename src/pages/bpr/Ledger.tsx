import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, CheckRow, Failed, fmtDate, Loading, SourceBadge } from '../../components/BprKit';
import { Check, LedgerResult, replayLedger, sha256Hex, short } from '../../lib/bpr';

export default function Ledger() {
  const { ar } = useI18n();
  const [log, setLog] = useState<LedgerResult | null>(null);
  const [err, setErr] = useState(false);
  const [tamper, setTamper] = useState<Check | null>(null);
  useEffect(() => { replayLedger().then(setLog, () => setErr(true)); }, []);
  usePageMeta({
    title: ar ? 'السجل الشفاف — BPR' : 'Transparency log — BPR',
    description: ar ? 'كل إصدار وتجديد وإلغاء لاعتمادات BPR في سلسلة تجزئة عامة يعيد متصفحك التحقق منها.' : 'Every BPR credential issue, renewal and revocation in a public hash chain your browser replays.',
    url: '/bpr/ledger', type: 'website',
  });

  // Recompute the first entry with one character changed: its hash no longer matches, so the chain breaks.
  const tryTamper = async () => {
    if (!log?.entries.length) return;
    const e = log.entries[0];
    const swapped = e.line.replace(`"event":"${e.event}"`, `"event":"${e.event === 'revoked' ? 'issued' : 'revoked'}"`);
    const altered = await sha256Hex(swapped === e.line ? e.line + ' ' : swapped);
    setTamper(altered === e.hash ? { state: 'ok' } : { state: 'fail', detail: `#1 → ${short(altered, 12)} ≠ ${short(e.hash, 12)}`, how: 'device' });
  };

  return (
    <BprLayout kicker={ar ? 'السجل الشفاف' : 'Transparency log'}
      title={ar ? 'سلسلة عامة لا يمكن إعادة كتابتها بصمت.' : 'A public chain that cannot be quietly rewritten.'}
      lead={ar
        ? 'كل سطر يحمل تجزئة السطر السابق، ورأس السلسلة موقّع من السجل. يعيد متصفحك الآن حساب كل تجزئة من البداية.'
        : 'Each line carries the hash of the line before it, and the head is signed by the registry. Your browser is recomputing every hash from genesis right now.'}>
      {err && <Failed />}
      {!log && !err && <Loading label={ar ? 'جارٍ إعادة التحقق من السلسلة…' : 'Replaying the chain…'} />}
      {log && <>
        <div className="bpr-profile-grid">
          <section className="bpr-panel">
            <div className="bpr-panel-head"><h2>{ar ? 'التحقق' : 'Checks'}</h2><SourceBadge source={log.source} /></div>
            <CheckRow label={ar ? 'سلسلة التجزئة' : 'Hash chain'} check={log.chain} />
            <CheckRow label={ar ? 'توقيع الرأس' : 'Head signature'} check={log.headSignature} />
            <div className="bpr-forge">
              <Hammer size={18} />
              <div><strong>{ar ? 'جرّب العبث' : 'Try tampering'}</strong><p>{ar ? 'نعيد كتابة السطر الأول بحدث مختلف ونعيد حساب تجزئته.' : 'Rewrite entry #1 with a different event and recompute its hash.'}</p></div>
              <button className="profile-button secondary" onClick={tryTamper} disabled={!log.entries.length}>{ar ? 'اعبث' : 'Tamper'}</button>
            </div>
            {tamper && <CheckRow label={ar ? 'سلسلة معدّلة' : 'Altered chain'} check={tamper} />}
          </section>
          <section className="bpr-panel">
            <h2>{ar ? 'الرأس الموقّع' : 'Signed head'}</h2>
            <dl className="bpr-facts">
              <div><dt>{ar ? 'الحجم' : 'Size'}</dt><dd>{log.head.size}</dd></div>
              <div><dt>{ar ? 'التجزئة' : 'Hash'}</dt><dd dir="ltr" className="bpr-mono">{log.head.hash}</dd></div>
              <div><dt>{ar ? 'وقت التوقيع' : 'Signed at'}</dt><dd>{fmtDate(log.head.at, ar, true)}</dd></div>
              <div><dt>{ar ? 'المفتاح' : 'Key'}</dt><dd dir="ltr" className="bpr-mono">{log.head.kid}</dd></div>
              <div><dt>{ar ? 'القاعدة' : 'Rule'}</dt><dd dir="ltr" className="bpr-mono">{log.rule || 'hash = sha256(line); line.prev = previous hash'}</dd></div>
            </dl>
          </section>
        </div>

        <section className="bpr-panel">
          <h2>{ar ? 'الأسطر' : 'Entries'}</h2>
          <ol className="bpr-chain" dir="ltr">
            <li className="genesis"><span>0</span><code>{short(log.genesis, 16)}</code><em>genesis</em></li>
            {log.entries.map((e) => (
              <li key={e.seq}>
                <span>{e.seq}</span>
                <div>
                  <strong className={`ev ${e.event}`}>{e.event}</strong>
                  <Link to={`/bpr/p/${e.spid}`}>{e.spid}</Link>
                  <time>{fmtDate(e.at, ar, true)}</time>
                </div>
                <code title={e.hash}>prev {short(e.prev, 10)} → {short(e.hash, 10)}</code>
              </li>
            ))}
          </ol>
        </section>
      </>}
    </BprLayout>
  );
}
