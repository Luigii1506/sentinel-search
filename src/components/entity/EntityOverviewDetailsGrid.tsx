import { CreditCard, FileText, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fadeUp } from '@/lib/motion';
import type { APIEntity } from '@/types/api';

export type ValidAddress = {
  street?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  postal_code?: string | null | undefined;
  country?: string | null | undefined;
  full_address?: string | null | undefined;
  address?: string | null | undefined;
  is_current?: boolean | null;
};

type EntityOverviewDetailsGridProps = {
  entity: APIEntity;
  validAddresses: ValidAddress[];
  showAllAliases: boolean;
  setShowAllAliases: (value: boolean | ((value: boolean) => boolean)) => void;
  countryNames: Record<string, string>;
  formatAddressValue: (address: ValidAddress) => string | null;
  getAliasTypeLabel: (type: string) => string;
};

export function EntityOverviewDetailsGrid({
  entity,
  validAddresses,
  showAllAliases,
  setShowAllAliases,
  countryNames,
  formatAddressValue,
  getAliasTypeLabel,
}: EntityOverviewDetailsGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {entity.identifications?.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="glass rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <CreditCard className="w-4 h-4" />
            Identificaciones
          </h3>
          <div className="space-y-2">
            {entity.identifications.map((ident, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-foreground/5 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                    {ident.label || ident.type.toUpperCase()}
                  </Badge>
                  <span className="text-foreground font-mono text-sm break-all">{ident.number}</span>
                </div>
                {ident.country && (
                  <span className="text-[10px] text-gray-500">{countryNames[ident.country] || ident.country}</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {entity.aliases.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="glass rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <FileText className="w-4 h-4" />
            Nombres y Alias
            <span className="text-[10px] text-gray-600 ml-auto">{entity.aliases?.length || 0}</span>
          </h3>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(showAllAliases ? entity.aliases : entity.aliases.slice(0, 12)).map((alias, i) => (
                <div
                  key={`${alias.name}-${i}`}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5"
                >
                  <span className="text-sm text-foreground break-words max-w-full">{alias.name}</span>
                  <Badge variant="outline" className="text-[10px] text-gray-400 shrink-0 border-foreground/10">
                    {getAliasTypeLabel(alias.type)}
                  </Badge>
                </div>
              ))}
            </div>
            {entity.aliases.length > 12 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllAliases((value) => !value)}
                className="text-xs text-blue-400 hover:text-blue-300 px-0"
              >
                {showAllAliases ? 'Mostrar menos' : `Ver todos los alias (${entity.aliases?.length || 0})`}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {validAddresses.length > 1 && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="glass rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <MapPin className="w-4 h-4" />
            Direcciones
          </h3>
          <div className="space-y-2">
            {validAddresses.slice(0, 5).map((addr, i) => (
              <div key={i} className="p-2 rounded-lg bg-foreground/[0.03]">
                <p className="text-sm text-foreground">{formatAddressValue(addr)}</p>
                {addr.is_current && (
                  <Badge className="text-[10px] bg-green-500/10 text-green-400 mt-1">Actual</Badge>
                )}
              </div>
            ))}
            {validAddresses.length > 5 && (
              <p className="text-[10px] text-gray-600">+{validAddresses.length - 5} más</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
