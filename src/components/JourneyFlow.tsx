import { useEffect, useState } from 'react';
import { BookOpen, Hammer, Rocket, CheckCircle2, Activity, Code2, Database, Layers, MessageCircle, Calendar, Users as UsersIcon } from 'lucide-react';
import { useI18n } from '../i18n';

export default function JourneyFlow() {
  const { ar } = useI18n();
  const [hubOk, setHubOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('https://hub.brainsait.de/health').then(r => setHubOk(r.ok)).catch(() => setHubOk(false));
  }, []);

  const steps = [
    {
      icon: BookOpen,
      title: ar ? 'تعلّم — 182 ر.س/شهر' : 'Learn — 182 SAR/mo',
      desc: ar ? '40 كتاباً عبر رابط خاص بعد الدفع — أو كتاب فردي PDF' : '40 books via a private post-payment link — or single-book PDF',
      chain: 'Shopify → thank-you → private library / R2',
      color: '#29d8ff',
    },
    {
      icon: Hammer,
      title: ar ? 'ابنِ — شهري أو 9,630' : 'Build — monthly or 9,630',
      desc: ar ? 'Notion + العقل الثاني + Forge Bot + محاكيات' : 'Notion + 2nd Brain + Forge Bot + simulators',
      chain: 'GitHub → Notion → 2nd Brain → Telegram',
      color: '#e9c46a',
    },
    {
      icon: Rocket,
      title: ar ? 'حلول — 1,999 شهرياً أو 24,000 جاهز' : 'Solutions — 1,999/mo or 24k ready',
      desc: ar ? 'Lark Super-Partner حضانة + Calendar + Form' : 'Lark Super-Partner incubation + Calendar + Form',
      chain: 'Lark → Calendar → Form → GitHub pkg',
      color: '#b8f14e',
    },
  ];

  return (
    <section className="reveal" style={{ margin: '2.2rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{ar ? 'رحلتك — من الفكرة إلى الشركة' : 'Your journey — idea to company'}</h2>
        <span className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={12} /> {hubOk === null ? '…' : hubOk ? (ar ? 'النظام حي' : 'Live') : (ar ? 'تحقق' : 'Check')}
          {hubOk && <CheckCircle2 size={12} color="var(--ok)" />}
        </span>
      </div>
      <p className="benefits-intro" style={{ marginTop: 0 }}>
        {ar ? 'ثلاث مراحل مترابطة — كل دفعة تُطلق سلسلة أتمتة عالية التكامل.' : 'Three interlocked stages — each payment fires a high-integration automation chain.'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {steps.map((s, i) => (
          <div key={i} className="glass" style={{ padding: 16, borderRadius: 16, borderTop: `3px solid ${s.color}`, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}18`, display: 'grid', placeItems: 'center' }}><s.icon size={18} color={s.color} /></span>
              <strong style={{ fontSize: '0.95rem' }}>{s.title}</strong>
            </div>
            <p style={{ margin: '0 0 8px', color: 'var(--ink-soft)', fontSize: '0.9rem', minHeight: 36 }}>{s.desc}</p>
            <code style={{ fontSize: '0.72rem', background: 'var(--surface)', padding: '4px 8px', borderRadius: 6, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.chain}</code>
            {i < 2 && <span style={{ position: 'absolute', insetInlineEnd: -8, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 18, display: 'none' }} className="flow-arrow">→</span>}
          </div>
        ))}
      </div>
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 12, marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: '0.85rem' }}>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Code2 size={14} /> GitHub</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Layers size={14} /> Notion</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Database size={14} /> Airtable</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><MessageCircle size={14} /> Canvas</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Activity size={14} /> Hermes</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><UsersIcon size={14} /> Lark</span>
        <span style={{ marginInlineStart: 'auto', color: 'var(--muted)' }}>{ar ? 'توفر عالٍ · تكامل عالٍ · أتمتة عالية' : 'High availability · High integration · High automation'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <a className="button secondary sm" href="https://store.brainsait.de/products/learn-brainsait-digital-access" target="_blank" rel="noopener noreferrer">182 SAR</a>
        <a className="button secondary sm" href="https://store.brainsait.de/products/build-forge-incubator-founders-program" target="_blank" rel="noopener noreferrer">{ar ? 'BUILD شهري' : 'BUILD monthly'}</a>
        <a className="button secondary sm" href="https://store.brainsait.de/products/solutions-brainsait-super-partner-program" target="_blank" rel="noopener noreferrer">1,999 SAR</a>
        <a className="button primary sm" href="https://calendar.app.google/rAqiE6pNumtECdnd7" target="_blank" rel="noopener noreferrer"><Calendar size={14} /> {ar ? 'احجز جلسة' : 'Book session'}</a>
      </div>
    </section>
  );
}
