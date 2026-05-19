"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { EventNode } from "./EventNode";
import { CausalEdge } from "./CausalEdge";
import { GraphControls } from "./GraphControls";
import { GraphEditor } from "./GraphEditor";
import { LoadingState } from "@/components/shared/LoadingState";
import { useGraph, type FlowNode, type FlowEdge } from "@/hooks/useGraph";
import type { GraphNode, GraphEdge } from "@/lib/types";

const nodeTypes: NodeTypes = {
  eventNode: EventNode as unknown as NodeTypes[string],
};

const edgeTypes: EdgeTypes = {
  causalEdge: CausalEdge as unknown as EdgeTypes[string],
};

interface CausalGraphProps {
  graphNodes?: GraphNode[];
  graphEdges?: GraphEdge[];
  isLoading?: boolean;
}

export function CausalGraph({
  graphNodes,
  graphEdges,
  isLoading,
}: CausalGraphProps) {
  const {
    nodes,
    edges,
    direction,
    selectedNodeId,
    selectedEdgeId,
    setSelectedNodeId,
    setSelectedEdgeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setGraphData,
    relayout,
    updateNode,
    updateEdge,
    removeNode,
    removeEdge,
  } = useGraph();

  const rfInstance = useRef<ReactFlowInstance | null>(null);

  // Set graph data when props change, then re-fit
  useEffect(() => {
    if (graphNodes && graphEdges) {
      setGraphData(graphNodes, graphEdges);
      // Fit after React Flow re-renders with new nodes
      setTimeout(() => {
        rfInstance.current?.fitView({ padding: 0.05, duration: 400, maxZoom: 1.3 });
      }, 80);
    }
  }, [graphNodes, graphEdges, setGraphData]);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
  }, []);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    },
    [setSelectedNodeId, setSelectedEdgeId]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: FlowEdge) => {
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
    },
    [setSelectedEdgeId, setSelectedNodeId]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  const selectedNode = useMemo(
    () =>
      selectedNodeId
        ? (nodes.find((n) => n.id === selectedNodeId) as FlowNode | undefined) || null
        : null,
    [nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () =>
      selectedEdgeId
        ? (edges.find((e) => e.id === selectedEdgeId) as FlowEdge | undefined) || null
        : null,
    [edges, selectedEdgeId]
  );

  if (isLoading && (!graphNodes || graphNodes.length === 0)) {
    return <LoadingState variant="graph" />;
  }

  if (!graphNodes || graphNodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
        The causal graph will appear here once analysis begins.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" data-graph-container>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick as any}
        onEdgeClick={handleEdgeClick as any}
        onPaneClick={handlePaneClick}
        onInit={handleInit as any}
        fitView
        fitViewOptions={{ padding: 0.05, duration: 400, maxZoom: 1.3 }}
        minZoom={0.15}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        className="bg-[var(--bg-secondary)]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={0.8}
          color="var(--border-subtle)"
        />
        <GraphControls direction={direction} onLayoutChange={relayout} />
      </ReactFlow>

      <GraphEditor
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onClose={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        onUpdateNode={updateNode}
        onUpdateEdge={updateEdge}
        onDeleteNode={removeNode}
        onDeleteEdge={removeEdge}
      />
    </div>
  );
}
