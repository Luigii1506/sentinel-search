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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getRiskColor, getRelationshipTypeLabel } from '@/lib/utils';
import type { Entity, RelationshipType } from '@/types';

// Custom Node Component
interface EntityNodeData {
  label: string;
  entity: Entity;
  riskLevel: string;
  isExpanded: boolean;
}

const nodeIcons = {
  person: User,
  company: Building2,
  vessel: Ship,
  aircraft: Plane,
  organization: Users,
};

function EntityNode({ data, selected }: { data: Record<string, unknown>; selected?: boolean }) {
  const nodeData = data as unknown as EntityNodeData;
  const { entity, riskLevel } = nodeData;
  const Icon = nodeIcons[entity.type] || Users;
  const color = getRiskColor(riskLevel);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'relative p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer',
        'bg-[#1a1a1a] backdrop-blur-sm',
        selected
          ? 'border-blue-500 shadow-lg shadow-blue-500/20'
          : 'border-white/10 hover:border-white/20'
      )}
      style={{
        boxShadow: selected ? `0 0 20px ${color}30` : undefined,
      }}
    >
      {/* Risk indicator */}
      <div
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />

      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>

        {/* Content */}
        <div className="min-w-0">
          <p className="font-medium text-white text-sm truncate max-w-[150px]">
            {entity.primaryName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              style={{ borderColor: color, color }}
            >
              {entity.type}
            </Badge>
            <span className="text-xs text-gray-500">
              Score: {entity.overallRiskScore}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

// Edge styles by relationship type
const edgeStyles: Record<RelationshipType, { color: string; style: string }> = {
  ownership: { color: '#3b82f6', style: 'solid' },
  family: { color: '#8b5cf6', style: 'solid' },
  employment: { color: '#06b6d4', style: 'solid' },
  partnership: { color: '#eab308', style: 'dashed' },
  transaction: { color: '#f97316', style: 'dashed' },
  shared_address: { color: '#6a6a6a', style: 'dotted' },
  shared_contact: { color: '#6a6a6a', style: 'dotted' },
  legal_rep: { color: '#22c55e', style: 'solid' },
  beneficial_owner: { color: '#ef4444', style: 'solid' },
};

interface RelationshipGraphProps {
  entities: Entity[];
  relationships: Array<{
    id: string;
    source: string;
    target: string;
    type: RelationshipType;
    data?: { label?: string; confidence?: number };
  }>;
  centerEntityId?: string;
  className?: string;
  onNodeClick?: (entity: Entity) => void;
  height?: string;
}

export function RelationshipGraph({
  entities,
  relationships,
  centerEntityId,
  className,
  onNodeClick,
  height = '600px',
}: RelationshipGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filterTypes, setFilterTypes] = useState<RelationshipType[]>([]);

  // Create nodes from entities
  const initialNodes: Node[] = useMemo(() => {
    return entities.map((entity, index) => {
      const isCenter = entity.id === centerEntityId;
      const angle = (index * 2 * Math.PI) / Math.max(entities.length, 1);
      const radius = isCenter ? 0 : 250;
      const x = isCenter ? 400 : 400 + radius * Math.cos(angle);
      const y = isCenter ? 300 : 300 + radius * Math.sin(angle);

      return {
        id: entity.id,
        type: 'entity',
        position: { x, y },
        data: {
          label: entity.primaryName,
          entity,
          riskLevel: entity.riskLevel,
          isExpanded: isCenter,
        } as unknown as Record<string, unknown>,
      };
    });
  }, [entities, centerEntityId]);

  // Create edges from relationships
  const initialEdges: Edge[] = useMemo(() => {
    return relationships
      .filter((rel) => filterTypes.length === 0 || filterTypes.includes(rel.type))
      .map((rel) => {
        const style = edgeStyles[rel.type];
        return {
          id: rel.id,
          source: rel.source,
          target: rel.target,
          type: 'smoothstep',
          animated: rel.type === 'transaction',
          style: {
            stroke: style.color,
            strokeWidth: 2,
            strokeDasharray:
              style.style === 'dashed' ? '5,5' : style.style === 'dotted' ? '2,2' : undefined,
          },
          label: rel.data?.label || getRelationshipTypeLabel(rel.type),
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
  }, [relationships, filterTypes]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id === selectedNode ? null : node.id);
      const entityData = node.data as unknown as EntityNodeData;
      if (entityData.entity) {
        onNodeClick?.(entityData.entity);
      }
    },
    [selectedNode, onNodeClick]
  );

  const toggleFilter = (type: RelationshipType) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className={cn('relative rounded-xl overflow-hidden border border-white/10', className)} style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler}
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
            return getRiskColor(data?.riskLevel || 'low');
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
        <Panel position="top-left" className="m-4">
          <div className="glass rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Filter className="w-4 h-4" />
              <span>Filter Relationships</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(edgeStyles).map(([type, style]) => (
                <button
                  key={type}
                  onClick={() => toggleFilter(type as RelationshipType)}
                  className={cn(
                    'px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-all',
                    filterTypes.includes(type as RelationshipType)
                      ? 'opacity-100'
                      : 'opacity-40 hover:opacity-70'
                  )}
                  style={{
                    backgroundColor: `${style.color}20`,
                    color: style.color,
                    border: `1px solid ${style.color}40`,
                  }}
                >
                  {getRelationshipTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="bottom-left" className="m-4">
          <div className="glass rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Entity Types</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(nodeIcons).map(([type, Icon]) => (
                <div key={type} className="flex items-center gap-2">
                  <Icon className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default RelationshipGraph;
