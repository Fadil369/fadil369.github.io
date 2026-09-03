import { useState } from 'react';
import { ExternalLink, Check, Sparkles, Crown } from 'lucide-react';
import { useI18n, money } from '../i18n';
import { BENEFITS, TIERS, productUrl, collectionUrl } from '../data/benefitsMatrix';

type Mode = 'monthly' | 'once' | 'all';

export default function BenefitsMatrix() {
  const { ar } = useI18n();
  const [mode, setMode] = useState<Mode>('all');

  const tiers = TIERS.filter(t => mode === 'all' ? true : t.period === (mode === 'monthly' ? 'mo' : mode));
  const cats: Array<'learn' | 'build' | 'solution'> = ['learn', 'build', 'solution'];
  const catLabel = (c: string) => c === 'learn' ? (ar ? 'تعلّم' : 'LEARN') : c === 'build' ? (ar ? 'ابنِ' : 'BUILD') : (ar ? 'حلول' : 'SOLUTION');
  const catColor: Record<string, string> = { learn: '#0ea5e9', build: '#f59e0b', solution: '#10b981' };

  return (
    <section className="benefits-matrix reveal" style={{ margin: '2.5rem 0' }}>
      <header className="page-head" style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
        <p className="hero-eyebrow" style={{ justifyContent: 'center' }}><Sparkles size={14} /> {ar ? 'اختر مسارك' : 'Choose your path'}</p>
        <h2 style={{ fontSize: '1.9rem', margin: '0.4rem 0' }}>{ar ? 'مصفوفة المزايا — LEARN · BUILD · SOLUTION' : 'Benefits matrix — LEARN · BUILD · SOLUTION'}</h2>
        <p className="lede" style={{ maxWidth: 760, margin: '0 auto' }}>
          {ar ? 'كل مسار يبني على الذي قبله. LEARN يفتح المعرفة، BUILD يحولها إلى منتج، SOLUTION ينشرها كمؤسسة.' : 'Each path builds on the last. LEARN unlocks knowledge, BUILD turns it into product, SOLUTION ships it as a company.'}
        </p>
      </header>

      <div className="filters" role="tablist" style={{ justifyContent: 'center', marginBottom: '1.2rem' }}>
        {(['all', 'monthly', 'once'] as Mode[]).map(m => (
          <button key={m} role="tab" aria-selected={mode === m} className={'chip' + (mode === m ? ' active' : '')} onClick={() => setMode(m)}>
            {m === 'all' ? (ar ? 'الكل' : 'All') : m === 'monthly' ? (ar ? 'شهري' : 'Monthly') : (ar ? 'لمرة واحدة' : 'One-time')}
          </button>
        ))}
      </div>

      <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
        {cats.map(cat => {
          const catTiers = tiers.filter(t => t.cat === cat);
          if (!catTiers.length) return null;
          return (
            <div key={cat} className="benefit-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: `4px solid ${catColor[cat]}`, paddingInlineStart: 10 }}>
                <span style={{ fontWeight: 800, letterSpacing: '.06em', fontSize: 12, color: catColor[cat] }}>{catLabel(cat)}</span>
              </div>
              {catTiers.map(t => {
                const isOnce = t.period === 'once';
                const url = t.id === 'learn-book' ? collectionUrl('learn-books') : productUrl(t.handle);
                const oneCollection = t.id === 'solution-ready' ? collectionUrl('solutions-ready') : null;
                return (
                  <article key={t.id} className="pcard" style={{ flex: 1, borderTop: `3px solid ${t.accent}`, position: 'relative', overflow: 'hidden' }}>
                    {t.popular && <span className="pcard-badge" style={{ background: '#f59e0b', color: '#111', insetInlineEnd: 10, top: 10 }}>{ar ? 'الأكثر طلباً' : 'Most popular'}</span>}
                    <div className="pcard-body" style={{ padding: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t.cat === 'build' && t.popular ? <Crown size={16} style={{ color: '#f59e0b' }} /> : null}
                        {ar ? t.ar : t.en}
                      </h3>
                      <p className="pcard-prop" style={{ margin: '0.25rem 0 0.6rem' }}>{ar ? t.taglineAr : t.taglineEn}</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: '1.45rem', fontWeight: 800 }}>{money(t.price, ar)}</span>
                        <span className="muted" style={{ fontSize: 12 }}>{isOnce ? (ar ? 'مرة واحدة' : 'one-time') : (ar ? '/شهر' : '/mo')}</span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {t.benefits.map(b => {
                          const ben = BENEFITS[b];
                          return (
                            <li key={b} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.4 }}>
                              <span style={{ color: '#10b981', marginTop: 1 }}><Check size={14} /></span>
                              <span><span style={{ marginInlineEnd: 4 }}>{ben.icon}</span>{ar ? ben.ar : ben.en}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="pcard-cta" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <a className="button primary sm" href={url} target="_blank" rel="noopener noreferrer" style={{ width: '100%', justifyContent: 'center' }}>
                          {isOnce ? (ar ? 'اشترِ الآن' : 'Buy now') : (ar ? 'اشترك الآن' : 'Subscribe now')} <ExternalLink size={14} />
                        </a>
                        {oneCollection && (
                          <a className="button secondary sm" href={oneCollection} target="_blank" rel="noopener noreferrer" style={{ width: '100%', justifyContent: 'center' }}>
                            {ar ? 'تصفح المجموعة' : 'Browse collection'} <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="fineprint" style={{ textAlign: 'center', marginTop: '1rem' }}>
        {ar ? 'الأسعار بالريال السعودي · الدفع على store.brainsait.de · LEARN كتاب واحد 99 ر.س (R2) أو كل الكتب 182 ر.س/شهر عبر رابط مكتبة خاص' : 'Prices in SAR · Checkout on store.brainsait.de · LEARN single book 99 SAR (R2) or all books 182 SAR/mo through a private library link'}
      </p>
    </section>
  );
}
