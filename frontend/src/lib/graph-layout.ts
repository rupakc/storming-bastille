import dagre from "dagre";
import type { GraphNode, GraphEdge } from "./types";

// Must match the actual rendered node dimensions for dagre to avoid overlaps
const NODE_WIDTH = 210;
const NODE_HEIGHT = 90;

export type LayoutDirection = "LR" | "TB";

/**
 * Apply dagre auto-layout to a set of nodes and edges.
 * Returns a new array of nodes with updated positions.
 */
export function autoLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: LayoutDirection = "TB"
): GraphNode[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  // TB layout: ranks flow top-to-bottom, nodesep = horizontal gap, ranksep = vertical gap
  // LR layout: ranks flow left-to-right, nodesep = vertical gap, ranksep = horizontal gap
  const isTB = direction === "TB";
  g.setGraph({
    rankdir: direction,
    nodesep: isTB ? 30 : 40,
    ranksep: isTB ? 60 : 100,
    edgesep: 20,
    marginx: 10,
    marginy: 10,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    return {
      ...node,
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      },
    };
  });
}
