"use client";

import { useState, useCallback } from "react";
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  addEdge as rfAddEdge,
  type Connection,
} from "@xyflow/react";
import type { GraphNode, GraphEdge, EventData, EdgeData } from "@/lib/types";
import { autoLayout, type LayoutDirection } from "@/lib/graph-layout";
import { generateId } from "@/lib/utils";

export type FlowNode = Node<EventData>;
export type FlowEdge = Edge<EdgeData>;

function toFlowNodes(graphNodes: GraphNode[]): FlowNode[] {
  return graphNodes.map((n) => ({
    id: n.id,
    type: "eventNode",
    position: n.position,
    data: n.data,
  }));
}

function toFlowEdges(graphEdges: GraphEdge[]): FlowEdge[] {
  const seen = new Set<string>();
  return graphEdges
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "causalEdge",
      data: e.data,
    }));
}

function fromFlowNodes(flowNodes: FlowNode[]): GraphNode[] {
  return flowNodes.map((n) => ({
    id: n.id,
    type: n.type || "eventNode",
    data: n.data as EventData,
    position: n.position,
  }));
}

function fromFlowEdges(flowEdges: FlowEdge[]): GraphEdge[] {
  return flowEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    data: e.data as EdgeData,
  }));
}

export function useGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [direction, setDirection] = useState<LayoutDirection>("TB");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const setGraphData = useCallback(
    (graphNodes: GraphNode[], graphEdges: GraphEdge[]) => {
      const laid = autoLayout(graphNodes, graphEdges, direction);
      setNodes(toFlowNodes(laid));
      setEdges(toFlowEdges(graphEdges));
    },
    [direction, setNodes, setEdges]
  );

  const relayout = useCallback(
    (dir?: LayoutDirection) => {
      const d = dir || direction;
      if (dir) setDirection(d);
      const gn = fromFlowNodes(nodes as FlowNode[]);
      const ge = fromFlowEdges(edges as FlowEdge[]);
      const laid = autoLayout(gn, ge, d);
      setNodes(toFlowNodes(laid));
    },
    [direction, nodes, edges, setNodes]
  );

  const addNode = useCallback(
    (data: EventData, position?: { x: number; y: number }) => {
      const id = generateId();
      const newNode: FlowNode = {
        id,
        type: "eventNode",
        position: position || { x: 0, y: 0 },
        data,
      };
      setNodes((nds) => [...nds, newNode]);
      return id;
    },
    [setNodes]
  );

  const removeNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges]
  );

  const updateNode = useCallback(
    (id: string, data: Partial<EventData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } as EventData } : n
        )
      );
    },
    [setNodes]
  );

  const addEdge = useCallback(
    (source: string, target: string, data: EdgeData) => {
      const id = generateId();
      const newEdge: FlowEdge = { id, source, target, type: "causalEdge", data };
      setEdges((eds) => [...eds, newEdge]);
      return id;
    },
    [setEdges]
  );

  const removeEdge = useCallback(
    (id: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== id));
    },
    [setEdges]
  );

  const updateEdge = useCallback(
    (id: string, data: Partial<EdgeData>) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === id ? { ...e, data: { ...e.data, ...data } as EdgeData } : e
        )
      );
    },
    [setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        rfAddEdge(
          {
            ...connection,
            type: "causalEdge",
            data: {
              label: "relates to",
              type: "contributing",
              confidence: 0.5,
            } as EdgeData,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const getGraphData = useCallback(() => {
    return {
      nodes: fromFlowNodes(nodes as FlowNode[]),
      edges: fromFlowEdges(edges as FlowEdge[]),
    };
  }, [nodes, edges]);

  return {
    nodes,
    edges,
    direction,
    selectedNodeId,
    selectedEdgeId,
    setSelectedNodeId,
    setSelectedEdgeId,
    onNodesChange: onNodesChange as OnNodesChange,
    onEdgesChange: onEdgesChange as OnEdgesChange,
    onConnect,
    setGraphData,
    relayout,
    addNode,
    removeNode,
    updateNode,
    addEdge,
    removeEdge,
    updateEdge,
    getGraphData,
  };
}
