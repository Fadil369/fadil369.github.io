import { Link } from 'react-router-dom';
import { ArrowUpRight, Brain, Cpu, Database, Search, Server, Waypoints } from 'lucide-react';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout, Loading, SourceBadge, fmtDate, Failed } from '../../components/BprKit';
import { OpsStatus, useLoad } from '../../lib/bpr';

// The AI layer that runs on this platform today: NVIDIA Nemotron models behind an
// OpenAI-compatible backend, an on-premise fallback, and embeddings fine-tuned on
// the NPHIES corpus. What is verifiable is shown from the registry's own operations
// checks (copilot_ai); the model pipeline is described as architecture, not as a
// per-model live badge, because routing changes without notice.

const PIPELINE = [
  {
    icon: Brain,
    name: 'Nemotron Super VL',
    role: { en: 'Primary route', ar: 'المسار الأساسي' },
    text: {
      en: 'Text + vision foundation model with Arabic support. Clinical reasoning, diagnosis suggestions and chart summarisation. Primary route for the copilot.',
      ar: 'نموذج أساسي للنص والصور مع دعم العربية. الاستدلال السريري واقتراحات التشخيص وتلخيص الملفات. المسار الأساسي للمساعد السريري.',
    },
    facts: ['120B params', 'Text + vision', 'Arabic'],
  },
  {
    icon: Waypoints,
    name: 'Nemotron Lightning',
    role: { en: 'Fast secondary', ar: 'بديل سريع' },
    text: {
      en: 'Fast text model used when the primary route is busy or the task is a simple classification. Sub-second first byte.',
      ar: 'نموذج نصي سريع يُستخدم حين يكون المسار الأساسي مشغولاً أو عندما تكون المهمة تصنيفاً بسيطاً. أول بايت في أقل من ثانية.',
    },
    facts: ['30B params', 'Text', '~0.3s TTFT'],
  },
  {
    icon: Server,
    name: 'Qwen3-VL-4B',
    role: { en: 'On-premise fallback', ar: 'بديل داخل الموقع' },
    text: {
      en: 'Local llama.cpp fallback that runs entirely on this infrastructure. Last resort when the cloud routes are unreachable — nothing leaves the server.',
      ar: 'بديل محلي عبر llama.cpp يعمل بالكامل داخل هذه البنية. الملاذ الأخير عند تعذر الوصول للمسارات السحابية — لا يخرج شيء من الخادم.',
    },
    facts: ['4B params', 'On-premise', 'Zero egress'],
  },
];

