import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Brain, Calculator, Check, Cpu, Server, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, Loading, SourceBadge, fmtDate, Failed } from '../../components/BprKit';
import { OpsStatus, useLoad } from '../../lib/bpr';
import {
  PHI_LABELS,
  scanForIdentifiers,
  calcEgfrCkdEpi2021,
  calcCha2ds2Vasc,
  calcMeldNa,
  calcWellsPe,
} from '../../lib/bosSandbox';

function acpServiceUrl() {
  try {
    const url = new URL(import.meta.env.VITE_ACP_SERVICE_URL);
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash ? url.href : undefined;
  } catch {
    return undefined;
  }
}

const GATEWAY_MODELS = [
  'claude-fable-5', 'claude-haiku-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4-7', 'claude-opus-4-8', 'claude-opus-5', 'claude-sonnet-4-6', 'claude-sonnet-5',
  'gpt-5.5', 'gpt-5.5-pro', 'gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra',
  'llama-3.1-8b-instruct', 'llama-3.3-70b-instruct-fp8-fast',
];

const PHI_PRESETS = [
  {
    id: 'clean',
    enLabel: 'Clean clinical query (passes)',
    arLabel: 'سؤال سريري مجرد (يمر بأمان)',
    enText: '64-year-old male with stage 3b CKD and atrial fibrillation — anticoagulation dose considerations?',
    arText: 'رجل في الرابعة والستين يعاني من قصور كلوي من الدرجة 3b ورجفان أذيني — ما اعتبارات جرعة مضاد التخثر؟',
  },
  {
    id: 'blocked_en',
    enLabel: 'Sample with EN identifiers (blocked)',
    arLabel: 'مثال بمعرّفات إنجليزية (يُحجب)',
    enText: 'Patient Khalid MRN 889231 phone +966 54 356 0672 presenting with acute dyspnea.',
    arText: 'Patient Khalid MRN 889231 phone +966 54 356 0672 presenting with acute dyspnea.',
  },
  {
    id: 'blocked_ar',
    enLabel: 'Sample with AR identifiers (blocked)',
    arLabel: 'مثال بمعرّفات عربية (يُحجب)',
    enText: 'المريض محمد رقم الملف ٩٩٨٢١ جوال ٠٥٤٣٥٦٠٦٧٢ يعاني من ألم صدري.',
    arText: 'المريض محمد رقم الملف ٩٩٨٢١ جوال ٠٥٤٣٥٦٠٦٧٢ يعاني من ألم صدري.',
  },
];

