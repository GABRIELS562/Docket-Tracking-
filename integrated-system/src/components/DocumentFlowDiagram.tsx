/**
 * Interactive Document Flow Diagram Component
 * Visualizes document lifecycle and workflow patterns
 */

import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  NodeProps,
  ConnectionMode,
  ReactFlowProvider,
  useReactFlow
} from 'react-flow-renderer';

interface FlowNode extends Node {
  data: {
    label: string;
    type: 'entry' | 'process' | 'decision' | 'storage' | 'retrieval' | 'archive';
    count?: number;
    avgTime?: string;
    status?: 'active' | 'idle' | 'blocked';
    metadata?: any;
  };
}

interface FlowEdge extends Edge {
  data?: {
    count?: number;
    avgTime?: string;
  };
  animated?: boolean;
  style?: React.CSSProperties;
}

interface FlowDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodeClick?: (node: FlowNode) => void;
  onEdgeClick?: (edge: FlowEdge) => void;
  interactive?: boolean;
}

// Custom Node Components
const ProcessNode: React.FC<NodeProps> = ({ data, selected }) => {
  const getStatusColor = () => {
    switch (data.status) {
      case 'active': return '#4CAF50';
      case 'blocked': return '#f44336';
      default: return '#2196F3';
    }
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      background: getStatusColor(),
      color: 'white',
      border: selected ? '2px solid #333' : '1px solid #777',
      minWidth: '150px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.label}</div>
      {data.count && (
        <div style={{ fontSize: '12px' }}>Count: {data.count}</div>
      )}
      {data.avgTime && (
        <div style={{ fontSize: '12px' }}>Avg: {data.avgTime}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const DecisionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div style={{
      width: '120px',
      height: '120px',
      background: '#FFC107',
      transform: 'rotate(45deg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: selected ? '2px solid #333' : '1px solid #777',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ left: '10%', top: '50%' }}
      />
      <div style={{
        transform: 'rotate(-45deg)',
        color: 'black',
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '10px'
      }}>
        {data.label}
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ right: '10%', top: '50%' }}
        id="yes"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ bottom: '10%', left: '50%' }}
        id="no"
      />
    </div>
  );
};

const StorageNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div style={{
      padding: '15px 20px',
      borderRadius: '50%',
      background: '#9C27B0',
      color: 'white',
      border: selected ? '2px solid #333' : '1px solid #777',
      minWidth: '120px',
      minHeight: '120px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ fontWeight: 'bold' }}>📦</div>
      <div style={{ fontWeight: 'bold', marginTop: '5px' }}>{data.label}</div>
      {data.count && (
        <div style={{ fontSize: '11px', marginTop: '5px' }}>Items: {data.count}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes = {
  process: ProcessNode,
  decision: DecisionNode,
  storage: StorageNode,
};

// Flow Controls Panel
const FlowControls: React.FC<{
  onAddNode: () => void;
  onAutoLayout: () => void;
  onExport: () => void;
  onSimulate: () => void;
  isSimulating: boolean;
}> = ({ onAddNode, onAutoLayout, onExport, onSimulate, isSimulating }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'white',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 1000
    }}>
      <button onClick={onAddNode} style={{ padding: '5px 10px' }}>
        ➕ Add Node
      </button>
      <button onClick={onAutoLayout} style={{ padding: '5px 10px' }}>
        🔧 Auto Layout
      </button>
      <button onClick={onSimulate} style={{ padding: '5px 10px' }}>
        {isSimulating ? '⏸️ Stop' : '▶️ Simulate'}
      </button>
      <button onClick={onExport} style={{ padding: '5px 10px' }}>
        💾 Export
      </button>
    </div>
  );
};

// Statistics Panel
const FlowStatistics: React.FC<{
  nodes: FlowNode[];
  edges: FlowEdge[];
}> = ({ nodes, edges }) => {
  const stats = {
    totalNodes: nodes.length,
    activeNodes: nodes.filter(n => n.data.status === 'active').length,
    blockedNodes: nodes.filter(n => n.data.status === 'blocked').length,
    totalConnections: edges.length,
    avgProcessTime: '2.5 hours',
    throughput: '150 docs/day'
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '10px',
      left: '10px',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '15px',
      borderRadius: '5px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      minWidth: '200px',
      zIndex: 1000
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>Flow Statistics</h4>
      <div style={{ display: 'grid', gap: '5px', fontSize: '13px' }}>
        <div>Total Nodes: {stats.totalNodes}</div>
        <div>Active: {stats.activeNodes}</div>
        <div>Blocked: {stats.blockedNodes}</div>
        <div>Connections: {stats.totalConnections}</div>
        <div>Avg Time: {stats.avgProcessTime}</div>
        <div>Throughput: {stats.throughput}</div>
      </div>
    </div>
  );
};

// Main Flow Diagram Component
const DocumentFlowDiagram: React.FC<FlowDiagramProps> = ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodeClick,
  onEdgeClick,
  interactive = true
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();

  // Handle connections
  const onConnect = useCallback((params: any) => {
    const newEdge: FlowEdge = {
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#2196F3', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#2196F3'
      }
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // Add new node
  const handleAddNode = () => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: 'process',
      position: { x: 250, y: 250 },
      data: {
        label: 'New Process',
        type: 'process',
        status: 'idle'
      }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Auto layout
  const handleAutoLayout = () => {
    // Simple auto-layout algorithm
    const layoutNodes = [...nodes];
    const levels: { [key: string]: number } = {};
    const nodesByLevel: { [key: number]: FlowNode[] } = {};
    
    // Find entry nodes (no incoming edges)
    const entryNodes = layoutNodes.filter(node => 
      !edges.some(edge => edge.target === node.id)
    );
    
    // Assign levels using BFS
    const queue = entryNodes.map(n => ({ node: n, level: 0 }));
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const { node, level } = queue.shift()!;
      if (visited.has(node.id)) continue;
      
      visited.add(node.id);
      levels[node.id] = level;
      
      if (!nodesByLevel[level]) nodesByLevel[level] = [];
      nodesByLevel[level].push(node);
      
      // Add connected nodes to queue
      edges
        .filter(e => e.source === node.id)
        .forEach(e => {
          const targetNode = layoutNodes.find(n => n.id === e.target);
          if (targetNode) {
            queue.push({ node: targetNode, level: level + 1 });
          }
        });
    }
    
    // Position nodes
    const horizontalSpacing = 200;
    const verticalSpacing = 150;
    
    Object.keys(nodesByLevel).forEach(levelStr => {
      const level = parseInt(levelStr);
      const nodesInLevel = nodesByLevel[level];
      const totalWidth = (nodesInLevel.length - 1) * horizontalSpacing;
      
      nodesInLevel.forEach((node, index) => {
        node.position = {
          x: 400 - totalWidth / 2 + index * horizontalSpacing,
          y: 100 + level * verticalSpacing
        };
      });
    });
    
    setNodes(layoutNodes);
  };

  // Simulate flow
  useEffect(() => {
    if (!isSimulating) return;
    
    const interval = setInterval(() => {
      setEdges(edges => edges.map(edge => ({
        ...edge,
        animated: Math.random() > 0.5,
        style: {
          ...edge.style,
          stroke: Math.random() > 0.7 ? '#ff0000' : '#2196F3'
        }
      })));
      
      setNodes(nodes => nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: ['active', 'idle', 'blocked'][Math.floor(Math.random() * 3)] as any,
          count: Math.floor(Math.random() * 100)
        }
      })));
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isSimulating, setEdges, setNodes]);

  // Export diagram
  const handleExport = () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      const dataStr = JSON.stringify(flow, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'document-flow.json';
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  // Handle node click
  const handleNodeClick = (event: React.MouseEvent, node: FlowNode) => {
    setSelectedNode(node.id);
    onNodeClick?.(node);
  };

  // Handle edge click
  const handleEdgeClick = (event: React.MouseEvent, edge: FlowEdge) => {
    onEdgeClick?.(edge);
  };

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={interactive ? onNodesChange : undefined}
        onEdgesChange={interactive ? onEdgesChange : undefined}
        onConnect={interactive ? onConnect : undefined}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.data?.status) {
              case 'active': return '#4CAF50';
              case 'blocked': return '#f44336';
              default: return '#2196F3';
            }
          }}
          style={{
            height: 100,
            width: 150
          }}
        />
      </ReactFlow>
      
      <FlowControls
        onAddNode={handleAddNode}
        onAutoLayout={handleAutoLayout}
        onExport={handleExport}
        onSimulate={() => setIsSimulating(!isSimulating)}
        isSimulating={isSimulating}
      />
      
      <FlowStatistics nodes={nodes} edges={edges} />
      
      {selectedNode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(33, 150, 243, 0.9)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          zIndex: 1000
        }}>
          Selected: {nodes.find(n => n.id === selectedNode)?.data.label}
        </div>
      )}
    </div>
  );
};

// Wrapper component with ReactFlowProvider
const DocumentFlowDiagramWrapper: React.FC<FlowDiagramProps> = (props) => {
  return (
    <ReactFlowProvider>
      <DocumentFlowDiagram {...props} />
    </ReactFlowProvider>
  );
};

export default DocumentFlowDiagramWrapper;