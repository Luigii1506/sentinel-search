import { useCallback, useState, useMemo, useEffect } from 'react';
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
  Minimize2,
  Filter,
  Share2,
  Download,
  User,
  Building2,
  Ship,
  Plane,
  Users,
  Layers,
  Activity,
  X,
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
          <Icon className={`w-5 h-5`} />
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
  sanction: { color: '#ef4444', label: 'Sancion' },
  membership: { color: '#f97316', label: 'Miembro' },
  representation: { color: '#22c55e', label: 'Representante' },
  unknownlink: { color: '#6a6a6a', label: 'Otro' },
};

interface RelationshipGraphProps {
  center?: NetworkNode;
  nodes?: NetworkNode[];
  edges?: NetworkEdge[];
  isLoading?: boolean;
  className?: string;
  onNodeClick?: (entity: NetworkNode) => void;
  onNavigate?: (entityId: string) => void;
  height?: string;
  depth?: number;
  onDepthChange?: (depth: number) => void;
  totalNodes?: number;
  totalEdges?: number;
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
  depth = 2,
  onDepthChange,
  totalNodes,
  totalEdges,
}: RelationshipGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [minStrength, setMinStrength] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter edges by strength and type (client-side)
  const filteredEdges = useMemo(() => {
    return edges.filter(e => {
      if (filterTypes.length > 0 && !filterTypes.includes(e.type)) return false;
      if (minStrength > 0) {
        const strength = (e.properties?.relationship_strength as number) ?? 0.5;
        if (strength < minStrength / 100) return false;
      }
      return true;
    });
  }, [edges, filterTypes, minStrength]);

  // Compute visible node IDs from filtered edges
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (center) ids.add(center.id);
    for (const e of filteredEdges) {
      ids.add(e.source);
      ids.add(e.target);
    }
    return ids;
  }, [center, filteredEdges]);

  // Create ReactFlow nodes from network nodes
  const initialNodes: Node[] = useMemo(() => {
    if (!center) return [];

    const allNodes = [center, ...nodes].filter(n => visibleNodeIds.has(n.id));
    const nodeCount = allNodes.length;

    return allNodes.map((node, index) => {
      const isCenter = node.id === center.id;
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
  }, [center, nodes, visibleNodeIds]);

  // Create ReactFlow edges from filtered network edges
  const initialEdges: Edge[] = useMemo(() => {
    return filteredEdges.map((edge, index) => {
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
        labelBgPadding: [4, 4] as [number, number],
        labelBgBorderRadius: 4,
      };
    });
  }, [filteredEdges]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync flow state when data changes (depth change, filters, etc.)
  useEffect(() => {
    setFlowNodes(initialNodes);
  }, [initialNodes, setFlowNodes]);

  useEffect(() => {
    setFlowEdges(initialEdges);
  }, [initialEdges, setFlowEdges]);

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

  // Get unique relationship types from all edges (not filtered)
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

  const graphContent = (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden border border-white/10',
        isFullscreen ? 'h-full border-0 rounded-none' : '',
        className
      )}
      style={isFullscreen ? undefined : { height }}
    >
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

        {/* Action Buttons - Top Right */}
        <Panel position="top-right" className="m-4">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-[#1a1a1a]/80 backdrop-blur border-white/10 hover:bg-white/10"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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

        {/* Unified Controls Panel - Top Left */}
        <Panel position="top-left" className="m-4">
          <div className="glass rounded-xl p-3 space-y-3 max-w-[280px]">
            {/* Depth Selector */}
            {onDepthChange && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Profundidad</span>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((d) => (
                    <button
                      key={d}
                      onClick={() => onDepthChange(d)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        depth === d
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Strength Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Fuerza min.</span>
                </div>
                <span className="text-xs text-gray-500">{minStrength}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minStrength}
                onChange={(e) => setMinStrength(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                  bg-white/10 accent-blue-500
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-blue-400
                  [&::-webkit-slider-thumb]:shadow-sm
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>

            {/* Type Filters */}
            {availableTypes.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Tipo</span>
                  <span className="text-gray-500">({filteredEdges.length})</span>
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
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 pt-1 border-t border-white/5 text-xs text-gray-500">
              <span>{visibleNodeIds.size}{totalNodes && totalNodes !== visibleNodeIds.size ? `/${totalNodes}` : ''} nodos</span>
              <span className="text-gray-600">·</span>
              <span>{filteredEdges.length}{totalEdges && totalEdges !== filteredEdges.length ? `/${totalEdges}` : ''} relaciones</span>
            </div>
          </div>
        </Panel>

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

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a]">
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 z-[60] p-2 rounded-lg bg-[#1a1a1a]/80 backdrop-blur border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {graphContent}
      </div>
    );
  }

  return graphContent;
}

export default RelationshipGraph;
