import { useI18n } from '../i18n';
import BenefitsMatrix from '../components/BenefitsMatrix';
import { usePageMeta } from '../hooks/usePageMeta';

export default function Benefits() {
  const { ar } = useI18n();
  usePageMeta({
    title: ar ? 'المزايا — LEARN · BUILD · SOLUTION' : 'Benefits — LEARN · BUILD · SOLUTION',
    description: ar ? 'قارن مسارات LEARN و BUILD و SOLUTION — مزايا، أسعار، وروابط مباشرة إلى store.brainsait.de' : 'Compare LEARN, BUILD, SOLUTION — benefits, prices and direct links to store.brainsait.de',
    url: '/benefits',
    type: 'website',
  });
  return (
    <main className="page">
      <BenefitsMatrix />
    </main>
  );
}
