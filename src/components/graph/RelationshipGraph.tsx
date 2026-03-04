import { useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  Panel,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import {
  Maximize2,
  Filter,
  Share2,
  Download,
  User,
  Building2,
  Ship,
  Plane,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getRiskColor } from '@/lib/utils';
import type { NetworkNode, NetworkEdge } from '@/types/api';

// Custom Node Component
interface EntityNodeData {
  label: string;
  entity: NetworkNode;
  isCenter: boolean;
}

const nodeIcons: Record<string, React.ComponentType<{className?: string}>> = {
  person: User,
  individual: User,
  company: Building2,
  entity: Building2,
  vessel: Ship,
  aircraft: Plane,
  organization: Users,
  unknown: Users,
};

function EntityNode({ data, selected }: { data: Record<string, unknown>; selected?: boolean }) {
  const nodeData = data as unknown as EntityNodeData;
  const { entity, isCenter } = nodeData;
  const Icon = nodeIcons[entity.entity_type?.toLowerCase()] || Users;
  const color = getRiskColor(entity.risk_level as 'critical' | 'high' | 'medium' | 'low');

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'relative p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer',
        'bg-[#1a1a1a] backdrop-blur-sm',
        selected
          ? 'border-blue-500 shadow-lg shadow-blue-500/20'
          : isCenter
          ? 'border-purple-500 shadow-lg shadow-purple-500/20'
          : 'border-white/10 hover:border-white/20'
      )}
      style={{
        boxShadow: selected ? `0 0 20px ${color}30` : isCenter ? `0 0 20px rgba(168, 85, 247, 0.3)` : undefined,
        minWidth: '180px',
      }}
    >
      {/* Center indicator */}
      {isCenter && (
        <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-purple-500" />
      )}
      
      {/* Risk indicator */}
      <div
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />

      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white text-sm truncate">
            {entity.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 capitalize"
              style={{ borderColor: color, color }}
            >
              {entity.entity_type}
            </Badge>
            {entity.source_count && (
              <span className="text-xs text-gray-500">
                {entity.source_count} fuentes
              </span>
            )}
          </div>
          
          {/* Topics */}
          {entity.topics && entity.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entity.topics.slice(0, 2).map(topic => (
                <span key={topic} className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 capitalize">
                  {topic}
                </span>
              ))}
              {entity.topics.length > 2 && (
                <span className="text-[9px] text-gray-500">+{entity.topics.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

// Edge styles by relationship type
const edgeStyles: Record<string, { color: string; label: string }> = {
  ownership: { color: '#3b82f6', label: 'Propiedad' },
  family: { color: '#8b5cf6', label: 'Familiar' },
  directorship: { color: '#06b6d4', label: 'Directivo' },
  associate: { color: '#eab308', label: 'Asociado' },
  sanction: { color: '#ef4444', label: 'Sanción' },
  membership: { color: '#f97316', label: 'Miembro' },
  representation: { color: '#22c55e', label: 'Representante' },
  unknownlink: { color: '#6a6a6a', label: 'Otro' },
};

function getRelationshipLabel(type: string): string {
  return edgeStyles[type]?.label || type;
}

interface RelationshipGraphProps {
  center?: NetworkNode;
  nodes?: NetworkNode[];
  edges?: NetworkEdge[];
  isLoading?: boolean;
  className?: string;
  onNodeClick?: (entity: NetworkNode) => void;
  onNavigate?: (entityId: string) => void;
  height?: string;
}

export function RelationshipGraph({
  center,
  nodes = [],
  edges = [],
  isLoading,
  className,
  onNodeClick,
  onNavigate,
  height = '500px',
}: RelationshipGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);

  // Create ReactFlow nodes from network nodes
  const initialNodes: Node[] = useMemo(() => {
    if (!center) return [];
    
    const allNodes = [center, ...nodes];
    const nodeCount = allNodes.length;
    
    return allNodes.map((node, index) => {
      const isCenter = node.id === center.id;
      // Calculate position in a circle layout
      const angle = isCenter ? 0 : (index * 2 * Math.PI) / Math.max(nodeCount - 1, 1);
      const radius = isCenter ? 0 : 300;
      const x = isCenter ? 400 : 400 + radius * Math.cos(angle);
      const y = isCenter ? 300 : 300 + radius * Math.sin(angle);

      return {
        id: node.id,
        type: 'entity',
        position: { x, y },
        data: {
          label: node.name,
          entity: node,
          isCenter,
        } as unknown as Record<string, unknown>,
      };
    });
  }, [center, nodes]);

  // Create ReactFlow edges from network edges
  const initialEdges: Edge[] = useMemo(() => {
    return edges
      .filter((edge) => filterTypes.length === 0 || filterTypes.includes(edge.type))
      .map((edge, index) => {
        const style = edgeStyles[edge.type] || { color: '#6a6a6a', label: edge.type };
        return {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: edge.type === 'ownership',
          style: {
            stroke: style.color,
            strokeWidth: 2,
            strokeDasharray: edge.dashed ? '5,5' : undefined,
          },
          label: edge.label || edge.subtype || style.label,
          labelStyle: {
            fill: '#a0a0a0',
            fontSize: 11,
          },
          labelBgStyle: {
            fill: '#1a1a1a',
            stroke: '#2a2a2a',
          },
          labelBgPadding: [4, 4],
          labelBgBorderRadius: 4,
        };
      });
  }, [edges, filterTypes]);

  const [flowNodes, , onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setFlowEdges((eds) => addEdge(params, eds)),
    [setFlowEdges]
  );

  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id === selectedNode ? null : node.id);
      const nodeData = node.data as unknown as EntityNodeData;
      if (nodeData.entity) {
        onNodeClick?.(nodeData.entity);
      }
    },
    [selectedNode, onNodeClick]
  );

  const toggleFilter = (type: string) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Get unique relationship types from edges
  const availableTypes = useMemo(() => {
    const types = new Set(edges.map(e => e.type));
    return Array.from(types);
  }, [edges]);

  if (isLoading) {
    return (
      <div className={cn('rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a]', className)} style={{ height }}>
        <div className="h-full flex items-center justify-center">
          <Skeleton className="w-full h-full bg-white/5" />
        </div>
      </div>
    );
  }

  if (!center) {
    return (
      <div className={cn('rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a]', className)} style={{ height }}>
        <div className="h-full flex flex-col items-center justify-center text-gray-500">
          <Users className="w-12 h-12 mb-4" />
          <p>No hay datos de relaciones disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-xl overflow-hidden border border-white/10', className)} style={{ height }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler}
        onNodeDoubleClick={(_, node) => onNavigate?.(node.id)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-left"
        className="bg-[#0a0a0a]"
      >
        <Background
          color="#2a2a2a"
          gap={20}
          size={1}
          style={{ backgroundColor: '#0a0a0a' }}
        />
        <Controls className="bg-[#1a1a1a] border-white/10" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-[#1a1a1a] border border-white/10 rounded-lg"
          maskColor="rgba(10, 10, 10, 0.8)"
          nodeColor={(node) => {
            const data = node.data as unknown as EntityNodeData;
            return getRiskColor(data?.entity?.risk_level as 'critical' | 'high' | 'medium' | 'low' || 'low');
          }}
        />

        {/* Custom Controls Panel */}
        <Panel position="top-right" className="m-4">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-[#1a1a1a]/80 backdrop-blur border-white/10 hover:bg-white/10"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-[#1a1a1a]/80 backdrop-blur border-white/10 hover:bg-white/10"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-[#1a1a1a]/80 backdrop-blur border-white/10 hover:bg-white/10"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </Panel>

        {/* Filter Panel */}
        {availableTypes.length > 0 && (
          <Panel position="top-left" className="m-4">
            <div className="glass rounded-xl p-3 space-y-3 max-w-[250px]">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Filter className="w-4 h-4" />
                <span>Filtrar Relaciones</span>
                <span className="text-xs text-gray-500">({edges.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map((type) => {
                  const style = edgeStyles[type] || { color: '#6a6a6a', label: type };
                  const isActive = filterTypes.length === 0 || filterTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleFilter(type)}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-all',
                        isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                      )}
                      style={{
                        backgroundColor: `${style.color}20`,
                        color: style.color,
                        border: `1px solid ${style.color}40`,
                      }}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>
        )}

        {/* Legend Panel */}
        <Panel position="bottom-left" className="m-4">
          <div className="glass rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Tipos de Entidad</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(nodeIcons).slice(0, 4).map(([type, Icon]) => (
                <div key={type} className="flex items-center gap-2">
                  <Icon className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400 capitalize">{type}</span>
                </div>
              ))}
            </div>
            
            {onNavigate && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-[10px] text-gray-500">
                  Doble clic en un nodo para navegar
                </p>
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default RelationshipGraph;
