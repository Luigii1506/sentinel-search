import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SOURCE_LEVELS = [
  { level: 1 as const, labelKey: 'critical', descKey: 'criticalDesc' },
  { level: 2 as const, labelKey: 'sanctions', descKey: 'sanctionsDesc' },
  { level: 3 as const, labelKey: 'pepCompliance', descKey: 'pepComplianceDesc' },
  { level: 4 as const, labelKey: 'complete', descKey: 'completeDesc' },
  { level: 5 as const, labelKey: 'interest', descKey: 'interestDesc' },
] as const;

interface SourceLevelSelectorProps {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (level: 1 | 2 | 3 | 4 | 5) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SourceLevelSelector({ value, onChange, className, size = 'md' }: SourceLevelSelectorProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("space-y-2", className)}>
      <span className={cn("block text-muted-foreground", size === 'sm' ? 'text-[10px]' : 'text-xs')}>{t('components.sourceLevel.label')}</span>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
      {SOURCE_LEVELS.map(({ level, labelKey, descKey }) => (
        <TooltipProvider key={level}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(level)}
                className={cn(
                  "shrink-0 font-medium border transition-all duration-200 whitespace-nowrap",
                  size === 'sm' ? 'px-2.5 py-1 rounded-full text-[10px]' : 'px-3 py-1.5 rounded-full text-xs',
                  value === level
                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30"
                    : "bg-foreground/5 text-muted-foreground border-foreground/10 hover:border-foreground/20 hover:text-muted-foreground"
                )}
              >
                {t(`components.sourceLevel.${labelKey}`)}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{t(`components.sourceLevel.${descKey}`)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      </div>
    </div>
  );
}
