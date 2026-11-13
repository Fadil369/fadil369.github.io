import { useState } from 'react';
import { useI18n } from '../i18n';
import { ExtLink, fmtDate } from './BprKit';
import { safeUrl } from '../lib/bpr';

const KFMC = 'https://api.kfmc.med.sa/api/KFMCResearch/GetAll';
const DATASET = '94676134-5b08-44f0-bb71-73acd9566158';
const OPEN_DATA = 'https://open.data.gov.sa/data/api/datasets';
type Result<T> = { state: 'idle' | 'loading' | 'error' } | { state: 'ready'; data: T; at: string };
type Dataset = { titleEn?: string; titleAr?: string; descriptionEn?: string; descriptionAr?: string; providerNameEn?: string; providerNameAr?: string; updatedAt?: string };
type Resource = { name?: string; descriptionEn?: string; descriptionAr?: string; format?: string; downloadUrl?: string };
type Insurance = { dataset: Dataset; resources: Resource[] };

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDataset(value: unknown): Dataset {
  if (!isObject(value) || typeof value.id !== 'string') throw new Error('Invalid dataset response');
  const field = (name: string) => typeof value[name] === 'string' ? value[name] : undefined;
  return { titleEn: field('titleEn'), titleAr: field('titleAr'), descriptionEn: field('descriptionEn'), descriptionAr: field('descriptionAr'), providerNameEn: field('providerNameEn'), providerNameAr: field('providerNameAr'), updatedAt: field('updatedAt') };
}

function readResources(value: unknown): Resource[] {
  if (!isObject(value) || !Array.isArray(value.resources)) throw new Error('Invalid resources response');
  return value.resources.filter(isObject).map((resource) => {
    const field = (name: string) => typeof resource[name] === 'string' ? resource[name] : undefined;
    return { name: field('name'), descriptionEn: field('descriptionEn'), descriptionAr: field('descriptionAr'), format: field('format'), downloadUrl: field('downloadUrl') };
  });
}

