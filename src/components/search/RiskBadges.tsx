/**
 * RiskBadges — badges visuales distinguidos para clasificación de riesgo profesional.
 *
 * Categorías separadas según estándar industrial (Refinitiv/Dow Jones):
 * - Sanctioned (rojo): persona/entidad en lista de sanciones
 * - Sanction Linked (naranja): vinculada a sancionado pero no sancionada ella
 * - PEP (morado): Politically Exposed Person activo o ex
 * - RCA (amarillo): Relative or Close Associate de PEP
 *
 * Cada badge tiene tooltip explicando qué significa.
 */
import { AlertTriangle, Crown, Link2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface RiskBadgesProps {
  isSanctioned?: boolean;
  sanctionLinked?: boolean;
  isPep?: boolean;
  isRca?: boolean;
  pepCategory?: string | null;
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

const ICON_SIZE = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
};

function formatCategory(cat: string): string {
  return cat
    .replace(/^(PEP|RCA)_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (s) => s.toUpperCase());
}

export function RiskBadges({
  isSanctioned,
  sanctionLinked,
  isPep,
  isRca,
  pepCategory,
  size = 'sm',
  className,
}: RiskBadgesProps) {
  const { t } = useTranslation();
  const sz = SIZE_CLASSES[size];
  const isz = ICON_SIZE[size];

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {isSanctioned && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-semibold border',
            'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30',
            sz,
          )}
          title={t('components.search.riskBadges.sanctionedTitle')}
        >
          <AlertTriangle className={isz} /> {t('components.search.riskBadges.sanctioned')}
        </span>
      )}
      {sanctionLinked && !isSanctioned && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-semibold border',
            'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
            sz,
          )}
          title={t('components.search.riskBadges.sanctionLinkedTitle')}
        >
          <Link2 className={isz} /> {t('components.search.riskBadges.sanctionLinked')}
        </span>
      )}
      {isPep && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-semibold border',
            'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30',
            sz,
          )}
          title={pepCategory
            ? t('components.search.riskBadges.pepTitleWithCategory', { category: formatCategory(pepCategory) })
            : t('components.search.riskBadges.pepTitle')}
        >
          <Crown className={isz} /> PEP
          {pepCategory && (
            <span className="opacity-80 font-normal">
              ·{formatCategory(pepCategory)}
            </span>
          )}
        </span>
      )}
      {isRca && !isPep && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-semibold border',
            'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
            sz,
          )}
          title={pepCategory
            ? t('components.search.riskBadges.rcaTitleWithCategory', { category: formatCategory(pepCategory) })
            : t('components.search.riskBadges.rcaTitle')}
        >
          <Users className={isz} /> RCA
          {pepCategory && (
            <span className="opacity-80 font-normal">
              ·{formatCategory(pepCategory)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export default RiskBadges;