export default function Nvidia() {
  const { ar } = useI18n();
  const s = useLoad<OpsStatus>('/api/status', 'status.json');
  usePageMeta({
    title: ar ? 'ذكاء NVIDIA الصحي — BPR' : 'NVIDIA Health AI — BPR',
    description: ar
      ? 'طبقة الذكاء الاصطناعي التي تعمل على المنصة: نماذج NVIDIA Nemotron، وبديل محلي داخل الموقع، وتضميرات مدرّبة على نفيس — مع حالة المساعد من فحوص السجل.'
      : 'The AI layer running on this platform: NVIDIA Nemotron models, an on-premise fallback, and embeddings trained on the NPHIES corpus — with copilot status from the registry’s own checks.',
    url: '/bpr/nvidia', type: 'website',
  });
  const d = s.state === 'ready' ? s.data : null;
  const src = s.state === 'ready' ? s.source : 'snapshot';
  const copilot = d?.operations?.checks?.copilot_ai;
  const briefs = d?.operations?.checks?.copilot_briefs;

  return (
    <BprLayout kicker={ar ? 'ذكاء NVIDIA' : 'NVIDIA AI'}
      title={ar ? 'ذكاء اصطناعي مدرّب على نفيس، يعمل داخل هذه البنية.' : 'NPHIES-trained AI, running inside this infrastructure.'}
      lead={ar
        ? <>نماذج NVIDIA Nemotron تقود المساعد السريري، مع مسار سحابي بديل وبديل محلي داخل الموقع، وتضميرات مدرّبة على بيانات رفض نفيس. ما يمكن التحقق منه يُعرض من فحوص السجل نفسها.</>
        : <>NVIDIA Nemotron models drive the clinical copilot, behind a fast secondary route and an on-premise fallback, with embeddings fine-tuned on NPHIES rejection data. What is verifiable comes from the registry’s own checks.</>}
      actions={<>
        <Link className="profile-button primary" to="/bpr/workspace">{ar ? 'افتح المساعد السريري' : 'Open the copilot'}</Link>
        <Link className="profile-button" to="/bpr/nphies">{ar ? 'مكتب نفيس' : 'NPHIES desk'}</Link>
      </>}>

      {s.state === 'loading' && <Loading />}
      {s.state === 'error' && <Failed />}

      {d && <section className="bpr-panel">
        <div className="bpr-panel-head">
          <h2>{ar ? 'حالة طبقة الذكاء' : 'AI layer status'}</h2>
          <SourceBadge source={src} />
        </div>
        <ul className="bpr-status-grid" dir="ltr">
          <li className={copilot === 'ok' ? 'ok' : 'fail'}>
            <span>{ar ? 'المساعد السريري (Copilot AI)' : 'Copilot AI'}</span>
            <strong>{copilot || '—'}</strong>
          </li>
          <li className={briefs === 'ok' ? 'ok' : 'fail'}>
            <span>{ar ? 'ملخصات المساعد' : 'Copilot briefs'}</span>
            <strong>{briefs || '—'}</strong>
          </li>
        </ul>
        <p className="bpr-note">
          {ar ? 'من فحوص التشغيل في' : 'From the registry’s operations checks at'}{' '}
          <span className="bpr-mono">{fmtDate(d.operations?.checked_at || d.checked_at, ar, true)}</span>.{' '}
          {ar
            ? 'هذان الفحصان يقيسان خدمة المساعد نفسها؛ مسارات النماذج تتغير دون إشعار، لذا لا تُعرض شارة «مباشر» لكل نموذج.'
            : 'These checks measure the copilot service itself; model routes change without notice, so no per-model “live” badge is claimed.'}
        </p>
      </section>}

      <section className="bpr-panel">
        <h2><Waypoints size={18} /> {ar ? 'ترتيب المسارات' : 'Route order'}</h2>
        <p className="bpr-note" style={{ marginTop: 0, marginBottom: 18 }}>
          {ar
            ? 'الواجهة تستدعي backend واحدًا بواجهة متوافقة مع OpenAI؛ الاختيار بين النماذج يحدث هناك.'
            : 'The app calls one backend through an OpenAI-compatible API; model selection happens there.'}
        </p>
        <div className="bpr-module-grid">
          {PIPELINE.map(({ icon: Icon, ...m }) => (
            <article key={m.name} className="bpr-module">
              <div className="bpr-module-top"><Icon size={24} /><span className="bpr-chip live">{ar ? m.role.ar : m.role.en}</span></div>
              <h3>{m.name}</h3>
              <p>{ar ? m.text.ar : m.text.en}</p>
              <div className="bpr-chips">{m.facts.map((f) => <span key={f} className="bpr-source">{f}</span>)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="bpr-split">
        <div className="bpr-panel">
          <h2><Search size={18} /> {ar ? 'تضميرات مدرّبة على نفيس' : 'NPHIES-trained embeddings'}</h2>
          <p>
            {ar
              ? 'نموذج تضمين مدرّب على رموز رفض نفيس وبيانات المطالبات والرموز المهنية. يشغّل البحث الدلالي في مكتب نفيس وفحص المطالبات قبل الإرسال — نفس المفردات التي يستخدمها نفيس في الرفض.'
              : 'An embedding model fine-tuned on NPHIES rejection codes, claims data and practice codes. It powers semantic search in the NPHIES desk and claims pre-flight checks — the same vocabulary NPHIES uses when it rejects.'}
          </p>
          <div className="bpr-chips">
            <span className="bpr-source">nemotron-3.5-embed-1b</span>
            <span className="bpr-source">{ar ? 'تكامل جارٍ' : 'fine-tuned'}</span>
          </div>
          <p className="bpr-note">
            <Link className="profile-text-link" to="/bpr/nphies">{ar ? 'جرّبه في مكتب نفيس' : 'Try it in the NPHIES desk'}</Link>
          </p>
        </div>
        <div className="bpr-panel">
          <h2><Database size={18} /> {ar ? 'كيف يتصل' : 'How it connects'}</h2>
          <p>
            {ar
              ? 'يعمل الـ backend على brainsait.de، وتستدعه الواجهة عبر نقاط متوافقة مع OpenAI. أي بيانات patient تُجرّد من الهوية قبل الإرسال، والمسار المحلي لا يخرج منه شيء.'
              : 'The backend runs on brainsait.de and the frontend calls it through OpenAI-compatible endpoints. Patient data is de-identified before transmission, and the local route sends nothing out.'}
          </p>
          <ul className="bpr-check-list">
            <li><Cpu size={15} /> {ar ? 'متكامل مع المساعد السريري وOpenEMR عبر FHIR R4' : 'Integrated with the copilot and OpenEMR over FHIR R4'}</li>
            <li><Brain size={15} /> {ar ? 'المساعد يلخّص ويقترح — القرار السريري يبقى للطبيب' : 'The copilot drafts and suggests — the clinical decision stays with the physician'}</li>
            <li><ArrowUpRight size={15} /> <a className="profile-text-link" href="https://build.nvidia.com" target="_blank" rel="noreferrer">NVIDIA build <ArrowUpRight size={12} /></a></li>
          </ul>
        </div>
      </section>
    </BprLayout>
  );
}
