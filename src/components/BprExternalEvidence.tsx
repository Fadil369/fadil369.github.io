import { useState } from 'react';
import { useI18n } from '../i18n';
import { ExtLink, fmtDate } from './BprKit';
import { safeUrl, timeoutSignal } from '../lib/bpr';

const KFMC = 'https://api.kfmc.med.sa/api/KFMCResearch/GetAll';
const DATASET = '94676134-5b08-44f0-bb71-73acd9566158';
const OPEN_DATA = 'https://open.data.gov.sa/data/api/datasets';
type Result<T> = { state: 'idle' | 'loading' } | { state: 'error'; error: string } | { state: 'ready'; data: T; at: string };
type Dataset = { titleEn?: string; titleAr?: string; descriptionEn?: string; descriptionAr?: string; providerNameEn?: string; providerNameAr?: string; updatedAt?: string };
type Resource = { name?: string; descriptionEn?: string; descriptionAr?: string; format?: string; downloadUrl?: string };
type Insurance = { dataset: Dataset; resources: Resource[] };

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { credentials: 'omit', signal: timeoutSignal(12000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDataset(value: unknown): Dataset {
  if (!isObject(value) || value.id !== DATASET) throw new Error('Invalid dataset response');
  const field = (name: string) => typeof value[name] === 'string' ? value[name] as string : undefined;
  return { titleEn: field('titleEn'), titleAr: field('titleAr'), descriptionEn: field('descriptionEn'), descriptionAr: field('descriptionAr'), providerNameEn: field('providerNameEn'), providerNameAr: field('providerNameAr'), updatedAt: field('updatedAt') };
}

function readResources(value: unknown): Resource[] {
  if (!isObject(value) || !Array.isArray(value.resources)) throw new Error('Invalid resources response');
  return value.resources.filter(isObject).map((resource) => {
    const field = (name: string) => typeof resource[name] === 'string' ? resource[name] as string : undefined;
    return { name: field('name'), descriptionEn: field('descriptionEn'), descriptionAr: field('descriptionAr'), format: field('format'), downloadUrl: field('downloadUrl') };
  });
}

function errorText(error: unknown) {
  return error instanceof Error && /^HTTP \d+$/.test(error.message) ? ` (${error.message})` : '';
}

export function PublicEvidence() {
  const { ar } = useI18n();
  const [research, setResearch] = useState<Result<unknown>>({ state: 'idle' });
  const [dataset, setDataset] = useState<Result<Insurance>>({ state: 'idle' });

  const loadResearch = async () => {
    setResearch({ state: 'loading' });
    try {
      const data = await getJson(KFMC);
      if (!Array.isArray(data) && !isObject(data)) throw new Error('Invalid research response');
      setResearch({ state: 'ready', data, at: new Date().toISOString() });
    } catch (error) { setResearch({ state: 'error', error: errorText(error) }); }
  };
  const loadDataset = async () => {
    setDataset({ state: 'loading' });
    try {
      const query = `version=-1&dataset=${DATASET}`;
      const [metadata, resources] = await Promise.all([
        getJson(`${OPEN_DATA}?${query}`),
        getJson(`${OPEN_DATA}/resources?${query}`),
      ]);
      setDataset({ state: 'ready', data: { dataset: readDataset(metadata), resources: readResources(resources) }, at: new Date().toISOString() });
    } catch (error) { setDataset({ state: 'error', error: errorText(error) }); }
  };

  return <section className="bpr-section" aria-label={ar ? 'مصادر عامة' : 'Public sources'}>
    <div className="profile-section-label">{ar ? 'مصادر عامة' : 'Public sources'}</div>
    <h2 className="bpr-h2" id="public-evidence">{ar ? 'استكشف الأدلة من مصادرها' : 'Explore evidence at its source'}</h2>
    <p className="bpr-lead-note">{ar ? 'تُطلب البيانات من الجهات الناشرة فقط عند اختيارك. قد تمنع إعدادات المتصفح أو المصدر الوصول. هذه بيانات عامة وليست سجلات مرضى ولا تثبت وجود شراكة.' : 'Data is requested directly from publishers only when you choose. Browser or publisher settings may block access. This is public data, not patient records, and does not establish a partnership.'}</p>
    <div className="bpr-evidence-grid">
      <article className="bpr-panel">
        <h3>{ar ? 'أبحاث مدينة الملك فهد الطبية' : 'King Fahad Medical City research'}</h3>
        <p>{ar ? 'اعرض استجابة واجهة الأبحاث العامة كما ينشرها المصدر.' : 'View the public research API response as published by KFMC.'}</p>
        <button className="profile-button secondary" onClick={loadResearch} disabled={research.state === 'loading'}>{research.state === 'loading' ? (ar ? 'جارٍ التحميل…' : 'Loading…') : (research.state === 'error' ? (ar ? 'أعد المحاولة' : 'Try again') : (ar ? 'تحميل بيانات الأبحاث' : 'Load research data'))}</button>
        {research.state === 'error' && <p className="bpr-evidence-error" role="alert">{ar ? `تعذّر الوصول إلى واجهة مدينة الملك فهد الطبية أو قراءة استجابتها${research.error}. أعد المحاولة أو افتح توثيق المصدر.` : `Could not access or read the KFMC API${research.error}. Try again or open the source documentation.`}</p>}
        {research.state === 'ready' && <><p className="bpr-note">{ar ? 'تم الجلب' : 'Fetched'}: {fmtDate(research.at, ar, true)}</p><details className="bpr-json"><summary>{ar ? 'عرض استجابة المصدر' : 'Show source response'}</summary><pre dir="auto">{JSON.stringify(research.data, null, 2)}</pre></details></>}
        <p><ExtLink href="https://api.kfmc.med.sa/swagger/index.html">{ar ? 'توثيق واجهة مدينة الملك فهد الطبية' : 'KFMC API documentation'}</ExtLink></p>
      </article>
      <article className="bpr-panel">
        <h3>{ar ? 'التأمين الصحي للقطاع الخاص' : 'Private-sector health insurance dataset'}</h3>
        <p>{ar ? 'اعرض وصف مجموعة البيانات العامة ومصادرها؛ لا تعرض سجلات تأمين فردية.' : 'View public dataset metadata and publisher resources, not individual insurance records.'}</p>
        <button className="profile-button secondary" onClick={loadDataset} disabled={dataset.state === 'loading'}>{dataset.state === 'loading' ? (ar ? 'جارٍ التحميل…' : 'Loading…') : (dataset.state === 'error' ? (ar ? 'أعد المحاولة' : 'Try again') : (ar ? 'تحميل معلومات المجموعة' : 'Load dataset information'))}</button>
        {dataset.state === 'error' && <p className="bpr-evidence-error" role="alert">{ar ? `تعذّر تحميل وصف المجموعة ومواردها${dataset.error}. أعد المحاولة أو افتح المصدر.` : `Could not load the dataset metadata and resources${dataset.error}. Try again or open the source.`}</p>}
        {dataset.state === 'ready' && <div>
          <h4>{(ar ? dataset.data.dataset.titleAr : dataset.data.dataset.titleEn) || (ar ? dataset.data.dataset.titleEn : dataset.data.dataset.titleAr) || DATASET}</h4>
          <p>{(ar ? dataset.data.dataset.descriptionAr : dataset.data.dataset.descriptionEn) || ''}</p>
          <p className="bpr-note">{ar ? 'الجهة الناشرة' : 'Publisher'}: {(ar ? dataset.data.dataset.providerNameAr : dataset.data.dataset.providerNameEn) || '—'} · {ar ? 'تحديث المصدر' : 'Source updated'}: {fmtDate(dataset.data.dataset.updatedAt, ar)} · {ar ? 'تم الجلب' : 'Fetched'}: {fmtDate(dataset.at, ar, true)}</p>
          <ul>{dataset.data.resources.map((resource, index) => {
            const href = safeUrl(resource.downloadUrl);
            return <li key={`${resource.name || 'resource'}-${index}`}>{href ? <a href={href} target="_blank" rel="noreferrer">{resource.name || (ar ? 'مصدر' : 'Resource')}</a> : (resource.name || (ar ? 'مصدر' : 'Resource'))}{resource.format ? ` · ${resource.format}` : ''}</li>;
          })}</ul>
          {dataset.data.resources.length === 0 && <p className="bpr-note">{ar ? 'لم يُرجع المصدر أي موارد.' : 'The publisher returned no resources.'}</p>}
        </div>}
        <p><ExtLink href={`${OPEN_DATA}?version=-1&dataset=${DATASET}`}>{ar ? 'عرض بيانات المجموعة لدى الناشر' : 'View dataset metadata at publisher'}</ExtLink></p>
      </article>
    </div>
  </section>;
}

export function NationalAddressNotice() {
  const { ar } = useI18n();
  return <section className="bpr-panel">
    <h2>{ar ? 'العنوان الوطني للمؤسسات' : 'National Address for organizations'}</h2>
    <p>{ar ? 'تكامل العنوان الوطني غير متصل. يتطلب اشتراكًا وخادمًا محميًا بالمصادقة ومحدود الطلبات لحماية المفتاح؛ لا تُدخل عنوانًا أو إحداثيات هنا.' : 'National Address is not connected. Integration requires a subscription and an authenticated, rate-limited backend to protect the key; do not enter addresses or coordinates here.'}</p>
    <ExtLink href="https://api.address.gov.sa/apidocumentation">{ar ? 'توثيق واجهة العنوان الوطني' : 'National Address API documentation'}</ExtLink>
  </section>;
}
