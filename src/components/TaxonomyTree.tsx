import React, { useState } from 'react';
import { 
  FolderTree, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Scale, 
  ArrowRight, 
  Layers, 
  FileText,
  Tag
} from 'lucide-react';
import { TAX_TAXONOMY } from '../data/taxTaxonomy';
import { TaxonomyNode, DoctrinalEntry, TaxCategory } from '../types';

interface TaxonomyTreeProps {
  onSelectTopic: (topicLabel: string, category: TaxCategory, article?: string) => void;
  entries: DoctrinalEntry[];
}

export const TaxonomyTree: React.FC<TaxonomyTreeProps> = ({
  onSelectTopic,
  entries,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'principios-constitucionales': true,
    'impuesto-a-la-renta': true,
    'impuesto-general-ventas': true,
  });

  const [selectedNode, setSelectedNode] = useState<TaxonomyNode>(TAX_TAXONOMY[0]);

  const toggleNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Count relevant entries matching category or keywords
  const countEntriesForNode = (node: TaxonomyNode): number => {
    const labelLower = node.label.toLowerCase();
    return entries.filter((e) => {
      if (e.category === node.category) return true;
      if (node.articles?.some((art) => e.linkedArticles.includes(art))) return true;
      if (e.title.toLowerCase().includes(labelLower) || e.institution.toLowerCase().includes(labelLower)) return true;
      return false;
    }).length;
  };

  const selectedNodeEntries = entries.filter((e) => {
    if (e.category === selectedNode.category) return true;
    if (selectedNode.articles?.some((art) => e.linkedArticles.some(a => a.toLowerCase().includes(art.toLowerCase())))) return true;
    if (e.title.toLowerCase().includes(selectedNode.label.toLowerCase())) return true;
    return false;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-serif font-bold text-white flex items-center space-x-2">
          <FolderTree className="w-6 h-6 text-[#D4AF37]" />
          <span>Tesauro & Estructura Dogmática del Derecho Tributario</span>
        </h1>
        <p className="text-sm text-[#888]">
          Navega a través de las ramas, títulos, capítulos e instituciones del sistema tributario y accede a las obras y doctrina asociadas.
        </p>
      </div>

      {/* Grid: Left Tree / Right Topic Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Tree (5 Cols) */}
        <div className="lg:col-span-5 bg-[#111114] rounded-xl border border-[#222226] shadow-lg p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#888] pb-2 border-b border-[#222226] flex items-center justify-between">
            <span>Árbol Temático</span>
            <span className="text-[10px] font-normal text-[#555]">Selecciona una rama</span>
          </div>

          <div className="space-y-1">
            {TAX_TAXONOMY.map((rootNode) => {
              const isExpanded = !!expandedNodes[rootNode.id];
              const isSelected = selectedNode.id === rootNode.id;
              const entriesCount = countEntriesForNode(rootNode);

              return (
                <div key={rootNode.id} className="space-y-1">
                  {/* Root Node Item */}
                  <div
                    onClick={() => setSelectedNode(rootNode)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${
                      isSelected
                        ? 'bg-[#1A1A1E] text-[#D4AF37] border border-[#D4AF37]/50 shadow'
                        : 'text-[#CCC] hover:bg-[#16161A]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0 pr-2">
                      <button
                        onClick={(e) => toggleNode(rootNode.id, e)}
                        className="p-0.5 rounded hover:bg-white/10 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#D4AF37]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#666]" />
                        )}
                      </button>
                      <span className="truncate">{rootNode.label}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      isSelected ? 'bg-[#D4AF37] text-[#0A0A0C] font-bold' : 'bg-[#16161A] text-[#888] border border-[#222226]'
                    }`}>
                      {entriesCount}
                    </span>
                  </div>

                  {/* Children Subnodes */}
                  {isExpanded && rootNode.children && (
                    <div className="pl-6 space-y-1 border-l-2 border-[#222226] ml-3">
                      {rootNode.children.map((child) => {
                        const isChildSelected = selectedNode.id === child.id;
                        const childCount = countEntriesForNode(child);

                        return (
                          <div
                            key={child.id}
                            onClick={() => setSelectedNode(child)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                              isChildSelected
                                ? 'bg-[#1A1A1E] text-[#D4AF37] font-bold border border-[#D4AF37]/40'
                                : 'text-[#888] hover:text-[#CCC] hover:bg-[#16161A]'
                            }`}
                          >
                            <span className="truncate flex-1 pr-2">
                              • {child.label}
                            </span>
                            {childCount > 0 && (
                              <span className="text-[10px] text-[#555] font-mono">
                                {childCount}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Node Details & Associated Books (7 Cols) */}
        <div className="lg:col-span-7 bg-[#111114] rounded-xl border border-[#222226] shadow-lg p-6 space-y-6">
          
          {/* Header of Selected Node */}
          <div className="space-y-2 border-b border-[#222226] pb-4">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#1A1A1E] text-[#D4AF37] border border-[#222226]">
                {selectedNode.category}
              </span>
              {selectedNode.articles && selectedNode.articles.map((art) => (
                <span key={art} className="text-[11px] font-mono bg-[#16161A] text-[#888] px-2 py-0.5 rounded border border-[#222226]">
                  {art}
                </span>
              ))}
            </div>

            <h2 className="text-xl font-serif font-bold text-white">
              {selectedNode.label}
            </h2>

            {selectedNode.description && (
              <p className="text-sm text-[#888] leading-relaxed">
                {selectedNode.description}
              </p>
            )}

            <div className="pt-2">
              <button
                onClick={() => onSelectTopic(selectedNode.label, selectedNode.category, selectedNode.articles?.[0])}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] text-xs font-bold uppercase tracking-wider transition-colors shadow"
              >
                <span>Ver todos los resultados en el Buscador</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-institutions list */}
          {selectedNode.children && selectedNode.children.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#666]">
                Instituciones y Temas Específicos:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedNode.children.map((child) => (
                  <div
                    key={child.id}
                    onClick={() => setSelectedNode(child)}
                    className="p-3 rounded-lg border border-[#222226] bg-[#16161A] hover:border-[#D4AF37]/50 hover:bg-[#1A1A1E] cursor-pointer transition-colors space-y-1"
                  >
                    <div className="text-xs font-semibold text-[#CCC]">{child.label}</div>
                    <div className="text-[11px] text-[#666] line-clamp-2">{child.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associated Doctrine & Books */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#666]">
              Obras y Tratados Vinculados ({selectedNodeEntries.length}):
            </h3>

            {selectedNodeEntries.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#666] bg-[#16161A] rounded-xl border border-[#222226]">
                No hay obras registradas directamente bajo esta etiqueta específica. Puedes indexar más libros desde tu Google Drive.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedNodeEntries.slice(0, 4).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl border border-[#222226] bg-[#16161A] space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-serif font-bold text-white">
                          {entry.title}
                        </h4>
                        <div className="text-xs text-[#888]">
                          {entry.author} ({entry.year})
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-[#0E0E11] text-[#D4AF37] px-2 py-0.5 rounded border border-[#222226]">
                        {entry.isDriveSource ? 'Google Drive' : 'Doctrina'}
                      </span>
                    </div>

                    <p className="text-xs text-[#BBB] italic font-serif bg-[#0E0E11] p-2.5 rounded border border-[#222226]">
                      "{entry.ratioDoctrinal}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
