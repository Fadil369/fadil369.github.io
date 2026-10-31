import { ArrowDownToLine, ArrowUpRight, Check, Download, Printer, QrCode, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { ProfileHeader } from './Home';
import '../styles/profile.css';

export default function BusinessCard() {
  const { ar } = useI18n();
  usePageMeta({
    title: ar ? 'بطاقة الأعمال — د. محمد الفاضل' : 'Business Card — Dr. Mohamed El Fadil',
    description: ar ? 'بطاقة أعمال سوداء وليمونية برمز QR على شكل دماغ يوجه إلى الملف المهني.' : 'A black and lemon business card with a brain-framed QR code linking to the professional profile.',
    url: '/card', type: 'website',
  });
  return (
    <div className="profile-page card-page" id="top">
      <ProfileHeader />
      <main className="card-studio">
        <header className="card-studio-head">
          <div>
            <div className="profile-eyebrow"><span />{ar ? 'هوية ملموسة · إصدار 01' : 'Physical identity · Edition 01'}</div>
            <h1>{ar ? 'فكرة تُحمل. ملف يُفتح.' : 'An idea in hand. A profile one scan away.'}</h1>
          </div>
          <p>{ar
            ? 'بطاقة بوجهين بالأسود والليموني. يحيط شكل الدماغ برمز QR أصلي دون تشويه وحداته، ويربط مباشرة بالملف المهني.'
            : 'A two-sided black-and-lemon card. The brain frame surrounds an undistorted QR code that opens the professional profile directly.'}</p>
        </header>

        <div className="card-studio-actions">
          <button className="profile-button primary" onClick={() => window.print()}><Printer size={17} />{ar ? 'اطبع الوجهين الآن' : 'Print both sides'}</button>
          <a className="profile-button secondary" href="/assets/card/dr-mohamed-el-fadil-print.pdf" download><Download size={17} />{ar ? 'تنزيل PDF للطباعة' : 'Download print PDF'}</a>
          <span>{ar ? 'مقاس الطباعة 3.5 × 2 بوصة · صفحتان' : '3.5 × 2 inches · two pages'}</span>
        </div>

        <section className="card-showcase" aria-label={ar ? 'معاينة بطاقة الأعمال' : 'Business card preview'}>
          <article className="card-preview-item">
            <div className="card-preview-meta"><span>01 / FRONT</span><strong>{ar ? 'امسح للتعريف' : 'Scan to connect'}</strong></div>
            <a href="https://fadil369.github.io/" target="_blank" rel="noreferrer" aria-label="Open Dr. Mohamed El Fadil's profile">
              <img src="/assets/card/dr-mohamed-el-fadil-front.svg" alt={ar ? 'وجه البطاقة: رمز QR داخل إطار على شكل دماغ' : 'Front of card: brain-framed QR code and Dr. Mohamed El Fadil identity'} />
            </a>
          </article>
          <article className="card-preview-item">
            <div className="card-preview-meta"><span>02 / BACK</span><strong>{ar ? 'الخبرة بوضوح' : 'Expertise, clearly stated'}</strong></div>
            <img src="/assets/card/dr-mohamed-el-fadil-back.svg" alt={ar ? 'ظهر البطاقة: د. محمد الفاضل، مستشار تحسين ذكي للرعاية الصحية ودورة الإيرادات' : 'Back of card: Dr. Mohamed El Fadil, RCM, Healthcare Intelligent Improvement Advisor'} />
          </article>
        </section>

        <section className="card-downloads">
          <div className="card-download-intro"><QrCode size={25} /><div><h2>{ar ? 'جاهزة للعرض والطباعة' : 'Ready for screen and press'}</h2><p>{ar ? 'مقاس قياسي 3.5 × 2 بوصة. ملفات SVG متجهة، PNG بدقة 300 نقطة/بوصة، وPDF بوجهين.' : 'Standard 3.5 × 2 inch format. Vector SVG, 300 DPI PNG, and a two-page print PDF.'}</p></div></div>
          <div className="card-download-grid">
            <a href="/assets/card/dr-mohamed-el-fadil-print.pdf" download><Printer size={20} /><span><strong>{ar ? 'ملف الطباعة' : 'Print-ready card'}</strong><small>PDF · 2 pages</small></span><ArrowDownToLine size={17} /></a>
            <a href="/assets/card/dr-mohamed-el-fadil-front.svg" download><Download size={20} /><span><strong>{ar ? 'الوجه الأمامي' : 'Front artwork'}</strong><small>SVG · Vector</small></span><ArrowDownToLine size={17} /></a>
            <a href="/assets/card/dr-mohamed-el-fadil-back.svg" download><Download size={20} /><span><strong>{ar ? 'الوجه الخلفي' : 'Back artwork'}</strong><small>SVG · Vector</small></span><ArrowDownToLine size={17} /></a>
            <a href="/assets/card/dr-mohamed-el-fadil-front.png" download><Download size={20} /><span><strong>{ar ? 'صورة الوجه' : 'Front image'}</strong><small>PNG · 1050 × 600</small></span><ArrowDownToLine size={17} /></a>
            <a href="/assets/card/dr-mohamed-el-fadil-back.png" download><Download size={20} /><span><strong>{ar ? 'صورة الظهر' : 'Back image'}</strong><small>PNG · 1050 × 600</small></span><ArrowDownToLine size={17} /></a>
          </div>
        </section>

        <section className="card-specs">
          <div><Check size={16} /><span>{ar ? 'وجهة الرمز' : 'QR destination'}</span><a href="https://fadil369.github.io/">fadil369.github.io <ArrowUpRight size={13} /></a></div>
          <div><RotateCcw size={16} /><span>{ar ? 'مساحة هادئة محفوظة' : 'Quiet zone preserved'}</span><strong>{ar ? 'وحدات QR غير مشوهة' : 'Undistorted QR modules'}</strong></div>
          <div><Check size={16} /><span>{ar ? 'هوية موثقة' : 'Verified identity'}</span><strong dir="ltr">SA-PHY-000003</strong></div>
        </section>
        <div className="card-back-link"><Link to="/" className="profile-text-link">{ar ? 'العودة إلى الملف المهني' : 'Return to professional profile'}<ArrowUpRight size={15} /></Link></div>
      </main>
    </div>
  );
}
