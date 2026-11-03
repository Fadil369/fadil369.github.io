import { Link } from 'react-router-dom';
import { ArrowUpRight, Brain, Cpu, Server } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, Loading, SourceBadge, fmtDate, Failed } from '../../components/BprKit';
import { OpsStatus, useLoad } from '../../lib/bpr';

const GATEWAY_MODELS = [
  'claude-fable-5', 'claude-haiku-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4-7', 'claude-opus-4-8', 'claude-opus-5', 'claude-sonnet-4-6', 'claude-sonnet-5',
  'gpt-5.5', 'gpt-5.5-pro', 'gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra',
  'llama-3.1-8b-instruct', 'llama-3.3-70b-instruct-fp8-fast',
];

export default function AI() {
  const { ar } = useI18n();
  const status = useLoad<OpsStatus>('/api/status', 'status.json');
  usePageMeta({
    title: ar ? 'الذكاء الاصطناعي وبوابة النماذج — BPR' : 'AI and model gateway — BPR',
    description: ar ? 'حالة فحوص المساعد، ولقطة موثقة لمعرّفات النماذج وحدود الاتصال.' : 'Copilot service checks, a dated model ID snapshot, and clear connection boundaries.',
    url: '/bpr/ai', type: 'website',
  });
  const d = status.state === 'ready' ? status.data : null;
  const checks = d?.operations?.checks;
  const source = status.state === 'ready' ? status.source : 'snapshot';
  return <BprLayout kicker={ar ? 'الذكاء الاصطناعي' : 'AI gateway'}
    title={ar ? 'نماذج موصولة بضوابط واضحة.' : 'Models, connected with clear boundaries.'}
    lead={ar ? 'هذه الصفحة تعرض فحوص خدمة المساعد ولقطة لمعرّفات رُصدت عبر الشبكة الخاصة. الموقع العام لا يرسل أسئلة إلى النماذج.' : 'This page shows copilot service checks and a snapshot of model IDs observed on the private network. The public site sends no prompts to models.'}
    actions={<><Link className="profile-button primary" to="/bpr/join">{ar ? 'مسار الملف الموثق' : 'Authenticated profile flow'}</Link><a className="profile-button" href="https://registry.brainsait.de/certs.php" target="_blank" rel="noreferrer">{ar ? 'صياغة الملف بمساعدة الذكاء' : 'Assisted profile drafting'} <ArrowUpRight size={15}/></a></>}>
    {status.state === 'loading' && <Loading/>}{status.state === 'error' && <Failed/>}
    {d && <section className="bpr-panel"><div className="bpr-panel-head"><h2><Brain size={19}/> {ar ? 'فحوص الخدمة' : 'Service checks'}</h2><SourceBadge source={source}/></div>
      <ul className="bpr-status-grid" dir="ltr">
        {['copilot_ai','copilot_briefs'].map((k) => <li key={k} className={checks?.[k] === 'ok' ? 'ok' : 'fail'}><span>{k === 'copilot_ai' ? 'Copilot AI' : 'Copilot briefs'}</span><strong>{checks?.[k] || '—'}</strong></li>)}
      </ul><p className="bpr-note">{ar ? 'وقت فحص المراقبة: ' : 'Monitoring check time: '}<span className="bpr-mono">{fmtDate(d.operations?.checked_at || d.checked_at, ar, true)}</span>. {ar ? 'هذه فحوص خدمة ولا تثبت نجاح الاستدلال لكل نموذج.' : 'These are service checks; they do not prove inference for each model.'}</p>
    </section>}
    <section className="bpr-panel"><h2><Cpu size={19}/> {ar ? 'لقطة بوابة النماذج الخاصة' : 'Private gateway model snapshot'}</h2><p>{ar ? 'معرّفات شوهدت في استجابة فهرس النماذج بتاريخ 3 نوفمبر 2026. الفهرس لا يثبت توفر النموذج أو نجاح الاستدلال.' : 'IDs observed in a private model-catalog response on 3 November 2026. A catalog does not prove model availability or successful inference.'}</p><div className="bpr-chips">{GATEWAY_MODELS.map(x=><span className="bpr-source" key={x}>{x}</span>)}</div><p className="bpr-note">{ar ? 'الاستجابة خاصة بالشبكة ولا يمكن للمتصفح العام الوصول إليها بسبب ضوابط الشبكة وCORS. لا توجد مفاتيح نماذج في هذا الموقع.' : 'The gateway is private-network only and does not allow browser CORS from this site. No model keys are present in this website.'}</p></section>
    <section className="bpr-split"><div className="bpr-panel"><h2><Server size={19}/> {ar ? 'المسار المحلي' : 'Local model route'}</h2><p>{ar ? 'رُصد نموذج Qwen3-VL-4B-Instruct-Q4_K_M.gguf على مضيف النماذج المحلي. هذه معلومة جرد، وليست اختبار استدلال.' : 'Qwen3-VL-4B-Instruct-Q4_K_M.gguf was observed on the local model host. This is inventory evidence, not an inference test.'}</p></div><div className="bpr-panel"><h2>{ar ? 'استخدام الذكاء الحالي' : 'Current AI use'}</h2><p>{ar ? 'صياغة الملف المساعدة متاحة ضمن جلسة ORCID الموثقة في السجل؛ النتيجة مسودة يراجعها مقدم الرعاية قبل الحفظ. استقبال العيادة التجريبي يستخدم قواعد محلية وإجابات معتمدة دون استدعاء نموذج.' : 'Assisted profile drafting is available inside the registry’s authenticated ORCID flow; the result remains a draft for provider review before saving. The clinic pilot uses local approved-answer rules and makes no model calls.'}</p><Link className="profile-text-link" to="/bpr/clinic">{ar ? 'تفاصيل تجربة الاستقبال' : 'Clinic pilot details'}</Link></div></section>
  </BprLayout>;
}
