import React, { useEffect, useRef, useState } from 'react';
import { Share2, Search, Filter, RefreshCw, ZoomIn, ZoomOut, Database, Layers, Info } from 'lucide-react';
import { GraphNode, GraphLink } from '../types';

interface GraphVisualizerProps {
  initialNodes?: GraphNode[];
  initialLinks?: GraphLink[];
  onSelectNode?: (node: GraphNode) => void;
}

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Book: { bg: '#818cf8', border: '#4f46e5', text: '#ffffff' },
  Law: { bg: '#38bdf8', border: '#0284c7', text: '#ffffff' },
  Article: { bg: '#34d399', border: '#059669', text: '#ffffff' },
  Concept: { bg: '#fbbf24', border: '#d97706', text: '#78350f' },
  Principle: { bg: '#f472b6', border: '#db2777', text: '#ffffff' },
  Jurisprudence: { bg: '#a78bfa', border: '#7c3aed', text: '#ffffff' },
  Author: { bg: '#fb923c', border: '#ea580c', text: '#ffffff' },
};

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  initialNodes,
  initialLinks,
  onSelectNode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Zoom & Pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<GraphNode | null>(null);

  // Fetch graph data from backend
  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/graph/data');
      const data = await res.json();
      if (data.nodes && data.links) {
        // Initialize random coordinates around center
        const width = containerRef.current?.clientWidth || 800;
        const height = containerRef.current?.clientHeight || 500;

        const initializedNodes = data.nodes.map((node: GraphNode, i: number) => {
          const angle = (i / data.nodes.length) * 2 * Math.PI;
          const radius = 120 + Math.random() * 180;
          return {
            ...node,
            x: (width / 2) + Math.cos(angle) * radius,
            y: (height / 2) + Math.sin(angle) * radius,
            vx: 0,
            vy: 0
          };
        });

        setNodes(initializedNodes);
        setLinks(data.links);
      }
    } catch (e) {
      console.error('Failed to load graph data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  // Simple physics / force layout step
  useEffect(() => {
    let animFrame: number;
    const simulate = () => {
      setNodes(prevNodes => {
        if (prevNodes.length === 0) return prevNodes;

        const updated = prevNodes.map(node => ({ ...node }));
        const nodeMap = new Map(updated.map(n => [n.id, n]));

        // Repulsion between nodes
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const n1 = updated[i];
            const n2 = updated[j];
            const dx = (n2.x || 0) - (n1.x || 0);
            const dy = (n2.y || 0) - (n1.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            if (dist < 180) {
              const force = (180 - dist) / dist * 0.4;
              n1.x = (n1.x || 0) - dx * force * 0.05;
              n1.y = (n1.y || 0) - dy * force * 0.05;
              n2.x = (n2.x || 0) + dx * force * 0.05;
              n2.y = (n2.y || 0) + dy * force * 0.05;
            }
          }
        }

        // Attraction along links
        for (const link of links) {
          const sId = typeof link.source === 'string' ? link.source : (link.source as any).id;
          const tId = typeof link.target === 'string' ? link.target : (link.target as any).id;
          const n1 = nodeMap.get(sId);
          const n2 = nodeMap.get(tId);

          if (n1 && n2) {
            const dx = (n2.x || 0) - (n1.x || 0);
            const dy = (n2.y || 0) - (n1.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 90;
            const force = (dist - targetDist) * 0.02;

            n1.x = (n1.x || 0) + dx * force * 0.05;
            n1.y = (n1.y || 0) + dy * force * 0.05;
            n2.x = (n2.x || 0) - dx * force * 0.05;
            n2.y = (n2.y || 0) - dy * force * 0.05;
          }
        }

        return updated;
      });
    };

    const interval = setInterval(simulate, 40);
    return () => clearInterval(interval);
  }, [links]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to container
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Draw Links
    for (const link of links) {
      const sId = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const tId = typeof link.target === 'string' ? link.target : (link.target as any).id;
      const sNode = nodeMap.get(sId);
      const tNode = nodeMap.get(tId);

      if (sNode && tNode) {
        const isHighlighted = selectedNode && (selectedNode.id === sId || selectedNode.id === tId);

        ctx.beginPath();
        ctx.moveTo(sNode.x || 0, sNode.y || 0);
        ctx.lineTo(tNode.x || 0, tNode.y || 0);
        ctx.strokeStyle = isHighlighted ? '#f59e0b' : '#94a3b8';
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        ctx.setLineDash(link.type === 'APPLIES_TO' ? [4, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Link Label
        if (transform.scale > 0.8) {
          const midX = ((sNode.x || 0) + (tNode.x || 0)) / 2;
          const midY = ((sNode.y || 0) + (tNode.y || 0)) / 2;
          ctx.font = '9px sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText(link.type, midX + 3, midY - 3);
        }
      }
    }

    // Draw Nodes
    for (const node of nodes) {
      if (filterType !== 'ALL' && node.label !== filterType) continue;

      const isSelected = selectedNode?.id === node.id;
      const isMatched = searchTerm && node.name.toLowerCase().includes(searchTerm.toLowerCase());
      const colors = NODE_COLORS[node.label] || { bg: '#cbd5e1', border: '#64748b', text: '#0f172a' };

      const radius = node.label === 'Book' ? 24 : node.label === 'Law' ? 20 : 16;

      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors.bg;
      ctx.fill();
      ctx.lineWidth = isSelected || isMatched ? 4 : 2;
      ctx.strokeStyle = isSelected ? '#fbbf24' : isMatched ? '#ef4444' : colors.border;
      ctx.stroke();

      // Node label inside / below
      ctx.font = `bold ${node.label === 'Book' ? '11px' : '10px'} sans-serif`;
      ctx.fillStyle = colors.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label.slice(0, 3).toUpperCase(), node.x || 0, node.y || 0);

      // Full Name below node
      ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.fillText(node.name.slice(0, 24) + (node.name.length > 24 ? '...' : ''), node.x || 0, (node.y || 0) + radius + 12);
    }

    ctx.restore();
  }, [nodes, links, transform, selectedNode, filterType, searchTerm]);

  // Handle Mouse Events for Pan / Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transform.x) / transform.scale;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.scale;

    // Check if clicked on a node
    const clickedNode = nodes.find(n => {
      const radius = n.label === 'Book' ? 24 : 18;
      const dx = (n.x || 0) - mouseX;
      const dy = (n.y || 0) - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      setSelectedNode(clickedNode);
      if (onSelectNode) onSelectNode(clickedNode);
    } else {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - transform.x) / transform.scale;
      const mouseY = (e.clientY - rect.top - transform.y) / transform.scale;

      draggedNodeRef.current.x = mouseX;
      draggedNodeRef.current.y = mouseY;
      setNodes([...nodes]);
    } else if (isDraggingRef.current) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      }));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedNodeRef.current = null;
  };

  const handleZoom = (delta: number) => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.5, prev.scale + delta))
    }));
  };

  const resetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 space-y-4">
      {/* Top Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Grafo de Conocimiento Neo4j (GraphRAG)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                161.97.181.77
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Explora las relaciones entre Leyes, Artículos, Conceptos Tributarios y Libros de la biblioteca.
            </p>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              id="graph-search-input"
              type="text"
              placeholder="Buscar concepto / norma..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Filter Type */}
          <div className="flex items-center space-x-1">
            {['ALL', 'Book', 'Law', 'Article', 'Concept'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${filterType === type
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {type === 'ALL' ? 'Todos' : type}
              </button>
            ))}
          </div>

          {/* Reset / Zoom */}
          <div className="flex items-center space-x-1 border-l border-slate-200 dark:border-slate-700 pl-2">
            <button
              onClick={() => handleZoom(0.15)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              title="Acercar"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleZoom(-0.15)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              title="Alejar"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              title="Centrar Vista"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Inspector Layout */}
      <div className="flex-1 min-h-[500px] flex flex-col lg:flex-row gap-4">
        {/* Canvas container */}
        <div
          ref={containerRef}
          className="flex-1 relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]"
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs">
              <div className="flex flex-col items-center space-y-2 text-amber-600">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <span className="text-xs font-semibold">Cargando Grafo de Conocimiento...</span>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-md text-[11px] flex flex-wrap gap-3">
            {Object.entries(NODE_COLORS).map(([label, colors]) => (
              <div key={label} className="flex items-center space-x-1.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }} />
                <span className="text-slate-700 dark:text-slate-300 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Node Inspector Side Panel */}
        <div className="w-full lg:w-80 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Detalle del Nodo (Cypher)
            </h3>
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs animate-in fade-in">
              <div>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: NODE_COLORS[selectedNode.label]?.border || '#d97706' }}
                >
                  {selectedNode.label}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedNode.name}
                </h4>
              </div>

              {selectedNode.properties?.summary && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold block text-slate-900 dark:text-white mb-1">Resumen Doctrinal:</span>
                  {selectedNode.properties.summary}
                </div>
              )}

              {selectedNode.properties?.definition && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900 leading-relaxed">
                  <span className="font-semibold block mb-1">Definición Jurídica:</span>
                  {selectedNode.properties.definition}
                </div>
              )}

              {selectedNode.properties?.legalBasis && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Base Normativa</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedNode.properties.legalBasis}</p>
                </div>
              )}

              {selectedNode.properties?.author && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Autor</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedNode.properties.author}</p>
                </div>
              )}

              {/* Neo4j Cypher Expression */}
              <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto">
                <span className="text-amber-400">MATCH</span> (n:{selectedNode.label} &#123;id: '{selectedNode.id}'&#125;)-[r]-(m)<br />
                <span className="text-amber-400">RETURN</span> n, r, m <span className="text-amber-400">LIMIT</span> 10;
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Share2 className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs">Haz clic en cualquier nodo del grafo para ver su definición, autor y conexiones normativas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
