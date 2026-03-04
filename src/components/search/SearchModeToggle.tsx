import { motion } from 'framer-motion';
import { 
  Database, 
  Sparkles, 
  BrainCircuit,
  Info
} from 'lucide-react';
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

const modes: ModeOption[] = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'El sistema elige automáticamente la mejor estrategia según tu query',
    icon: <BrainCircuit className="w-4 h-4" />,
    color: 'bg-blue-500',
  },
  {
    value: 'traditional',
    label: 'Nombres',
    description: 'Búsqueda exacta y fonética para nombres de personas/empresas',
    icon: <Database className="w-4 h-4" />,
    color: 'bg-green-500',
  },
  {
    value: 'semantic',
    label: 'Conceptos',
    description: 'Búsqueda semántica por conceptos abstractos (riesgo, actividades)',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'bg-purple-500',
  },
];

export function SearchModeToggle({ mode, onChange, className }: SearchModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-gray-400 mr-2">Modo:</span>
      
      <div className="flex bg-white/5 rounded-lg p-1 gap-1">
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
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  )}
                >
                  <span className={cn(
                    "transition-colors",
                    mode === option.value ? "text-white" : "text-gray-500"
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
                  <p className="text-xs text-gray-400">{option.description}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <Info className="w-4 h-4 text-gray-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm">
            <div className="space-y-2 text-sm">
              <p className="font-medium">¿Qué modo elegir?</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li><strong className="text-blue-400">Auto:</strong> Recomendado. El sistema detecta automáticamente si buscas un nombre o concepto.</li>
                <li><strong className="text-green-400">Nombres:</strong> Mejor para "Juan García", "Empresa XYZ". Usa OpenSearch + fonético.</li>
                <li><strong className="text-purple-400">Conceptos:</strong> Mejor para "terrorismo financiero", "alto riesgo". Usa embeddings.</li>
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default SearchModeToggle;
