import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

/**
 * Props for the MermaidDiagram component.
 */
interface MermaidDiagramProps {
  /** Mermaid diagram definition string */
  chart: string;
  /** Additional CSS classes to apply to the diagram container */
  className?: string;
}

/**
 * Renders Mermaid.js diagrams with dark theme styling and error handling.
 */
export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className = '' }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError('');

        // Configure Mermaid with dark theme to match application styling
        mermaid.initialize({
          theme: 'dark',
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#ffffff',
            primaryBorderColor: '#1f2937',
            lineColor: '#6b7280',
            sectionBkColor: '#374151',
            altSectionBkColor: '#1f2937',
            gridColor: '#4b5563',
            secondaryColor: '#64748b',
            tertiaryColor: '#475569',
            background: '#111827',
            mainBkg: '#1f2937',
            secondBkg: '#374151',
            tertiaryBkg: '#475569'
          },
          startOnLoad: false,
          securityLevel: 'loose' // Required for external links and custom styling
        });

        // Generate unique ID to prevent conflicts when multiple diagrams are rendered
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart.trim());
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      } finally {
        setIsLoading(false);
      }
    };

    if (chart.trim()) {
      void renderDiagram();
    }
  }, [chart]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 bg-gray-800 rounded-lg ${className}`}>
        <div className="text-gray-400">Rendering diagram...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-900 border border-red-700 rounded-lg ${className}`}>
        <div className="text-red-200 text-sm">
          <strong>Mermaid Error:</strong> {error}
        </div>
        <details className="mt-2">
          <summary className="text-red-300 cursor-pointer">Show diagram source</summary>
          <pre className="mt-2 p-2 bg-red-950 rounded text-xs text-red-100 overflow-x-auto">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={elementRef}
      className={`mermaid-diagram bg-gray-900 rounded-lg p-4 overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
