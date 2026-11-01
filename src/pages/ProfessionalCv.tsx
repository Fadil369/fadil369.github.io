import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { replayLedger, short } from '../lib/bpr';
import { ArrowLeft, ArrowUpRight, Download, ExternalLink, Printer, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { ProfileHeader } from '../components/ProfileHeader';
import '../styles/profile.css';

const experience = [
  {
    dates: '2019 — Present', datesAr: '2019 — الآن', role: 'Founder & Chief Executive Officer', roleAr: 'المؤسس والرئيس التنفيذي', org: 'BrainSAIT Ltd · Riyadh',
    points: [
      'Build AI-native healthcare infrastructure spanning provider identity, interoperability, clinical intelligence and revenue-cycle tools.',
      'Develop FHIR R4 / HL7 interoperability and bilingual claims workflows; NPHIES integration is ongoing.',
      'Published brainsait-pyheart and brainsait-pybrain as open-source Python packages.',
    ],
    pointsAr: [
      'بناء بنية صحية أصيلة في الذكاء الاصطناعي تشمل هوية مقدمي الرعاية والتشغيل البيني والذكاء السريري وأدوات دورة الإيرادات.',
      'تطوير التشغيل البيني عبر FHIR R4 وHL7 ومسارات مطالبات ثنائية اللغة؛ والتكامل مع نفيس جارٍ.',
      'نشر حزمتي brainsait-pyheart وbrainsait-pybrain مفتوحتي المصدر عبر Python.',
    ],
  },
  {
    dates: 'Oct 2024 — Present', datesAr: 'أكتوبر 2024 — الآن', role: 'Corporate Physician — RCM & Claims Review', roleAr: 'طبيب مؤسسي — دورة الإيرادات ومراجعة المطالبات', org: 'Al Hayat National Hospital · Saudi Arabia · 6 branches',
    points: [
      'Review rejection output across six branches, contracted payers and Ministry of Health claims.',
      'Analyse denial patterns and communicate corrective findings across clinical, billing and IT teams.',
      'Prepare and oversee corrected-claim resubmission, strengthening the review-to-resubmission cycle.',
    ],
    pointsAr: [
      'مراجعة نتائج الرفض عبر ستة فروع وشركات التأمين المتعاقدة ومطالبات وزارة الصحة.',
      'تحليل أنماط الرفض وإيصال النتائج التصحيحية للفرق السريرية والمالية والتقنية.',
      'إعداد المطالبات المصححة والإشراف على إعادة تقديمها وتحسين دورة المراجعة وإعادة التقديم.',
    ],
  },
  {
    dates: 'Apr 2021 — Sep 2024', datesAr: 'أبريل 2021 — سبتمبر 2024', role: 'Critical Care & ICU Physician', roleAr: 'طبيب عناية حرجة ومركزة', org: 'Anfas Medical Care Hospital · Riyadh',
    points: ['Managed complex, critically ill patients using evidence-based protocols in high-acuity care.'],
    pointsAr: ['إدارة حالات حرجة ومعقدة باستخدام بروتوكولات قائمة على الدليل في بيئات الرعاية عالية الحدة.'],
  },
  {
    dates: 'May 2018 — Jan 2021', datesAr: 'مايو 2018 — يناير 2021', role: 'Neurosurgery Physician', roleAr: 'طبيب جراحة أعصاب', org: 'Aster Sanad Hospital · Riyadh',
    points: ['Contributed to multidisciplinary neurosurgical care, complex procedures and coordinated clinical handovers.'],
    pointsAr: ['المساهمة في رعاية جراحية عصبية متعددة التخصصات وإجراءات معقدة وتسليمات سريرية منسقة.'],
  },
  {
    dates: 'Jun 2016 — Jun 2018', datesAr: 'يونيو 2016 — يونيو 2018', role: 'Emergency Medicine Physician', roleAr: 'طبيب طب طوارئ', org: 'Rafa Medical Center · Riyadh',
    points: ['Delivered rapid assessment and acute care across high-pressure emergency presentations.'],
    pointsAr: ['تقديم تقييم سريع ورعاية حادة لحالات الطوارئ المتنوعة في بيئات عالية الضغط.'],
  },
];

const capabilities = [
  ['Revenue cycle & claims review', 'دورة الإيرادات ومراجعة المطالبات'],
  ['Healthcare quality improvement', 'تحسين جودة الرعاية الصحية'],
  ['FHIR R4 · HL7', 'FHIR R4 · HL7'],
  ['NPHIES · Ongoing integration', 'نفيس · تكامل جارٍ'],
  ['Clinical AI & decision support', 'الذكاء السريري ودعم القرار'],
  ['Provider identity & verification', 'هوية مقدمي الرعاية والتحقق'],
  ['Bilingual product leadership', 'قيادة المنتجات ثنائية اللغة'],
];

const VERIFY_URL = 'https://fadil369.github.io/bpr/verify?spid=SA-PHY-000003';
// Generic words only; institution names stay as written until official Arabic names are supplied.
const AR_WORDS: [RegExp, string][] = [[/Saudi Arabia/g, 'المملكة العربية السعودية'], [/Riyadh/g, 'الرياض'], [/(\d+) branches/g, '$1 فروع']];
const arText = (t: string) => AR_WORDS.reduce((v, [re, to]) => v.replace(re, to), t);

export default function ProfessionalCv() {
  const { ar } = useI18n();
  const [qr, setQr] = useState('');
  const [stamp, setStamp] = useState<{ size: number; hash: string; at: string } | null>(null);
  // The QR carries the transparency-log state at render time, so a printed copy can be checked later.
  useEffect(() => {
    let alive = true;
    const draw = (url: string) => QRCode.toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#11120d', light: '#edf34a' } }).then((q) => alive && setQr(q), () => {});
    replayLedger().then((log) => {
      if (!alive || log.chain.state !== 'ok' || !log.entries.length) return draw(VERIFY_URL);
      const st = { size: log.entries.length, hash: log.head.hash, at: new Date().toISOString() };
      setStamp(st);
      draw(`${VERIFY_URL}&stamp=${st.size}-${st.hash.slice(0, 12)}`);
    }, () => draw(VERIFY_URL));
    return () => { alive = false; };
  }, []);
  const verifyHref = stamp ? `${VERIFY_URL}&stamp=${stamp.size}-${stamp.hash.slice(0, 12)}` : VERIFY_URL;
  usePageMeta({
    title: ar ? 'السيرة الذاتية — د. محمد الفاضل' : 'Professional CV — Dr. Mohamed El Fadil',
    description: ar ? 'السيرة الذاتية المهنية لد. محمد الفاضل: الطب، تحسين الرعاية الصحية، دورة الإيرادات والتقنية الصحية.' : 'The professional CV of Dr. Mohamed El Fadil: medicine, healthcare improvement, revenue cycle and health technology.',
    url: '/cv', type: 'profile',
  });
  return (
    <div className="profile-page cv-page" id="top">
      <div className="cv-browser-only"><ProfileHeader /></div>
      <div className="cv-toolbar cv-browser-only">
        <Link to="/" className="cv-back"><ArrowLeft size={16} />{ar ? 'العودة إلى الملف' : 'Back to profile'}</Link>
        <div>
          <button className="profile-button secondary" onClick={() => window.print()}><Printer size={16} />{ar ? 'طباعة' : 'Print'}</button>
          <a className="profile-button primary" href="/assets/Dr_Mohamed_El_Fadil_CV_2026_Redesigned.pdf" download><Download size={16} />PDF · English</a>
          <a className="profile-button secondary" href="/assets/Dr_Mohamed_El_Fadil_CV_2026_AR.pdf" download lang="ar"><Download size={16} />PDF · العربية</a>
        </div>
      </div>
      <article className="cv-document" dir={ar ? 'rtl' : 'ltr'}>
        <header className="cv-masthead">
          <div className="cv-monogram" aria-hidden="true">EF<span /></div>
          <div className="cv-name">
            <span className="cv-kicker">CURRICULUM VITAE · 2026</span>
            <h1>{ar ? 'د. محمد الفاضل' : 'Dr. Mohamed El Fadil'}</h1>
            <p>{ar ? 'طبيب · مؤسس BrainSAIT · مستشار تحسين ذكي للرعاية الصحية ودورة الإيرادات' : 'Physician · BrainSAIT Founder · RCM, Healthcare Intelligent Improvement Advisor'}</p>
          </div>
          <div className="cv-contact">
            <span>{ar ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}</span>
            <a href="mailto:elfadil369@icloud.com">elfadil369@icloud.com</a>
            <a href="tel:+966543560672" dir="ltr">+966 543 560 672</a>
            <a href="https://fadil369.github.io/">fadil369.github.io</a>
          </div>
        </header>

        <div className="cv-layout">
          <div className="cv-main">
            <section className="cv-summary">
              <h2>{ar ? 'الملخص المهني' : 'Professional profile'}</h2>
              <p>{ar
                ? 'طبيب ومؤسس تقني يجمع بين الخبرة السريرية ومراجعة المطالبات وهندسة الأنظمة الصحية. أحوّل احتياجات الطوارئ والعناية المركزة ودورة الإيرادات إلى أدوات قابلة للتحقق تتمحور حول مقدم الرعاية، مع تركيز على التشغيل البيني والهوية الصحية والتحسين العملي.'
                : 'Physician-founder combining clinical practice, claims review and health-system engineering. I translate emergency, critical-care and revenue-cycle needs into verifiable, provider-centred tools, with a focus on interoperability, healthcare identity and practical improvement.'}</p>
            </section>
            <section className="cv-experience">
              <h2>{ar ? 'الخبرة المهنية' : 'Professional experience'}</h2>
              {experience.map((item) => (
                <article key={item.role}>
                  <div className="cv-role-head"><div><h3>{ar ? item.roleAr : item.role}</h3><strong>{ar ? arText(item.org) : item.org}</strong></div><time>{ar ? item.datesAr : item.dates}</time></div>
                  <ul>{(ar ? item.pointsAr : item.points).map(point => <li key={point}>{point}</li>)}</ul>
                </article>
              ))}
            </section>
          </div>
          <aside className="cv-sidebar">
            <section className="cv-identity">
              <div className="cv-identity-text">
                <ShieldCheck size={22} />
                <span>{ar ? 'معرّف BPR · اعتماد موقّع' : 'BPR provider ID · signed credential'}</span>
                <strong dir="ltr">SA-PHY-000003</strong>
                <a href={verifyHref} target="_blank" rel="noreferrer">{ar ? 'امسح للتحقق المباشر' : 'Scan to check it live'} <ArrowUpRight size={12} /></a>
              </div>
              {qr && <a className="cv-identity-qr" href={verifyHref} target="_blank" rel="noreferrer" aria-label={ar ? 'رمز QR للتحقق من اعتماد BPR' : 'QR code: verify the BPR credential'} dangerouslySetInnerHTML={{ __html: qr }} />}
              {stamp && <small className="cv-identity-stamp" dir="ltr">{ar ? 'ختم السجل' : 'Log stamp'} #{stamp.size} · {short(stamp.hash, 8)} · {stamp.at.slice(0, 10)}</small>}
              <small className="cv-identity-pending">{ar ? 'الترخيص والمؤهلات: التكامل مع الهيئة السعودية للتخصصات الصحية جارٍ' : 'Licence & qualifications: SCFHS credential integration ongoing'}</small>
            </section>
            <section>
              <h2>{ar ? 'الكفاءات الأساسية' : 'Core expertise'}</h2>
              <ul className="cv-capabilities">{capabilities.map(([en, arText]) => <li key={en}>{ar ? arText : en}</li>)}</ul>
            </section>
            <section>
              <h2>{ar ? 'التعليم والتطوير' : 'Education & development'}</h2>
              <div className="cv-education"><strong>{ar ? 'بكالوريوس الطب والجراحة (MBBS)' : 'Bachelor of Medicine & Surgery (MBBS)'}</strong><span>International University of Africa</span></div>
              <div className="cv-education"><strong>{ar ? 'برنامج تطوير مستشاري التحسين' : 'Improvement Advisor Professional Development Program'}</strong><span>Institute for Healthcare Improvement · 2022 — {ar ? 'الآن' : 'Present'}</span></div>
            </section>
            <section>
              <h2>{ar ? 'شهادات مختارة' : 'Selected certifications'}</h2>
              <div className="cv-education"><strong>Revenue Cycle Management in Healthcare</strong><span>Healthcare Financial Management Association</span></div>
              <div className="cv-education"><strong>AI Integration in Healthcare</strong><span>World Health Organization</span></div>
              <div className="cv-education"><strong>FHIR / HL7 Healthcare Interoperability</strong><span>Healthcare Standards Implementation</span></div>
            </section>
            <section>
              <h2>{ar ? 'اللغات' : 'Languages'}</h2>
              <div className="cv-language"><span>{ar ? 'العربية' : 'Arabic'}</span><strong>{ar ? 'اللغة الأم' : 'Native'}</strong></div>
              <div className="cv-language"><span>{ar ? 'الإنجليزية' : 'English'}</span><strong>{ar ? 'مهنية' : 'Professional'}</strong></div>
            </section>
            <section>
              <h2>{ar ? 'بحث وأدوات مفتوحة' : 'Research & open tools'}</h2>
              <a className="cv-side-link" href="https://doi.org/10.5281/zenodo.23606022" target="_blank" rel="noreferrer">The Clinical Commons <ExternalLink size={11} /></a>
              <a className="cv-side-link" href="https://orcid.org/0009-0003-7485-3575" target="_blank" rel="noreferrer">ORCID · 0009-0003-7485-3575 <ExternalLink size={11} /></a>
              <a className="cv-side-link" href="https://pypi.org/project/brainsait-pyheart/" target="_blank" rel="noreferrer">brainsait-pyheart <ExternalLink size={11} /></a>
              <a className="cv-side-link" href="https://pypi.org/project/brainsait-pybrain/" target="_blank" rel="noreferrer">brainsait-pybrain <ExternalLink size={11} /></a>
            </section>
          </aside>
        </div>
        <footer className="cv-document-footer"><span>DR. MOHAMED EL FADIL · BPR / BrainSAIT</span><a href="https://fadil369.github.io/">fadil369.github.io</a></footer>
      </article>
      <div className="cv-source-note cv-browser-only">{ar ? 'نسخة محدثة من السيرة الذاتية الأصلية، مع الحفاظ على المصدر الأصلي دون تغيير.' : 'A redesigned edition of the original CV. The original source PDF remains preserved.'}</div>
    </div>
  );
}
