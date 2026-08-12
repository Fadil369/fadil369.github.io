import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Award, CheckCircle2, Circle, Loader2, ExternalLink, Trophy, RefreshCw, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import { BUILD_APPLY_BASE } from '../config/build';

interface Task {
  name: string;
  status: string;
  channel: string;
}
interface Milestone {
  name: string;
  status: string;
}
interface ProgressData {
  ok: boolean;
  name?: string;
  email?: string;
  tier?: string;
  track?: string;
  trackUrl?: string;
  paymentStatus?: string;
  applicationStatus?: string;
  notionUrl?: string;
  totalTasks: number;
  doneTasks: number;
  percent: number;
  badges: string[];
  tasks: Task[];
  milestones: Milestone[];
  nextTask?: string | null;
  error?: string;
}

const BADGE_ICONS: Record<string, string> = {
  Onboarded: '🌱',
  Activated: '⚡',
  Builder: '🔨',
  'Launch Ready': '🚀',
  Launched: '🎉',
  Verified: '✅',
  Paid: '💳',
};

export default function Track() {
  const { ar } = useI18n();
  const [params] = useSearchParams();
  const ref = params.get('ref') || '';
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!ref) {
      setError(ar ? 'لم يتم توفير رقم الطلب' : 'No application ref provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    fetch(`${BUILD_APPLY_BASE}/progress/${encodeURIComponent(ref)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(d);
        else setError(d.error || 'Not found');
      })
      .catch(() => setError(ar ? 'تعذر الاتصال' : 'Could not reach server'))
      .finally(() => setLoading(false));
  }, [ref, ar]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <main className="page" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="page" style={{ maxWidth: 620, margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
        <h2>{ar ? 'تعذر العثور على الطلب' : 'Application not found'}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>{error}</p>
        <Link className="button secondary" to="/build">{ar ? 'العودة إلى البناء' : 'Back to Build'}</Link>
      </main>
    );
  }

  const pct = Math.round(data.percent * 100);

  return (
    <main className="page" style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{ar ? 'لوحة تقدمك' : 'Your Progress Dashboard'}</h1>
        <p style={{ color: 'var(--muted)' }}>{data.name} · {data.track}</p>
        <button
          className="button secondary sm"
          onClick={load}
          style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={14} /> {ar ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Next task */}
      {data.nextTask && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(233,196,106,0.12), rgba(41,216,255,0.10))',
          border: '1px solid var(--gold)', borderRadius: 16,
          padding: '1rem 1.2rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <Sparkles size={18} color="var(--gold)" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>
              {ar ? 'خطوتك التالية' : 'Your next step'}
            </div>
            <div style={{ fontWeight: 700 }}>{data.nextTask}</div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 700 }}>{ar ? 'التقدم الكلي' : 'Overall Progress'}</span>
          <span style={{ fontWeight: 800, color: 'var(--gold)' }}>{pct}%</span>
        </div>
        <div style={{ height: 14, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--gold), var(--cyan))',
            transition: 'width 0.6s ease',
            borderRadius: 999,
          }} />
        </div>
        <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          {data.doneTasks} / {data.totalTasks} {ar ? 'مهمة مكتملة' : 'tasks completed'}
        </p>
      </div>

      {/* Badges */}
      {data.badges.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={18} /> {ar ? 'الأوسمة' : 'Badges'}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {data.badges.map((b) => (
              <span key={b} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: 'color-mix(in srgb, var(--gold) 12%, var(--surface-2))',
                border: '1px solid var(--gold)', borderRadius: 999,
                padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.9rem',
              }}>
                <span>{BADGE_ICONS[b] || '🏅'}</span> {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{ar ? 'حالة الطلب' : 'Application'}</p>
          <p style={{ fontWeight: 700, marginTop: '0.3rem' }}>{data.applicationStatus}</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{ar ? 'حالة الدفع' : 'Payment'}</p>
          <p style={{ fontWeight: 700, marginTop: '0.3rem' }}>{data.paymentStatus}</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{ar ? 'المسار' : 'Track'}</p>
          <p style={{ fontWeight: 700, marginTop: '0.3rem' }}>{data.track}</p>
        </div>
      </div>

      {/* Tasks */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>{ar ? 'المهام' : 'Tasks'}</h3>
        {data.tasks.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>{ar ? 'لا توجد مهام بعد' : 'No tasks yet'}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {data.tasks.map((t, i) => (
              <li key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.8rem', borderRadius: 12,
                background: 'var(--surface-2)', border: '1px solid var(--line)',
              }}>
                {t.status === 'Done'
                  ? <CheckCircle2 size={18} color="var(--ok)" />
                  : <Circle size={18} color="var(--muted)" />}
                <span style={{ flex: 1, fontWeight: t.status === 'Done' ? 500 : 600, textDecoration: t.status === 'Done' ? 'line-through' : 'none', color: t.status === 'Done' ? 'var(--muted)' : 'var(--ink)' }}>
                  {t.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{t.channel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Milestones */}
      {data.milestones.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} /> {ar ? 'الأهداف' : 'Milestones'}
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.milestones.map((m, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>{m.name}</span>
                <span style={{ color: m.status === 'Completed' ? 'var(--ok)' : 'var(--muted)', fontWeight: 600 }}>{m.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Links */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {data.notionUrl && (
          <a className="button secondary" href={data.notionUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} /> {ar ? 'عرض في Notion' : 'View in Notion'}
          </a>
        )}
        {data.trackUrl && (
          <a className="button secondary" href={data.trackUrl} target="_blank" rel="noopener noreferrer">
            {ar ? 'افتح مسارك' : 'Open your track'}
          </a>
        )}
        <a className="button secondary" href="https://t.me/BrainSAITForgeBot" target="_blank" rel="noopener noreferrer">
          {ar ? 'بوت Forge' : 'Forge Bot'}
        </a>
      </div>
    </main>
  );
}
