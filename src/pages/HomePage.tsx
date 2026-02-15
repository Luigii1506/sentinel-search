import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  FileCheck,
  CheckCircle,
  Sparkles,
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
import { NeuralNetworkBackground } from '@/components/NeuralNetworkBackground';
import { IntelligentSearch } from '@/components/search/IntelligentSearch';
import { useDashboard } from '@/hooks/useDashboard';
import { cn, formatCompactNumber } from '@/lib/utils';

// Animated Counter Component
function AnimatedCounter({ value, suffix = '', duration = 2 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const steps = 60;
          const increment = value / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, (duration * 1000) / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={countRef}>
      {formatCompactNumber(count)}{suffix}
    </span>
  );
}

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
      className="glass rounded-xl p-6 card-hover group"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
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
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      <ul className="space-y-1">
        {examples.map((example) => (
          <li key={example} className="flex items-center gap-2 text-xs text-gray-500">
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
          ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
      )}
    >
      {name}
    </motion.div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);
  
  const { stats, isLoading } = useDashboard();

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleSelectResult = (entityId: string) => {
    navigate(`/entity/${entityId}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        <NeuralNetworkBackground />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="text-center mb-12">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
            >
              <Sparkles className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">Cumplimiento PLD/FT México</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">v2.0</Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            >
              Cumplimiento{' '}
              <span className="text-gradient">PLD/FT</span>
              <br />
              <span className="text-2xl sm:text-3xl lg:text-4xl font-normal text-gray-400">
                Inteligencia de Riesgo
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
            >
              Sistema de verificación contra listas de sanciones internacionales y locales. 
              Cumple con las regulaciones de la <strong>UIF</strong>, <strong>SAT 69-B</strong> y <strong>CNBV</strong>.
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
              />
            </motion.div>

            {/* Quick Tags */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap justify-center gap-2 mt-6"
            >
              <span className="text-sm text-gray-500">Búsquedas populares:</span>
              {['OFAC', 'Lista 69-B SAT', 'PEP México', 'Empresas offshore'].map((tag, i) => (
                <motion.button
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  onClick={() => handleSearch(tag)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {tag}
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* Floating Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
          >
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center p-4">
                    <Skeleton className="h-8 w-24 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="text-center p-4 glass rounded-xl">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    <AnimatedCounter value={stats?.total_entities || 33583} suffix="+" />
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Entidades</div>
                </div>
                <div className="text-center p-4 glass rounded-xl">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    <AnimatedCounter value={6} />
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Fuentes Datos</div>
                </div>
                <div className="text-center p-4 glass rounded-xl">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    99.9%
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Uptime SLA</div>
                </div>
                <div className="text-center p-4 glass rounded-xl">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    &lt;50ms
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Respuesta</div>
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-white/50"
            />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mb-4">
              Características
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Evaluación Integral de Riesgo
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Nuestra plataforma combina múltiples fuentes de datos y análisis impulsado por IA 
              para entregar perfiles de riesgo completos en tiempo real.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Globe}
              title="Listas Internacionales"
              description="Verificación contra OFAC, ONU, UE, Reino Unido y otras listas de sanciones globales."
              delay={0}
            />
            <FeatureCard
              icon={Building2}
              title="Lista 69-B SAT"
              description="Cumplimiento con requisitos regulatorios mexicanos. Lista de contribuyentes incumplidos."
              delay={0.1}
            />
            <FeatureCard
              icon={Users}
              title="PEP México"
              description="Identificación de Personas Políticamente Expuestas según normativa CNBV y UIF."
              delay={0.2}
            />
            <FeatureCard
              icon={Network}
              title="Mapeo de Relaciones"
              description="Visualiza redes complejas y descubre conexiones ocultas entre entidades."
              delay={0.3}
            />
            <FeatureCard
              icon={BarChart3}
              title="Scoring de Riesgo"
              description="Evaluación de riesgo impulsada por IA combinando sanciones, PEP y factores geográficos."
              delay={0.4}
            />
            <FeatureCard
              icon={FileCheck}
              title="Audit Trail"
              description="Historial completo de investigaciones con registros detallados para cumplimiento regulatorio."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Risk Classification Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-[#0f0f0f]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 mb-4">
              Clasificación de Riesgo
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Sistema de Clasificación PLD/FT
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Clasificación de riesgo de cuatro niveles para priorizar investigaciones 
              y asignar recursos efectivamente según normativa UIF.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RiskLevelCard
              level="Crítico"
              title="Riesgo Crítico"
              description="Atención inmediata requerida. Entidades con coincidencias confirmadas en listas de sanciones OFAC/ONU."
              examples={['Coincidencia exacta OFAC', 'Lista 69-B SAT', 'Alertas UIF']}
              color="border-red-500"
              delay={0}
            />
            <RiskLevelCard
              level="Alto"
              title="Riesgo Alto"
              description="Monitoreo cercano recomendado. PEPs, sus asociados cercanos, o entidades con exposición geográfica de riesgo."
              examples={['PEP nivel federal', 'Asociados cercanos', 'Jurisdicciones de riesgo']}
              color="border-orange-500"
              delay={0.15}
            />
            <RiskLevelCard
              level="Medio"
              title="Riesgo Medio"
              description="Monitoreo estándar. Entidades con coincidencias parciales o conexiones menores."
              examples={['Coincidencia fonética', 'PEP local', 'Vínculos indirectos']}
              color="border-yellow-500"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Data Sources Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Fuentes de Datos Verificadas
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Agregamos datos de proveedores líderes globales y locales para asegurar 
              cobertura completa del marco regulatorio mexicano.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-3"
          >
            <DataSourceBadge name="OFAC SDN" />
            <DataSourceBadge name="ONU Consolidada" />
            <DataSourceBadge name="EU Sanctions" />
            <DataSourceBadge name="UK HMT" />
            <DataSourceBadge name="Lista 69-B SAT" isMexican />
            <DataSourceBadge name="UIF México" isMexican />
            <DataSourceBadge name="PEP CNBV" isMexican />
            <DataSourceBadge name="World-Check" />
            <DataSourceBadge name="Adverse Media" />
            <DataSourceBadge name="Internal" />
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8 sm:p-12 relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                ¿Listo para Fortalecer tu Cumplimiento?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Únete a sujetos obligados que confían en Sentinel PLD para sus 
                necesidades de inteligencia de riesgo y prevención de lavado de dinero.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={() => navigate('/search')}
                  className="btn-primary gap-2 text-lg px-8 py-3"
                >
                  <Search className="w-5 h-5" />
                  Iniciar Búsqueda
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 border-white/10 hover:bg-white/10 text-lg px-8 py-3"
                >
                  <FileCheck className="w-5 h-5" />
                  Ver Reporte Demo
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-2">
                {['Búsqueda', 'Monitoreo', 'API', 'Integraciones'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                {['Términos de Uso', 'Privacidad', 'Cookies', 'CNBV', 'UIF'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Recursos</h4>
              <ul className="space-y-2">
                {['Documentación', 'Soporte', 'Status', 'Seguridad'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Regulación</h4>
              <ul className="space-y-2">
                {['Ley Anti-Lavado', 'Circular 32/2013', 'Circular 40/2014', 'Criterios UIF'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold">Sentinel PLD</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 Sentinel PLD. Sistema de Cumplimiento PLD/FT.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
