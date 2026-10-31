import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hammer, RotateCcw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, CheckRow, Failed, fmtDate, Loading, SourceBadge } from '../../components/BprKit';
import { Check, LedgerResult, replayLedger, sha256Hex, short } from '../../lib/bpr';

export default function Ledger() {
  const { ar } = useI18n();
  const [log, setLog] = useState<LedgerResult | null>(null);
  const [err, setErr] = useState(false);
  const [tamper, setTamper] = useState<Check | null>(null);
  const [diff, setDiff] = useState<{ orig: string; altered: string; token: [string, string]; stored: string; recomputed: string } | null>(null);
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
    const to = e.event === 'revoked' ? 'issued' : 'revoked';
    const swapped = e.line.replace(`"event":"${e.event}"`, `"event":"${to}"`);
    const altered = swapped === e.line ? e.line + ' ' : swapped;
    const recomputed = await sha256Hex(altered);
    setDiff({ orig: e.line, altered, token: [e.event, to], stored: e.hash, recomputed });
    setTamper(recomputed === e.hash ? { state: 'ok' } : { state: 'fail', detail: `#1 → ${short(recomputed, 12)} ≠ ${short(e.hash, 12)}`, how: 'device' });
  };
  const reset = () => { setTamper(null); setDiff(null); };
  const mark = (line: string, token: string) => {
    const i = line.indexOf(`"event":"${token}"`);
    if (i < 0) return line;
    const a = i + 9, b = a + token.length;
    return <>{line.slice(0, a)}<mark>{line.slice(a, b)}</mark>{line.slice(b)}</>;
  };
  const hexDiff = (h: string, ref: string) => [...h].map((c, i) => <span key={i} className={c === ref[i] ? '' : 'hx'}>{c}</span>);

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
              {diff ? <button className="profile-button secondary" onClick={reset}><RotateCcw size={14} />{ar ? 'إعادة' : 'Reset'}</button>
                : <button className="profile-button secondary" onClick={tryTamper} disabled={!log.entries.length}>{ar ? 'اعبث' : 'Tamper'}</button>}
            </div>
            {tamper && <div aria-live="polite"><CheckRow label={ar ? 'سلسلة معدّلة (محاكاة)' : 'Altered chain (simulation)'} check={tamper} /></div>}
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
          <h2>{ar ? 'السلسلة' : 'The chain'}</h2>
          <ol className="ledger-chain" dir="ltr">
            <li className="ledger-block genesis"><span className="ledger-seq">0</span><strong>genesis</strong><code>{short(log.genesis, 6)}</code></li>
            {log.entries.map((e, i) => {
              const broken = !!diff && i >= 0;
              return (
                <li key={e.seq} className={`ledger-block${broken ? ' broken' : ''}`} style={{ ['--fp' as string]: `#${e.hash.slice(0, 6)}` }}>
                  <span className="ledger-seq">{e.seq}</span>
                  <strong className={`ev ${diff && i === 0 ? diff.token[1] : e.event}`}>{diff && i === 0 ? diff.token[1] : e.event}</strong>
                  <Link to={`/bpr/p/${e.spid}`}>{e.spid}</Link>
                  <time>{fmtDate(e.at, ar, true)}</time>
                  <code title={e.hash}>prev {short(e.prev, 4)}</code>
                  <code title={e.hash}>hash {short(diff && i === 0 ? diff.recomputed : e.hash, 6)}</code>
                </li>
              );
            })}
            <li className={`ledger-block head${diff ? ' broken' : ''}`}><span className="ledger-seq">✎</span><strong>{ar ? 'الرأس الموقّع' : 'signed head'}</strong><code>{short(log.head.hash, 6)}</code><small>{diff ? (ar ? 'لم يعد يطابق' : 'no longer matches') : log.headSignature.state === 'ok' ? (ar ? 'توقيع صالح' : 'signature valid') : ''}</small></li>
          </ol>
          {diff && <div className="ledger-diff">
            <p className="bpr-note"><strong>{ar ? 'محاكاة فقط. السجل الحقيقي لم يتغير.' : 'Simulation only. The real log is unchanged.'}</strong></p>
            <div><small>{ar ? 'السطر الأصلي' : 'Original line'}</small><pre dir="ltr">{mark(diff.orig, diff.token[0])}</pre></div>
            <div><small>{ar ? 'السطر بعد العبث' : 'Tampered line'}</small><pre dir="ltr">{mark(diff.altered, diff.token[1])}</pre></div>
            <div><small>{ar ? 'التجزئة المخزنة' : 'Stored hash'}</small><pre dir="ltr">{diff.stored}</pre></div>
            <div><small>{ar ? 'التجزئة المعاد حسابها' : 'Recomputed hash'}</small><pre dir="ltr">{hexDiff(diff.recomputed, diff.stored)}</pre></div>
          </div>}
        </section>
      </>}
    </BprLayout>
  );
}
