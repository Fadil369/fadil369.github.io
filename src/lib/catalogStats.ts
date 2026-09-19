import type { Catalog } from '../types';

export function getCatalogStats(cat: Catalog) {
  const learn = cat.learn.length;
  const build = cat.build.courses.length + (cat.build.program ? 1 : 0);
  const solutions = cat.solutions.length;
  const templates = cat.templates.length;
  const oid = cat.oid?.length ?? 0;
  const total = learn + build + solutions + templates + oid;

  return {
    learn,
    build,
    solutions,
    templates,
    oid,
    total,
    healthcareIdentity: solutions + oid,
    agentsAndTemplates: templates,
  };
}

export function catalogSummary(cat: Catalog, ar: boolean) {
  const stats = getCatalogStats(cat);
  return ar
    ? `${stats.total} عرضاً منشوراً: ${stats.learn} تعلّم، ${stats.build} بناء، ${stats.solutions} حلول، ${stats.templates} قوالب، و${stats.oid} هوية وسجل.`
    : `${stats.total} published offers: ${stats.learn} Learn, ${stats.build} Build, ${stats.solutions} Solutions, ${stats.templates} Templates, and ${stats.oid} OID & Registry items.`;
}
