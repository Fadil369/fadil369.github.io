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
    <section className="benefits-matrix reveal">
      <header className="page-head benefits-matrix-head">
        <p className="hero-eyebrow"><Sparkles size={14} /> {ar ? 'اختر مسارك' : 'Choose your path'}</p>
        <h2>{ar ? 'مصفوفة المزايا — LEARN · BUILD · SOLUTION' : 'Benefits matrix — LEARN · BUILD · SOLUTION'}</h2>
        <p className="lede">
          {ar ? 'كل مسار يبني على الذي قبله. LEARN يفتح المعرفة، BUILD يحولها إلى منتج، SOLUTION ينشرها كمؤسسة.' : 'Each path builds on the last. LEARN unlocks knowledge, BUILD turns it into product, SOLUTION ships it as a company.'}
        </p>
      </header>

      <div className="filters benefits-matrix-filters" role="tablist">
        {(['all', 'monthly', 'once'] as Mode[]).map(m => (
          <button key={m} role="tab" aria-selected={mode === m} className={'chip' + (mode === m ? ' active' : '')} onClick={() => setMode(m)}>
            {m === 'all' ? (ar ? 'الكل' : 'All') : m === 'monthly' ? (ar ? 'شهري' : 'Monthly') : (ar ? 'لمرة واحدة' : 'One-time')}
          </button>
        ))}
      </div>

      <div className="benefits-grid">
        {cats.map(cat => {
          const catTiers = tiers.filter(t => t.cat === cat);
          if (!catTiers.length) return null;
          return (
            <div key={cat} className="benefit-group">
              <div className="benefit-group-head" style={{ borderInlineStartColor: catColor[cat] }}>
                <span style={{ color: catColor[cat] }}>{catLabel(cat)}</span>
              </div>
              {catTiers.map(t => {
                const isOnce = t.period === 'once';
                const url = t.id === 'learn-book' ? collectionUrl('learn-books') : productUrl(t.handle);
                const oneCollection = t.id === 'solution-ready' ? collectionUrl('solutions-ready') : null;
                return (
                  <article key={t.id} className="pcard benefit-tier-card" style={{ borderTopColor: t.accent }}>
                    {t.popular && <span className="pcard-badge benefit-popular">{ar ? 'الأكثر طلباً' : 'Most popular'}</span>}
                    <div className="pcard-body">
                      <h3>
                        {t.cat === 'build' && t.popular ? <Crown size={16} className="benefit-crown" /> : null}
                        {ar ? t.ar : t.en}
                      </h3>
                      <p className="pcard-prop benefit-tagline">{ar ? t.taglineAr : t.taglineEn}</p>
                      <div className="benefit-price-row">
                        <span className="benefit-price">{money(t.price, ar)}</span>
                        <span className="muted benefit-period">{isOnce ? (ar ? 'مرة واحدة' : 'one-time') : (ar ? '/شهر' : '/mo')}</span>
                      </div>
                      <ul className="benefit-list">
                        {t.benefits.map(b => {
                          const ben = BENEFITS[b];
                          return (
                            <li key={b}>
                              <span className="benefit-check"><Check size={14} /></span>
                              <span><span className="benefit-icon">{ben.icon}</span>{ar ? ben.ar : ben.en}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="pcard-cta benefit-cta">
                        <a className="button primary sm" href={url} target="_blank" rel="noopener noreferrer">
                          {isOnce ? (ar ? 'اشترِ الآن' : 'Buy now') : (ar ? 'اشترك الآن' : 'Subscribe now')} <ExternalLink size={14} />
                        </a>
                        {oneCollection && (
                          <a className="button secondary sm" href={oneCollection} target="_blank" rel="noopener noreferrer">
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

      <p className="fineprint benefits-footnote">
        {ar ? 'الأسعار بالريال السعودي · الدفع على store.brainsait.de · LEARN كتاب واحد 99 ر.س (R2) أو كل الكتب 182 ر.س/شهر عبر رابط مكتبة خاص' : 'Prices in SAR · Checkout on store.brainsait.de · LEARN single book 99 SAR (R2) or all books 182 SAR/mo through a private library link'}
      </p>
    </section>
  );
}
