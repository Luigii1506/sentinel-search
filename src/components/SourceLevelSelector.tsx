import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SOURCE_LEVELS = [
  { level: 1 as const, label: 'Crítico', desc: 'OFAC, ONU, EU, UK HMT, Interpol, FBI, DEA, BIS' },
  { level: 2 as const, label: 'Sanciones', desc: '+ Sanciones, Terrorismo, Law Enforcement restantes' },
  { level: 3 as const, label: 'PEP & Compliance', desc: '+ PEP, Inhabilitaciones, Regulatorio, Fiscal' },
  { level: 4 as const, label: 'Completo', desc: 'Todas las fuentes oficiales (Corporate, Media, Otros)' },
  { level: 5 as const, label: 'Interés', desc: '+ Personas de interés (Wikidata: familiares, asociados)' },
] as const;

interface SourceLevelSelectorProps {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (level: 1 | 2 | 3 | 4 | 5) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SourceLevelSelector({ value, onChange, className, size = 'md' }: SourceLevelSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <span className={cn("block text-gray-500", size === 'sm' ? 'text-[10px]' : 'text-xs')}>Nivel de cobertura</span>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
      {SOURCE_LEVELS.map(({ level, label, desc }) => (
        <TooltipProvider key={level}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(level)}
                className={cn(
                  "shrink-0 font-medium border transition-all duration-200 whitespace-nowrap",
                  size === 'sm' ? 'px-2.5 py-1 rounded-full text-[10px]' : 'px-3 py-1.5 rounded-full text-xs',
                  value === level
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-gray-300"
                )}
              >
                {label}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{desc}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      </div>
    </div>
  );
}
