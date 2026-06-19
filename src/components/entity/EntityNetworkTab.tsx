import { Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fadeUp } from '@/lib/motion';

type EntityNetworkTabProps = {
  networkLoading: boolean;
  networkData?: {
    center?: any;
    nodes: any[];
    edges: any[];
    total_nodes: number;
    total_edges: number;
  } | null;
  graphDepth: number;
  setGraphDepth: (value: number) => void;
  RelationshipGraphComponent: ComponentType<{
    center: any;
    nodes: any[];
    edges: any[];
    height: string;
    depth: number;
    onDepthChange: (value: number) => void;
    totalNodes: number;
    totalEdges: number;
    onNavigate: (entityId: string) => void;
  }> | LazyExoticComponent<ComponentType<any>>;
  fallback: ReactNode;
  onNavigateEntity: (entityId: string) => void;
};

export function EntityNetworkTab({
  networkLoading,
  networkData,
  graphDepth,
  setGraphDepth,
  RelationshipGraphComponent,
  fallback,
  onNavigateEntity,
}: EntityNetworkTabProps) {
  const { t } = useTranslation();
  if (networkLoading) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{t('entity.network.loading')}</p>
      </div>
    );
  }

  if (!networkData?.center) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-medium text-foreground mb-2">{t('entity.network.empty.title')}</h3>
        <p className="text-muted-foreground">{t('entity.network.empty.description')}</p>
      </div>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <motion.div {...fadeUp}>
        <RelationshipGraphComponent
          center={networkData.center}
          nodes={networkData.nodes}
          edges={networkData.edges}
          height="600px"
          depth={graphDepth}
          onDepthChange={setGraphDepth}
          totalNodes={networkData.total_nodes}
          totalEdges={networkData.total_edges}
          onNavigate={onNavigateEntity}
        />
      </motion.div>
    </Suspense>
  );
}