export function PublicEvidence() {
  const { ar } = useI18n();
  const [research, setResearch] = useState<Result<unknown>>({ state: 'idle' });
  const [insurance, setInsurance] = useState<Result<Insurance>>({ state: 'idle' });

  const loadResearch = async () => {
    setResearch({ state: 'loading' });
    try {
      const data = await getJson(KFMC);
      if (!Array.isArray(data) && !isObject(data)) throw new Error('Invalid research response');
      setResearch({ state: 'ready', data, at: new Date().toISOString() });
    } catch { setResearch({ state: 'error' }); }
  };
  const loadInsurance = async () => {
    setInsurance({ state: 'loading' });
    try {
      const query = `version=-1&dataset=${DATASET}`;
      const [dataset, resources] = await Promise.all([getJson(`${OPEN_DATA}?${query}`), getJson(`${OPEN_DATA}/resources?${query}`)]);
      setInsurance({ state: 'ready', data: { dataset: readDataset(dataset), resources: readResources(resources) }, at: new Date().toISOString() });
    } catch { setInsurance({ state: 'error' }); }
  };

  return <section className="bpr-section" aria-labelledby="public-evidence">
    <div className="profile-section-label">{ar ? 'مصادر عامة' : 'Public sources'}</div>
    <h2 className="bpr-h2" id="public-evidence">{ar ? 'استكشف الأدلة من مصادرها' : 'Explore evidence at its source'}</h2>
    <p className="bpr-lead-note">{ar ? 'تُجلب البيانات عند الطلب مباشرة من الجهات الناشرة. قد تمنع إعدادات المتصفح أو المصدر الوصول؛ هذه البيانات ليست سجلات مرضى ولا تثبت وجود شراكة.' : 'Data is requested directly from the publishers only when you choose. Browser or publisher settings may block access. These are not patient records and do not establish a partnership.'}</p>
    <div className="bpr-evidence-grid">
      <article className="bpr-panel">
        <h3>{ar ? 'أبحاث مدينة الملك فهد الطبية' : 'KFMC research open data'}</h3>
        <p>{ar ? 'استعرض استجابة واجهة الأبحاث العامة كما ينشرها المصدر.' : 'Inspect the public research API response as published by KFMC.'}</p>
        <button className="profile-button secondary" onClick={loadResearch} disabled={research.state === 'loading'}>{research.state === 'loading' ? (ar ? 'جارٍ التحميل…' : 'Loading…') : (ar ? 'تحميل بيانات الأبحاث' : 'Load research data')}</button>
        {research.state === 'error' && <p className="bpr-evidence-error" role="alert">{ar ? 'تعذّر الوصول إلى واجهة مدينة الملك فهد الطبية أو قراءة استجابتها. حاول مجددًا أو افتح توثيق المصدر.' : 'Could not access or read the KFMC API. Try again or open the source documentation.'}</p>}
        {research.state === 'ready' && <><p className="bpr-note">{ar ? 'تم الجلب' : 'Fetched'}: {fmtDate(research.at, ar, true)}</p><details className="bpr-json"><summary>{ar ? 'عرض استجابة المصدر' : 'Show source response'}</summary><pre dir="auto">{JSON.stringify(research.data, null, 2)}</pre></details></>}
        <p><ExtLink href="https://api.kfmc.med.sa/swagger/index.html">{ar ? 'توثيق واجهة مدينة الملك فهد الطبية' : 'KFMC API documentation'}</ExtLink></p>
        <p className="bpr-note">{ar ? 'التجارب السريرية والشراكات:' : 'Clinical trial partnerships:'} <a href="mailto:CRD_RC@kfmc.med.sa">CRD_RC@kfmc.med.sa</a></p>
      </article>
      <article className="bpr-panel">
        <h3>{ar ? 'التأمين الصحي للقطاع الخاص' : 'Private-sector health insurance'}</h3>
        <p>{ar ? 'اطّلع على وصف مجموعة البيانات العامة ومصادرها؛ لا تمثل بيانات فردية.' : 'Explore public dataset metadata and resources, not individual insurance records.'}</p>
        <button className="profile-button secondary" onClick={loadInsurance} disabled={insurance.state === 'loading'}>{insurance.state === 'loading' ? (ar ? 'جارٍ التحميل…' : 'Loading…') : (ar ? 'تحميل معلومات المجموعة' : 'Load dataset information')}</button>
        {insurance.state === 'error' && <p className="bpr-evidence-error" role="alert">{ar ? 'تعذّر تحميل معلومات المجموعة ومصادرها. حاول مجددًا أو افتح المصدر.' : 'Could not load the dataset metadata and resources. Try again or open the source.'}</p>}
        {insurance.state === 'ready' && <div>
          <h4>{(ar ? insurance.data.dataset.titleAr : insurance.data.dataset.titleEn) || (ar ? insurance.data.dataset.titleEn : insurance.data.dataset.titleAr) || DATASET}</h4>
          <p>{(ar ? insurance.data.dataset.descriptionAr : insurance.data.dataset.descriptionEn) || ''}</p>
          <p className="bpr-note">{ar ? 'الجهة الناشرة' : 'Publisher'}: {(ar ? insurance.data.dataset.providerNameAr : insurance.data.dataset.providerNameEn) || '—'} · {ar ? 'تحديث المصدر' : 'Source updated'}: {fmtDate(insurance.data.dataset.updatedAt, ar)} · {ar ? 'تم الجلب' : 'Fetched'}: {fmtDate(insurance.at, ar, true)}</p>
          <ul>{insurance.data.resources.map((resource, index) => <li key={`${resource.name || 'resource'}-${index}`}>{safeUrl(resource.downloadUrl) ? <a href={safeUrl(resource.downloadUrl)} target="_blank" rel="noreferrer">{resource.name || (ar ? 'مصدر' : 'Resource')}</a> : (resource.name || (ar ? 'مصدر' : 'Resource'))}{resource.format ? ` · ${resource.format}` : ''}</li>)}</ul>
          {insurance.data.resources.length === 0 && <p className="bpr-note">{ar ? 'لم يُرجع المصدر أي موارد.' : 'The source returned no resources.'}</p>}
        </div>}
        <p><ExtLink href={`${OPEN_DATA}?version=-1&dataset=${DATASET}`}>{ar ? 'بيانات المجموعة من المصدر' : 'Dataset metadata at source'}</ExtLink></p>
      </article>
    </div>
  </section>;
}

export function NationalAddressNotice() {
  const { ar } = useI18n();
  return <section className="bpr-panel">
    <h2>{ar ? 'العنوان الوطني للمؤسسات' : 'National Address for organizations'}</h2>
    <p>{ar ? 'تكامل العنوان الوطني غير متاح بعد. تتطلب الواجهة اشتراكًا وخادمًا محميًا بالمصادقة وحدود الطلبات لحماية المفتاح؛ لا تُدخل عنوانًا أو إحداثيات هنا.' : 'National Address integration is not connected. It requires a subscription and an authenticated, rate-limited backend to protect the key; do not enter addresses or coordinates here.'}</p>
    <ExtLink href="https://api.address.gov.sa/apidocumentation">{ar ? 'توثيق واجهة العنوان الوطني' : 'National Address API documentation'}</ExtLink>
  </section>;
}
