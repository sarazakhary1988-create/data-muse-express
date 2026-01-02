import { useState } from 'react';
import { 
  Download, 
  FileJson, 
  FileText, 
  FileType, 
  FileCode,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export interface ExportableReport {
  title: string;
  content?: string;
  summary?: string;
  sections?: Array<{ heading: string; content: string; citations?: string[] }>;
  sources?: Array<{ title: string; url: string }>;
  keyFacts?: string[];
  metadata?: {
    generatedAt?: string;
    totalSources?: number;
    confidenceScore?: number;
  };
  evidenceChain?: Array<{
    claim: string;
    source: string;
    confidence: number;
  }>;
}

interface ReportExportButtonProps {
  report: ExportableReport;
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

export const ReportExportButton = ({ report, variant = 'default', className }: ReportExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const generateContent = (): string => {
    let content = `# ${report.title}\n\n`;
    
    if (report.metadata?.generatedAt) {
      content += `_Generated: ${new Date(report.metadata.generatedAt).toLocaleDateString()}_\n\n`;
    }
    
    if (report.summary) {
      content += `## Summary\n${report.summary}\n\n`;
    }

    if (report.content) {
      content += report.content + '\n\n';
    }

    if (report.sections?.length) {
      report.sections.forEach(section => {
        content += `## ${section.heading}\n${section.content}\n\n`;
      });
    }

    if (report.keyFacts?.length) {
      content += `## Key Facts\n`;
      report.keyFacts.forEach(fact => {
        content += `- ${fact}\n`;
      });
      content += '\n';
    }

    if (report.evidenceChain?.length) {
      content += `## Evidence Chain\n`;
      report.evidenceChain.forEach((item, idx) => {
        content += `${idx + 1}. **${item.claim}**\n   - Source: ${item.source}\n   - Confidence: ${Math.round(item.confidence * 100)}%\n`;
      });
      content += '\n';
    }

    if (report.sources?.length) {
      content += `## Sources\n`;
      report.sources.forEach((source, idx) => {
        content += `${idx + 1}. [${source.title}](${source.url})\n`;
      });
    }

    return content;
  };

  const handleExportJSON = () => {
    const data = {
      title: report.title,
      generatedAt: report.metadata?.generatedAt || new Date().toISOString(),
      summary: report.summary,
      content: report.content,
      sections: report.sections,
      keyFacts: report.keyFacts,
      evidenceChain: report.evidenceChain,
      sources: report.sources,
      metadata: {
        ...report.metadata,
        exportedAt: new Date().toISOString(),
        format: 'json',
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${sanitizeFilename(report.title)}.json`);
  };

  const handleExportMarkdown = () => {
    const content = generateContent();
    const blob = new Blob([content], { type: 'text/markdown' });
    downloadBlob(blob, `${sanitizeFilename(report.title)}.md`);
  };

  const handleExportHTML = () => {
    const content = generateContent();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 2rem; 
      line-height: 1.6;
      color: #1a1a2e;
    }
    h1 { color: #1a1a2e; border-bottom: 2px solid #8b5cf6; padding-bottom: 0.5rem; }
    h2 { color: #333; margin-top: 2rem; }
    pre { background: #f4f4f5; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    code { background: #f4f4f5; padding: 0.2rem 0.4rem; border-radius: 4px; }
    a { color: #8b5cf6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul, ol { padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; }
    .evidence-item { 
      background: #f8f9fa; 
      padding: 1rem; 
      border-radius: 8px; 
      margin-bottom: 1rem;
      border-left: 3px solid #8b5cf6;
    }
    .source-list { list-style: none; padding: 0; }
    .source-list li { 
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }
    .confidence { 
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #8b5cf6;
      color: white;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .metadata { 
      font-size: 0.9rem; 
      color: #666; 
      margin-top: 2rem; 
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>
  
  ${report.summary ? `<h2>Summary</h2><p>${escapeHtml(report.summary)}</p>` : ''}
  
  ${report.content ? `<div>${markdownToHtml(report.content)}</div>` : ''}
  
  ${report.sections?.length ? report.sections.map(s => `
    <h2>${escapeHtml(s.heading)}</h2>
    <div>${markdownToHtml(s.content)}</div>
  `).join('') : ''}
  
  ${report.keyFacts?.length ? `
    <h2>Key Facts</h2>
    <ul>${report.keyFacts.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
  ` : ''}
  
  ${report.evidenceChain?.length ? `
    <h2>Evidence Chain</h2>
    ${report.evidenceChain.map((item, idx) => `
      <div class="evidence-item">
        <strong>${idx + 1}. ${escapeHtml(item.claim)}</strong><br>
        <small>Source: ${escapeHtml(item.source)}</small>
        <span class="confidence">${Math.round(item.confidence * 100)}%</span>
      </div>
    `).join('')}
  ` : ''}
  
  ${report.sources?.length ? `
    <h2>Sources</h2>
    <ol class="source-list">
      ${report.sources.map(s => `<li><a href="${escapeHtml(s.url)}" target="_blank">${escapeHtml(s.title)}</a></li>`).join('')}
    </ol>
  ` : ''}
  
  <div class="metadata">
    <p>Generated: ${new Date(report.metadata?.generatedAt || Date.now()).toLocaleString()}</p>
    ${report.metadata?.totalSources ? `<p>Total Sources: ${report.metadata.totalSources}</p>` : ''}
    ${report.metadata?.confidenceScore ? `<p>Confidence Score: ${Math.round(report.metadata.confidenceScore * 100)}%</p>` : ''}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(blob, `${sanitizeFilename(report.title)}.html`);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };

      const addText = (text: string, fontSize: number, isBold = false, color = '#1a1a2e') => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        const rgb = hexToRgb(color);
        pdf.setTextColor(rgb.r, rgb.g, rgb.b);
        
        const lines = pdf.splitTextToSize(text, contentWidth);
        const lineHeight = fontSize * 0.4;
        
        for (const line of lines) {
          if (yPosition + lineHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        }
        yPosition += 2;
      };

      // Title
      addText(report.title, 18, true, '#1a1a2e');
      yPosition += 5;

      // Date
      if (report.metadata?.generatedAt) {
        addText(`Generated: ${new Date(report.metadata.generatedAt).toLocaleDateString()}`, 10, false, '#666666');
      }
      yPosition += 5;

      // Summary
      if (report.summary) {
        addText('Summary', 14, true);
        addText(report.summary, 10, false, '#333333');
        yPosition += 5;
      }

      // Content
      if (report.content) {
        const lines = report.content.split('\n');
        for (const line of lines) {
          if (line.startsWith('## ')) {
            yPosition += 3;
            addText(line.replace('## ', ''), 12, true);
          } else if (line.startsWith('# ')) {
            yPosition += 5;
            addText(line.replace('# ', ''), 14, true);
          } else if (line.trim()) {
            addText(line.replace(/\*\*(.*?)\*\*/g, '$1'), 10, false, '#333333');
          }
        }
        yPosition += 5;
      }

      // Key Facts
      if (report.keyFacts?.length) {
        addText('Key Facts', 14, true);
        report.keyFacts.forEach(fact => {
          addText(`• ${fact}`, 10, false, '#333333');
        });
        yPosition += 5;
      }

      // Evidence Chain
      if (report.evidenceChain?.length) {
        addText('Evidence Chain', 14, true);
        report.evidenceChain.forEach((item, idx) => {
          addText(`${idx + 1}. ${item.claim}`, 10, true, '#333333');
          addText(`   Source: ${item.source}`, 9, false, '#666666');
          addText(`   Confidence: ${Math.round(item.confidence * 100)}%`, 9, false, '#666666');
        });
        yPosition += 5;
      }

      // Sources
      if (report.sources?.length) {
        addText('Sources', 14, true);
        report.sources.forEach((source, idx) => {
          addText(`${idx + 1}. ${source.title}`, 9, false, '#333333');
          addText(`   ${source.url}`, 8, false, '#8b5cf6');
        });
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(136, 136, 136);
      pdf.text('Generated by Manus 1.6 MAX Research Engine', pageWidth / 2, pageHeight - 10, { align: 'center' });

      pdf.save(`${sanitizeFilename(report.title)}.pdf`);

      toast({
        title: "PDF Exported",
        description: "Report saved successfully",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Saved as ${filename}`,
    });
  };

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const markdownToHtml = (md: string): string => {
    return md
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  };

  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={className} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportPDF}>
            <FileType className="w-4 h-4 mr-2" /> PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportJSON}>
            <FileJson className="w-4 h-4 mr-2" /> JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportHTML}>
            <FileCode className="w-4 h-4 mr-2" /> HTML
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportMarkdown}>
            <FileText className="w-4 h-4 mr-2" /> Markdown
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={isExporting}>
          <FileJson className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportHTML} disabled={isExporting}>
          <FileCode className="w-4 h-4" />
        </Button>
        <Button variant="default" size="sm" onClick={handleExportPDF} disabled={isExporting}>
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileType className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className={className} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileType className="w-4 h-4 mr-2" />
          PDF Document
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileJson className="w-4 h-4 mr-2" />
          JSON (with sources)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportHTML}>
          <FileCode className="w-4 h-4 mr-2" />
          HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportMarkdown}>
          <FileText className="w-4 h-4 mr-2" />
          Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
