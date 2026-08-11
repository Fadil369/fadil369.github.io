import { Link } from 'react-router-dom';
import data from '../data/catalog.json';
import type { Catalog } from '../types';
import { useI18n } from '../i18n';
import ProductCard from '../components/ProductCard';
import BuildEligibilityForm from '../components/BuildEligibilityForm';

const cat = data as unknown as Catalog;

/**
 * Build stage — the BrainSAIT incubation program.
 * SAR 9,630 base price with eligibility-based tiers:
 * - Saudi/Sudanese: 100% (FREE)
 * - Healthcare professionals: 50% off (SAR 4,815)
 * - Warrior Entrepreneurs: 35% off (SAR 6,259.50)
 * - Students/Researchers: 30% off (SAR 6,741)
 * - Standard: Full price (SAR 9,630)
 *
 * Progressive eligibility engine powered by Airtable + Shopify.
 */
export default function Build() {
  const { ar, t } = useI18n();
  const { program, courses } = cat.build;

  return (
    <main className="page">
      <header className="page-head reveal">
        <h1>{ar ? program.nameAr : program.name}</h1>
        <p className="lede">{ar ? program.taglineAr : program.tagline}</p>
      </header>

      <section className="build-engine reveal">
        <BuildEligibilityForm />
      </section>

      <section className="forge-teaser reveal">
        <div className="forge-mark">ب</div>
        <h2>{ar ? 'منصة الإطلاق — Launch Forge' : 'Launch Forge'}</h2>
        <p className="forge-lead">
          {ar
            ? 'دخولك إلى البرنامج يبدأ من منصة الإطلاق: رحلة موجهة من 5 أيام من الفكرة إلى الإطلاق — مع جلسات تدريب، نقاط إطلاق، ومشرفين ذكيين.'
            : 'Your program journey runs on Launch Forge: a guided 5-day track from idea to launch — with coaching sessions, ForgeScores, and intelligent mentors.'}
        </p>
        <ul className="forge-points">
          {[
            [ar ? 'مسار 5 أيام' : '5-day track', ar ? 'انطلاق · تحديد · بناء · دمج · تحقق · إطلاق' : 'Ignition · Define · Build · Integrate · Validate · Launch'],
            [ar ? 'نقاط الإطلاق' : 'ForgeScore', ar ? 'مقياس جاهزية محدد عبر 7 أبعاد' : 'deterministic readiness score across 7 dimensions'],
            [ar ? 'مراقبة ذكية' : 'Smart oversight', ar ? 'بوابات موافقة + سجل أحداث + عودة آمنة' : 'approval gates + audit trail + rollback'],
          ].map(([k, v], i) => (
            <li key={i}><b>{k}</b> — {v}</li>
          ))}
        </ul>
        <a className="button primary" href="https://forge.brainsait.org" target="_blank" rel="noopener noreferrer">
          {ar ? 'افتح منصة الإطلاق' : 'Open Launch Forge'} ↗
        </a>
        <p className="fineprint">forge.brainsait.org · Launch Forge (BEOS)</p>
      </section>

      <section className="program-benefits reveal">
        <h2>{ar ? 'استحقاقات البناء' : 'Build Benefits'}</h2>
        <p className="benefits-intro">
          {ar
            ? 'نحن ندعم البنّاة من جميع الخلفيات. اختر ما ينطبق عليك وحسّن سعرك.'
            : 'We support builders from all backgrounds. Pick what applies and optimize your price.'}
        </p>

        {program.benefits && program.benefits.length > 0 && (
          <div className="benefits-grid">
            {program.benefits.map((benefit) => (
              <div key={benefit.id} className="benefit-card">
                <div className="benefit-icon">{benefit.icon}</div>
                <h3>{ar ? benefit.titleAr : benefit.titleEn}</h3>
                <p className="benefit-desc">
                  {ar ? benefit.descriptionAr : benefit.descriptionEn}
                </p>
                <p className="benefit-discount">
                  {benefit.discount === 100 ? (
                    ar ? '🎉 مجاني تماماً' : '🎉 Completely free'
                  ) : (
                    `${benefit.discount}% off`
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="program-info reveal">
        <h2>{ar ? 'ما يشمله البرنامج' : "What's Included"}</h2>
        <p>{ar ? program.descriptionAr : program.description}</p>

        <div className="badges-list">
          {program.badges && program.badges.map((badge) => (
            <span key={badge} className="badge">{badge}</span>
          ))}
        </div>

        <Link className="button primary" to="/solutions">
          {t('program.pick')}
        </Link>
        <p className="fineprint">{t('checkout.note')}</p>
      </section>

      {courses.length > 0 && (
        <section>
          <h2>{ar ? 'دورات وأدلة' : 'Courses & guides'}</h2>
          <div className="grid">
            {courses.map(c => <ProductCard key={c.slug} p={c} />)}
          </div>
        </section>
      )}
    </main>
  );
}
