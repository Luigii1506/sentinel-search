import { motion } from 'framer-motion';
import { Brain, Search, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SemanticSearchToggleProps {
  mode: 'traditional' | 'semantic' | 'auto';
  onChange: (mode: 'traditional' | 'semantic' | 'auto') => void;
  className?: string;
}

export function SemanticSearchToggle({ mode, onChange, className }: SemanticSearchToggleProps) {
  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {/* Toggle Switch */}
        <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
          {/* Traditional Button */}
          <button
            onClick={() => onChange('traditional')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'traditional'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Tradicional</span>
          </button>

          {/* Semantic Button */}
          <button
            onClick={() => onChange('semantic')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'semantic'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Smart Search</span>
            <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">v5.0</span>
          </button>
        </div>

        {/* Info Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400">
              <Info className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">
                {mode === 'semantic' ? '🧠 Búsqueda Semántica' : '🔤 Búsqueda Tradicional'}
              </p>
              <p className="text-sm text-gray-400">
                {mode === 'semantic'
                  ? 'Busca por significado, no solo por texto. Ideal para investigaciones y conceptos abstractos como "terrorismo financiero" o "lavado de dinero".'
                  : 'Busca por coincidencia de texto. Ideal para nombres exactos y búsquedas literales.'}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Stats Badge when Semantic */}
        {mode === 'semantic' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden md:flex items-center gap-1 text-xs text-gray-500"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>526K embeddings</span>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default SemanticSearchToggle;