function BosInteractiveSandbox({ ar }: { ar: boolean }) {
  const [phiInput, setPhiInput] = useState(
    ar ? PHI_PRESETS[0].arText : PHI_PRESETS[0].enText,
  );
  const findings = scanForIdentifiers(phiInput);

  const [activeCalc, setActiveCalc] = useState<'egfr' | 'chads' | 'meld' | 'wells'>('egfr');

  // eGFR state
  const [egfrAge, setEgfrAge] = useState(62);
  const [egfrSex, setEgfrSex] = useState<'male' | 'female'>('male');
  const [egfrScr, setEgfrScr] = useState(1.4);
  const [egfrUnit, setEgfrUnit] = useState<'mg/dL' | 'umol/L'>('mg/dL');

  // CHA2DS2-VASc state
  const [chadsAge, setChadsAge] = useState(72);
  const [chadsSex, setChadsSex] = useState<'male' | 'female'>('male');
  const [chadsChf, setChadsChf] = useState(false);
  const [chadsHtn, setChadsHtn] = useState(true);
  const [chadsDm, setChadsDm] = useState(true);
  const [chadsStroke, setChadsStroke] = useState(false);
  const [chadsVasc, setChadsVasc] = useState(false);

  // MELD-Na state
  const [meldScr, setMeldScr] = useState(1.8);
  const [meldBili, setMeldBili] = useState(2.4);
  const [meldInr, setMeldInr] = useState(1.6);
  const [meldNa, setMeldNa] = useState(131);
  const [meldDialysis, setMeldDialysis] = useState(false);

  // Wells PE state
  const [wellsDvt, setWellsDvt] = useState(false);
  const [wellsPeLikely, setWellsPeLikely] = useState(true);
  const [wellsHr, setWellsHr] = useState(true);
  const [wellsImmob, setWellsImmob] = useState(false);
  const [wellsPrev, setWellsPrev] = useState(false);
  const [wellsHemop, setWellsHemop] = useState(false);
  const [wellsMalig, setWellsMalig] = useState(false);

  const calcResult =
    activeCalc === 'egfr'
      ? calcEgfrCkdEpi2021({ age: egfrAge, sex: egfrSex, creatinine: egfrScr, unit: egfrUnit })
      : activeCalc === 'chads'
        ? calcCha2ds2Vasc({
            age: chadsAge,
            sex: chadsSex,
            chf: chadsChf,
            hypertension: chadsHtn,
            diabetes: chadsDm,
            strokeTia: chadsStroke,
            vascular: chadsVasc,
          })
        : activeCalc === 'meld'
          ? calcMeldNa({
              creatinineMgDl: meldScr,
              bilirubinMgDl: meldBili,
              inr: meldInr,
              sodiumMmolL: meldNa,
              dialysisTwiceWeek: meldDialysis,
            })
          : calcWellsPe({
              dvtSigns: wellsDvt,
              peMostLikely: wellsPeLikely,
              hrOver100: wellsHr,
              immobilisationOrSurgery: wellsImmob,
              previousPeDvt: wellsPrev,
              hemoptysis: wellsHemop,
              malignancy: wellsMalig,
            });

  return (
    <section className="bpr-split" aria-label={ar ? 'مختبر BOS التفاعلي' : 'BOS interactive sandbox'}>
      <div className="bpr-panel">
        <div className="bpr-panel-head">
          <h2>
            {findings.length === 0 ? <ShieldCheck size={19} /> : <ShieldAlert size={19} />}
            {ar ? 'جدار حماية البيانات الشخصية (PHI Firewall) — فحص مباشر' : 'BOS Identifier Firewall — Live On-Device Tester'}
          </h2>
          <span className={`ws-status ${findings.length === 0 ? 'live' : 'awaiting'}`}>
            {findings.length === 0
              ? ar ? 'آمن للإرسال' : 'Pass · Zero identifiers'
              : ar ? `حُجب (${findings.length})` : `Blocked (${findings.length})`}
          </span>
        </div>
        <p className="bpr-note">
          {ar
            ? 'يعمل جدار الحماية محليًا في متصفحك بنفس القواعد الحتمية في Doctor OS قبل أي استدعاء لنموذج. جرّب الأمثلة الوهمية أدناه؛ لا يُحفظ أي نص ولا يُرسل عبر الشبكة.'
            : 'Runs locally in your browser using the exact deterministic rules from Doctor OS before any model call. Try the synthetic presets below; nothing typed here is stored or sent over the network.'}
        </p>
        <div className="bpr-chips" style={{ marginTop: 12 }}>
          {PHI_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPhiInput(ar ? p.arText : p.enText)}
            >
              {ar ? p.arLabel : p.enLabel}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="bos-phi-input">
          {ar ? 'نص الفحص التجريبي (بيانات اصطناعية فقط)' : 'Synthetic text to scan for identifiers'}
        </label>
        <textarea
          id="bos-phi-input"
          rows={3}
          value={phiInput}
          onChange={(e) => setPhiInput(e.target.value)}
          placeholder={ar ? 'اكتب نصًا تجريبيًا لفحص المعرّفات…' : 'Type synthetic text to test identifier detection…'}
        />
        <div role="status" aria-live="polite" className={`bpr-verdict ${findings.length === 0 ? 'ok' : 'fail'}`} style={{ padding: '14px 18px' }}>
          {findings.length === 0 ? (
            <>
              <Check size={18} />
              <span>
                {ar
                  ? 'لم يُعثر على أسماء مرضى أو أرقام هوية أو ملفات طبية أو هواتف. يسمح جدار الحماية بمرور السؤال.'
                  : 'No patient names, national IDs, MRNs, phones or emails detected. Prompt is cleared by the firewall.'}
              </span>
            </>
          ) : (
            <div>
              <strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
                {ar ? '🛡️ أُوقف النص قبل الوصول إلى أي نموذج:' : '🛡️ Stopped before reaching any model:'}
              </strong>
              <div className="bpr-chips">
                {findings.map((f) => (
                  <span key={f} className="bpr-source">
                    {PHI_LABELS[f][ar ? 1 : 0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bpr-panel">
        <div className="bpr-panel-head">
          <h2>
            <Calculator size={19} />
            {ar ? 'الحاسبات السريرية الحتمية (دون حسابات نموذج)' : 'Exact Clinical Calculators (Zero-LLM Math)'}
          </h2>
          <span className="ws-status live">{ar ? 'حساب حتمي' : 'Deterministic'}</span>
        </div>
        <p className="bpr-note">
          {ar
            ? 'في BOS، لا تُجري النماذج اللغوية العمليات الحسابية الطبية أبدًا. اختر معادلة سريرية لمعاينة الحساب الحتمي الفوري:'
            : 'In BOS, language models never perform clinical arithmetic. Select a calculator below to inspect deterministic execution:'}
        </p>
        <div className="bpr-chips" role="tablist" aria-label={ar ? 'اختر حاسبة سريرية' : 'Select clinical calculator'} style={{ marginTop: 12, marginBottom: 14 }}>
          {[
            ['egfr', 'CKD-EPI 2021 eGFR', 'CKD-EPI 2021 eGFR'],
            ['chads', 'CHA₂DS₂-VASc', 'CHA₂DS₂-VASc'],
            ['meld', 'MELD-Na (UNOS)', 'MELD-Na (UNOS)'],
            ['wells', 'Wells PE', 'Wells PE'],
          ].map(([key, en, a]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeCalc === key}
              aria-pressed={activeCalc === key}
              onClick={() => setActiveCalc(key as 'egfr' | 'chads' | 'meld' | 'wells')}
            >
              {ar ? a : en}
            </button>
          ))}
        </div>

        {activeCalc === 'egfr' && (
          <div className="clinic-form-grid" style={{ margin: '12px 0' }}>
            <label>
              {ar ? 'العمر (سنة)' : 'Age (years)'}
              <input type="number" min={18} max={120} value={egfrAge} onChange={(e) => setEgfrAge(Number(e.target.value))} />
            </label>
            <label>
              {ar ? 'الجنس' : 'Sex'}
              <select value={egfrSex} onChange={(e) => setEgfrSex(e.target.value as 'male' | 'female')}>
                <option value="male">{ar ? 'ذكر' : 'Male'}</option>
                <option value="female">{ar ? 'أنثى' : 'Female'}</option>
              </select>
            </label>
            <label>
              {ar ? 'الكرياتينين' : 'Creatinine'}
              <input type="number" step="0.1" min={0.1} max={2500} value={egfrScr} onChange={(e) => setEgfrScr(Number(e.target.value))} />
            </label>
            <label>
              {ar ? 'الوحدة' : 'Unit'}
              <select value={egfrUnit} onChange={(e) => setEgfrUnit(e.target.value as 'mg/dL' | 'umol/L')}>
                <option value="mg/dL">mg/dL</option>
                <option value="umol/L">µmol/L</option>
              </select>
            </label>
          </div>
        )}

        {activeCalc === 'chads' && (
          <div className="clinic-form-grid" style={{ margin: '12px 0' }}>
            <label>
              {ar ? 'العمر (سنة)' : 'Age (years)'}
              <input type="number" min={18} max={120} value={chadsAge} onChange={(e) => setChadsAge(Number(e.target.value))} />
            </label>
            <label>
              {ar ? 'الجنس' : 'Sex'}
              <select value={chadsSex} onChange={(e) => setChadsSex(e.target.value as 'male' | 'female')}>
                <option value="male">{ar ? 'ذكر' : 'Male'}</option>
                <option value="female">{ar ? 'أنثى' : 'Female'}</option>
              </select>
            </label>
            <label className="bpr-toggle"><input type="checkbox" checked={chadsChf} onChange={(e) => setChadsChf(e.target.checked)} /><span>{ar ? 'قصور القلب (CHF)' : 'Heart failure (CHF)'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={chadsHtn} onChange={(e) => setChadsHtn(e.target.checked)} /><span>{ar ? 'ارتفاع ضغط الدم' : 'Hypertension'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={chadsDm} onChange={(e) => setChadsDm(e.target.checked)} /><span>{ar ? 'السكري' : 'Diabetes'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={chadsStroke} onChange={(e) => setChadsStroke(e.target.checked)} /><span>{ar ? 'سكتة دماغية / TIA سابقة (+2)' : 'Prior Stroke / TIA (+2)'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={chadsVasc} onChange={(e) => setChadsVasc(e.target.checked)} /><span>{ar ? 'مرض وعائي' : 'Vascular disease'}</span></label>
          </div>
        )}

        {activeCalc === 'meld' && (
          <div className="clinic-form-grid" style={{ margin: '12px 0' }}>
            <label>
              {ar ? 'الكرياتينين (mg/dL)' : 'Creatinine (mg/dL)'}
              <input type="number" step="0.1" min={0.1} max={15} value={meldScr} onChange={(e) => setMeldScr(Number(e.target.value))} />
            </label>
            <label>
              {ar ? 'البيليروبين (mg/dL)' : 'Bilirubin (mg/dL)'}
              <input type="number" step="0.1" min={0.1} max={50} value={meldBili} onChange={(e) => setMeldBili(Number(e.target.value))} />
            </label>
            <label>
              INR
              <input type="number" step="0.1" min={0.5} max={15} value={meldInr} onChange={(e) => setMeldInr(Number(e.target.value))} />
            </label>
            <label>
              {ar ? 'الصوديوم (mmol/L)' : 'Sodium (mmol/L)'}
              <input type="number" min={110} max={165} value={meldNa} onChange={(e) => setMeldNa(Number(e.target.value))} />
            </label>
            <label className="bpr-toggle" style={{ gridColumn: '1 / -1' }}>
              <input type="checkbox" checked={meldDialysis} onChange={(e) => setMeldDialysis(e.target.checked)} />
              <span>{ar ? 'غسيل كلوي مرتين على الأقل في الأسبوع الماضي' : 'Dialysis ≥2 times in the past week'}</span>
            </label>
          </div>
        )}

        {activeCalc === 'wells' && (
          <div className="clinic-form-grid" style={{ margin: '12px 0' }}>
            <label className="bpr-toggle"><input type="checkbox" checked={wellsDvt} onChange={(e) => setWellsDvt(e.target.checked)} /><span>{ar ? 'علامات سريرية لجلطة الأوردة العميقة (+3)' : 'Clinical signs of DVT (+3)'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={wellsPeLikely} onChange={(e) => setWellsPeLikely(e.target.checked)} /><span>{ar ? 'الانصمام الرئوي هو التشخيص الأرجح (+3)' : 'PE is #1 diagnosis or equally likely (+3)'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={wellsHr} onChange={(e) => setWellsHr(e.target.checked)} /><span>{ar ? 'النبض > 100/دقيقة (+1.5)' : 'Heart rate > 100 bpm (+1.5)'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={wellsImmob} onChange={(e) => setWellsImmob(e.target.checked)} /><span>{ar ? 'تثبيت الحركة أو جراحة حديثة (+1.5)' : 'Immobilisation ≥3d or surgery <4w (+1.5)'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={wellsPrev} onChange={(e) => setWellsPrev(e.target.checked)} /><span>{ar ? 'انصمام رئوي أو DVT سابق (+1.5)' : 'Previous PE or DVT (+1.5)'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={wellsHemop} onChange={(e) => setWellsHemop(e.target.checked)} /><span>{ar ? 'نفث دموي (+1)' : 'Hemoptysis (+1)'}</span></label>
            <label className="bpr-toggle"><input type="checkbox" checked={wellsMalig} onChange={(e) => setWellsMalig(e.target.checked)} /><span>{ar ? 'ورم خبيث نشط (+1)' : 'Active malignancy (+1)'}</span></label>
          </div>
        )}

        <div className="bpr-verdict ok" role="region" aria-label={ar ? 'نتيجة الحاسبة' : 'Calculator output'} style={{ padding: '14px 18px' }}>
          <strong dir="ltr">{calcResult.result}</strong>
          <span>{calcResult.unit}</span>
          <small style={{ flexBasis: '100%' }}>
            {ar ? calcResult.interpretationAr : calcResult.interpretationEn} · <code dir="ltr">{calcResult.formula}</code>
          </small>
        </div>
      </div>
    </section>
  );
}

export default function AI() {
  const { ar } = useI18n();
  const status = useLoad<OpsStatus>('/api/status', 'status.json');
  usePageMeta({
    title: ar ? 'BOS والذكاء الاصطناعي وبوابة النماذج — BPR' : 'BOS, AI and model gateway — BPR',
    description: ar ? 'نظام BrainSAIT وDoctor OS (BOS): جدار حماية PHI التفاعلي، حاسبات سريرية حتمية، وفحوص خدمة المساعد.' : 'BOS (BrainSAIT & Doctor OS): interactive PHI firewall, deterministic clinical calculators, and copilot service checks.',
    url: '/bpr/ai', type: 'website',
  });
  const d = status.state === 'ready' ? status.data : null;
  const checks = d?.operations?.checks;
  const source = status.state === 'ready' ? status.source : 'snapshot';
  const acpUrl = acpServiceUrl();
  return <BprLayout kicker={ar ? 'BOS · الذكاء الاصطناعي' : 'BOS · AI gateway'}
    title={ar ? 'BOS ونماذج موصولة بضوابط واضحة.' : 'BOS & models, connected with clear boundaries.'}
    lead={ar ? 'تعرض هذه الصفحة مختبر BOS التفاعلي (جدار حماية البيانات الشخصية والحاسبات السريرية الحتمية محليًا على جهازك) إلى جانب فحوص خدمة المساعد ولقطة لمعرّفات النماذج الخاصة. الموقع العام لا يرسل أسئلة إلى النماذج.' : 'This page provides an interactive on-device BOS sandbox (deterministic PHI firewall and exact clinical calculators) alongside copilot service checks and the private model catalog snapshot. The public site sends no prompts to models.'}
    actions={<><Link className="profile-button primary" to="/bpr/join">{ar ? 'مسار الملف الموثق' : 'Authenticated profile flow'}</Link><a className="profile-button" href="https://registry.brainsait.de/certs.php" target="_blank" rel="noreferrer">{ar ? 'صياغة الملف بمساعدة الذكاء' : 'Assisted profile drafting'} <ArrowUpRight size={15}/></a></>}>
    {status.state === 'loading' && <Loading/>}{status.state === 'error' && <Failed/>}
    <section className="bpr-panel"><h2><Brain size={19}/> {ar ? 'BOS — نظام BrainSAIT وDoctor OS (بنية المساعد والمصنع الذكي)' : 'BOS — BrainSAIT & Doctor OS (Clinical Copilot & Tiny Software Factory)'}</h2>
      <p>{ar
        ? 'تمثل BOS الركيزة التشغيلية الثالثة بجانب BPR وClinicFlow: محرك استدلال سريري بخصوصية أولًا للأطباء في المملكة العربية السعودية، يعمل مع مصنع البرمجيات الذكي (Level-3 Tiny Software Factory) وفحص الاستقبال الصوتي الآلي. جميع مكونات BOS تفصل بين الواجهة العامة الآمنة (بلا بيانات مرضى) وبين مسارات التشغيل الخاصة.'
        : 'BOS is the third flagship pillar alongside BPR and ClinicFlow: a privacy-first clinical reasoning engine for physicians in Saudi Arabia paired with the Level-3 Tiny Software Factory and automated voice QA. All BOS components enforce a strict boundary between this zero-PHI public site and private authenticated runtimes.'}</p>
      <div className="bpr-chips">
        <span className="bpr-source">{ar ? 'جدار حماية PHI الحتمي (EN + AR)' : 'Deterministic PHI firewall (EN + AR)'}</span>
        <span className="bpr-source">{ar ? '15 حاسبة سريرية دقيقة (دون حسابات نموذج)' : '15 exact clinical calculators (no LLM math)'}</span>
        <span className="bpr-source">{ar ? 'تحقق من المراجع عبر PubMed وClinicalTrials.gov وopenFDA' : 'Citation verification via PubMed, ClinicalTrials.gov & openFDA'}</span>
        <span className="bpr-source">{ar ? 'خزنة ذاكرة مشفرة لكل طبيب وسجل تدقيق متسلسل' : 'Per-doctor encrypted vault & hash-chained audit'}</span>
        <span className="bpr-source">{ar ? 'مراجع SFDA وSCFHS وMOH وCHI وSDAIA ونفيس' : 'SFDA, SCFHS, MOH, CHI, SDAIA & NPHIES references'}</span>
      </div>
      <p className="bpr-note">{ar
        ? 'تكامل ضمان الجودة الصوتي: ترتبط منظومة Patient Voice Bot QA (المتاحة على GitHub) بمسار الاستقبال لفحص 15 سيناريو للمرضى عبر LiveKit SIP وDeepgram وOpenAI.'
        : 'Voice QA integration: Patient Voice Bot QA runs 15 simulated patient call scenarios via LiveKit SIP, Deepgram and OpenAI to audit medical receptionist flows before clinical rollout.'} <a className="profile-text-link" href="https://github.com/Fadil369/patient-voice-bot-qa" target="_blank" rel="noreferrer">github.com/Fadil369/patient-voice-bot-qa <ArrowUpRight size={13}/></a></p>
    </section>
    <BosInteractiveSandbox ar={ar} />
    <section className="bpr-panel"><h2>{ar ? 'مساعد ACP للتدريب' : 'Clinical ACP training assistant'}</h2>
      <p>{ar ? 'للمواد الخيالية أو العامة فقط، دون أي بيانات مرضى أو مشاركين. المخرجات مسودات تتطلب مراجعة مختص.' : 'For fictional or public material only; never submit patient or participant data. Outputs are drafts requiring qualified review.'}</p>
      {acpUrl ? <a className="profile-text-link" href={acpUrl}>{ar ? 'فتح المساعد وتسجيل الدخول عبر GitHub' : 'Open the assistant and sign in with GitHub'} <ArrowUpRight size={13}/></a>
        : <p className="bpr-note">{ar ? 'الخدمة غير مهيأة على هذا الموقع.' : 'The service is not configured on this site.'}</p>}
    </section>
    {d && <section className="bpr-panel"><div className="bpr-panel-head"><h2><Brain size={19}/> {ar ? 'فحوص الخدمة' : 'Service checks'}</h2><SourceBadge source={source}/></div>
      <ul className="bpr-status-grid" dir="ltr">
        {['copilot_ai','copilot_briefs'].map((k) => <li key={k} className={checks?.[k] === 'ok' ? 'ok' : 'fail'}><span>{k === 'copilot_ai' ? 'Copilot AI' : 'Copilot briefs'}</span><strong>{checks?.[k] || '—'}</strong></li>)}
      </ul><p className="bpr-note">{ar ? 'وقت فحص المراقبة: ' : 'Monitoring check time: '}<span className="bpr-mono">{fmtDate(d.operations?.checked_at || d.checked_at, ar, true)}</span>. {ar ? 'هذه فحوص خدمة ولا تثبت نجاح الاستدلال لكل نموذج.' : 'These are service checks; they do not prove inference for each model.'}</p>
    </section>}
    <section className="bpr-panel"><h2><Cpu size={19}/> {ar ? 'لقطة بوابة النماذج الخاصة' : 'Private gateway model snapshot'}</h2><p>{ar ? 'معرّفات شوهدت في استجابة فهرس النماذج بتاريخ 3 نوفمبر 2026. الفهرس لا يثبت توفر النموذج أو نجاح الاستدلال.' : 'IDs observed in a private model-catalog response on 3 November 2026. A catalog does not prove model availability or successful inference.'}</p><div className="bpr-chips">{GATEWAY_MODELS.map(x=><span className="bpr-source" key={x}>{x}</span>)}</div><p className="bpr-note">{ar ? 'الاستجابة خاصة بالشبكة ولا يمكن للمتصفح العام الوصول إليها بسبب ضوابط الشبكة وCORS. لا توجد مفاتيح نماذج في هذا الموقع.' : 'The gateway is private-network only and does not allow browser CORS from this site. No model keys are present in this website.'}</p></section>
    <section className="bpr-split"><div className="bpr-panel"><h2><Server size={19}/> {ar ? 'المسار المحلي' : 'Local model route'}</h2><p>{ar ? 'رُصد نموذج Qwen3-VL-4B-Instruct-Q4_K_M.gguf على مضيف النماذج المحلي. هذه معلومة جرد، وليست اختبار استدلال.' : 'Qwen3-VL-4B-Instruct-Q4_K_M.gguf was observed on the local model host. This is inventory evidence, not an inference test.'}</p></div><div className="bpr-panel"><h2>{ar ? 'استخدام الذكاء الحالي' : 'Current AI use'}</h2><p>{ar ? 'صياغة الملف المساعدة متاحة ضمن جلسة ORCID الموثقة في السجل؛ النتيجة مسودة يراجعها مقدم الرعاية قبل الحفظ. استقبال العيادة التجريبي يستخدم قواعد محلية وإجابات معتمدة دون استدعاء نموذج.' : 'Assisted profile drafting is available inside the registry’s authenticated ORCID flow; the result remains a draft for provider review before saving. The clinic pilot uses local approved-answer rules and makes no model calls.'}</p><Link className="profile-text-link" to="/bpr/clinic">{ar ? 'تفاصيل تجربة الاستقبال' : 'Clinic pilot details'}</Link></div></section>
  </BprLayout>;
}
