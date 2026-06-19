import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  FileCheck,
  CheckCircle,
  BarChart3,
  Network,
  AlertTriangle,
  Users,
  Building2,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { IntelligentSearch } from '@/components/search/IntelligentSearch';
import { CountUp, GridBackdrop } from '@/components/foundation';
import { useDashboard } from '@/hooks/useDashboard';
import { cn, formatCompactNumber } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';

// Feature Card Component
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="glass rounded-xl p-6 card-hover group transition-all duration-300 hover:border-primary/30 hover:shadow-[0_14px_48px_-18px] hover:shadow-primary/30"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// Risk Level Card
function RiskLevelCard({
  level,
  title,
  description,
  examples,
  color,
  delay = 0,
}: {
  level: string;
  title: string;
  description: string;
  examples: string[];
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'glass rounded-xl p-6 border-l-4 transition-all duration-300',
        color
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={cn('w-5 h-5', color.replace('border-', 'text-'))} />
        <span className={cn('text-xs font-bold uppercase tracking-wider', color.replace('border-', 'text-'))}>
          {level}
        </span>
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      <ul className="space-y-1">
        {examples.map((example) => (
          <li key={example} className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="w-3 h-3 flex-shrink-0" />
            {example}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// Data Source Badge
function DataSourceBadge({ name, isMexican = false }: { name: string; isMexican?: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      className={cn(
        'px-4 py-2 rounded-lg border text-sm transition-all cursor-pointer',
        isMexican
          ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/20'
          : 'bg-foreground/5 border-foreground/10 text-muted-foreground hover:bg-foreground/10 hover:text-foreground'
      )}
    >
      {name}
    </motion.div>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);
  
  const { stats, isLoading } = useDashboard();
  // Home searches use a focused default (sanctions + enforcement), NOT the
  // full catalog. Users refine coverage on the results page.
  const sourceLevel: 1 | 2 | 3 | 4 | 5 = 2;

  // Cursor-following spotlight in the hero. We write CSS vars straight to
  // the DOM node on mousemove (no React re-render per frame).
  const spotlightRef = useRef<HTMLDivElement>(null);
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = spotlightRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}&source_level=${sourceLevel}`);
  };

  const handleSelectResult = (entityId: string) => {
    navigate(`/entity/${entityId}?source_level=${sourceLevel}`);
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Full-page grid backdrop — spans the entire page (all sections). */}
      <GridBackdrop />
      <div className="relative z-10">
      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        onMouseMove={handleHeroMouseMove}
        className="group relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Cursor spotlight — fades in on hover, follows the pointer */}
        <div
          ref={spotlightRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: 'radial-gradient(480px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--primary) / 0.10), transparent 45%)' }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" aria-hidden="true" />
        <div className="absolute -left-16 top-24 h-72 w-72 rounded-full border border-blue-400/10 bg-blue-500/5 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-20 bottom-24 h-80 w-80 rounded-full border border-emerald-400/10 bg-emerald-500/5 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-foreground/5 border border-foreground/10 mb-6"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-medium text-muted-foreground">{t('home.badge')}</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight"
            >
              {t('home.headlineLead')}{' '}
              <span className="text-gradient">{t('home.headlineAccent')}</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
            >
              {t('home.subheadline')}
            </motion.p>

            {/* Search Component */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
            >
              <IntelligentSearch
                onSearch={handleSearch}
                onSelectResult={handleSelectResult}
                size="large"
                autoFocus
                sourceLevel={sourceLevel}
              />
            </motion.div>

          </div>

          {/* Hero stats — inline, centered (no cards) */}
          <motion.div
            {...fadeUp}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-14 flex flex-wrap items-start justify-center gap-x-12 gap-y-8 sm:gap-x-16"
          >
            {(isLoading
              ? [null, null, null, null]
              : [
                  { node: <CountUp to={stats?.total_entities || 33583} format={formatCompactNumber} suffix="+" />, label: t('home.stats.entities') },
                  { node: <CountUp to={6} />, label: t('home.stats.sources') },
                  { node: <CountUp to={99.9} format={(v) => v.toFixed(1)} suffix="%" />, label: t('home.stats.uptime') },
                  { node: <CountUp to={50} prefix="<" suffix="ms" />, label: t('home.stats.response') },
                ]
            ).map((stat, i) => (
              <div key={stat?.label ?? i} className="flex flex-col items-center gap-2 min-w-[88px]">
                {stat ? (
                  <>
                    <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
                      {stat.node}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </>
                )}
              </div>
            ))}
          </motion.div>
        </div>

      </motion.section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            {...fadeUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 mb-4">
              {t('home.features.badge')}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Globe}
              title={t('home.features.items.international.title')}
              description={t('home.features.items.international.description')}
              delay={0}
            />
            <FeatureCard
              icon={Building2}
              title={t('home.features.items.sat69b.title')}
              description={t('home.features.items.sat69b.description')}
              delay={0.1}
            />
            <FeatureCard
              icon={Users}
              title={t('home.features.items.pep.title')}
              description={t('home.features.items.pep.description')}
              delay={0.2}
            />
            <FeatureCard
              icon={Network}
              title={t('home.features.items.relationships.title')}
              description={t('home.features.items.relationships.description')}
              delay={0.3}
            />
            <FeatureCard
              icon={BarChart3}
              title={t('home.features.items.scoring.title')}
              description={t('home.features.items.scoring.description')}
              delay={0.4}
            />
            <FeatureCard
              icon={FileCheck}
              title={t('home.features.items.audit.title')}
              description={t('home.features.items.audit.description')}
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Risk Classification Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            {...fadeUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 mb-4">
              {t('home.risk.badge')}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('home.risk.title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('home.risk.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RiskLevelCard
              level={t('home.risk.critical.level')}
              title={t('home.risk.critical.title')}
              description={t('home.risk.critical.description')}
              examples={t('home.risk.critical.examples', { returnObjects: true }) as string[]}
              color="border-red-500"
              delay={0}
            />
            <RiskLevelCard
              level={t('home.risk.high.level')}
              title={t('home.risk.high.title')}
              description={t('home.risk.high.description')}
              examples={t('home.risk.high.examples', { returnObjects: true }) as string[]}
              color="border-orange-500"
              delay={0.15}
            />
            <RiskLevelCard
              level={t('home.risk.medium.level')}
              title={t('home.risk.medium.title')}
              description={t('home.risk.medium.description')}
              examples={t('home.risk.medium.examples', { returnObjects: true }) as string[]}
              color="border-yellow-500"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Data Sources Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            {...fadeUp}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('home.sources.title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('home.sources.subtitle')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-3"
          >
            {(t('home.sources.items', { returnObjects: true }) as string[]).map((name, i) => (
              <DataSourceBadge key={i} name={name} isMexican={[4, 5, 6].includes(i)} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8 sm:p-10 relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {t('home.cta.title')}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                {t('home.cta.subtitle')}
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={() => navigate('/search')}
                  className="btn-primary gap-2 text-lg px-8 py-3"
                >
                  <Search className="w-5 h-5" />
                  {t('home.cta.start')}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-foreground/10 hover:bg-foreground/10 text-lg px-8 py-3"
                >
                  <FileCheck className="w-5 h-5" />
                  {t('home.cta.demo')}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-foreground/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-foreground font-semibold mb-4">{t('home.footer.product')}</h4>
              <ul className="space-y-2">
                {(t('home.footer.links.product', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">{t('home.footer.legal')}</h4>
              <ul className="space-y-2">
                {(t('home.footer.links.legal', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">{t('home.footer.resources')}</h4>
              <ul className="space-y-2">
                {(t('home.footer.links.resources', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">{t('home.footer.regulation')}</h4>
              <ul className="space-y-2">
                {(t('home.footer.links.regulation', { returnObjects: true }) as string[]).map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-foreground/5">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-electric flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-foreground font-semibold">Sentinel PLD</span>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('home.footer.rights')}
            </p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}

export default HomePage;
