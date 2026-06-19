import { motion } from 'framer-motion';
import { 
  Database, 
  Sparkles, 
  BrainCircuit,
  Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SearchMode = 'auto' | 'traditional' | 'semantic';

interface SearchModeToggleProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  className?: string;
}

interface ModeOption {
  value: SearchMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function SearchModeToggle({ mode, onChange, className }: SearchModeToggleProps) {
  const { t } = useTranslation();
  const modes: ModeOption[] = [
    {
      value: 'auto',
      label: t('components.search.modeToggle.auto'),
      description: t('components.search.modeToggle.autoDesc'),
      icon: <BrainCircuit className="w-4 h-4" />,
      color: 'bg-blue-500',
    },
    {
      value: 'traditional',
      label: t('components.search.modeToggle.names'),
      description: t('components.search.modeToggle.namesDesc'),
      icon: <Database className="w-4 h-4" />,
      color: 'bg-green-500',
    },
    {
      value: 'semantic',
      label: t('components.search.modeToggle.concepts'),
      description: t('components.search.modeToggle.conceptsDesc'),
      icon: <Sparkles className="w-4 h-4" />,
      color: 'bg-purple-500',
    },
  ];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground mr-2">{t('components.search.modeToggle.label')}</span>
      
      <div className="flex bg-foreground/5 rounded-lg p-1 gap-1">
        {modes.map((option) => (
          <TooltipProvider key={option.value}>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    mode === option.value
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-gray-200 hover:bg-foreground/5"
                  )}
                >
                  <span className={cn(
                    "transition-colors",
                    mode === option.value ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {option.icon}
                  </span>
                  <span>{option.label}</span>
                  {mode === option.value && (
                    <motion.div
                      layoutId="activeMode"
                      className={cn("absolute inset-0 rounded-md -z-10", option.color)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.2 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-1.5 hover:bg-foreground/10 rounded-full transition-colors">
              <Info className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm">
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t('components.search.modeToggle.helpTitle')}</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><strong className="text-blue-600 dark:text-blue-400">{t('components.search.modeToggle.auto')}:</strong> {t('components.search.modeToggle.helpAuto')}</li>
                <li><strong className="text-green-700 dark:text-green-400">{t('components.search.modeToggle.names')}:</strong> {t('components.search.modeToggle.helpNames')}</li>
                <li><strong className="text-purple-600 dark:text-purple-400">{t('components.search.modeToggle.concepts')}:</strong> {t('components.search.modeToggle.helpConcepts')}</li>
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default SearchModeToggle;
