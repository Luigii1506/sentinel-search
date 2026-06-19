import { Badge } from '@/components/ui/badge';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: string;
  label?: string;
  className?: string;
}

/** i18n key suffix (under components.foundation.categoryBadge) per category. */
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  SANCTIONS: 'SANCTIONS',
  PEP: 'PEP',
  DEBARMENT: 'DEBARMENT',
  REGULATORY: 'REGULATORY',
  LAW_ENFORCEMENT: 'LAW_ENFORCEMENT',
  TAX: 'TAX',
  OTHER: 'OTHER',
  TERRORISM: 'TERRORISM',
  FINANCIAL_DISCLOSURE: 'FINANCIAL_DISCLOSURE',
  CORPORATE: 'CORPORATE',
  UBO: 'UBO',
  LEGAL: 'LEGAL',
  MEDIA: 'MEDIA',
};

const CATEGORY_STYLES: Record<string, string> = {
  SANCTIONS: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  PEP: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  DEBARMENT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  REGULATORY: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  LAW_ENFORCEMENT: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  TAX: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  OTHER: 'bg-gray-500/10 text-muted-foreground border-gray-500/20',
  TERRORISM: 'bg-red-600/10 text-red-600 dark:text-red-500 border-red-600/20',
  FINANCIAL_DISCLOSURE: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  CORPORATE: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  UBO: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  LEGAL: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  MEDIA: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  sanctions: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  pep: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  debarment: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  regulatory: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  law_enforcement: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  tax: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  other: 'bg-gray-500/10 text-muted-foreground border-gray-500/20',
  terrorism: 'bg-red-600/10 text-red-600 dark:text-red-500 border-red-600/20',
};

export function categoryLabel(category: string): string {
  const key = CATEGORY_LABEL_KEYS[category.toUpperCase()];
  return key ? i18n.t(`components.foundation.categoryBadge.${key}`) : category;
}

export function CategoryBadge({
  category,
  label,
  className,
}: CategoryBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px]',
        CATEGORY_STYLES[category] || CATEGORY_STYLES.OTHER,
        className,
      )}
    >
      {label || categoryLabel(category)}
    </Badge>
  );
}
