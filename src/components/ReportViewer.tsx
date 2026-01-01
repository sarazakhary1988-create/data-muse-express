import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  FileJson, 
  FileSpreadsheet, 
  FileCode,
  Printer,
  ChevronDown,
  Sparkles,
  FileType,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Report } from '@/store/researchStore';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import { Discrepancy, QualityMetrics, SourceCoverage } from '@/lib/agent/dataConsolidator';

export interface ValidationData {
  discrepancies: Discrepancy[];
  qualityMetrics: QualityMetrics;
  sourceCoverage: SourceCoverage;
  consolidatedData: Record<string, any>;
}

interface ReportViewerProps {
  report: Report;
  validationData?: ValidationData;
}

type ExportFormat = 'markdown' | 'html' | 'json' | 'csv' | 'txt' | 'pdf';

export const ReportViewer = ({ report, validationData }: ReportViewerProps) => {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we create your report",
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper to add text with word wrap
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

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };

      // Add title
      addText(report.title, 20, true, '#1a1a2e');
      yPosition += 3;
      
      // Add date
      const dateStr = new Date(report.createdAt).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      addText(`Generated: ${dateStr}`, 10, false, '#666666');
      
      // Add separator line
      yPosition += 5;
      pdf.setDrawColor(139, 92, 246);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Process content line by line
      const lines = report.content.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          yPosition += 3;
          continue;
        }
        
        // Headers
        if (trimmedLine.startsWith('### ')) {
          yPosition += 3;
          addText(trimmedLine.replace('### ', ''), 12, true);
        } else if (trimmedLine.startsWith('## ')) {
          yPosition += 5;
          addText(trimmedLine.replace('## ', ''), 14, true);
          pdf.setDrawColor(229, 229, 229);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 3;
        } else if (trimmedLine.startsWith('# ')) {
          yPosition += 7;
          addText(trimmedLine.replace('# ', ''), 16, true);
        } else if (trimmedLine.startsWith('---')) {
          pdf.setDrawColor(229, 229, 229);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 5;
        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          const bulletText = trimmedLine.replace(/^[-*] /, '');
          const cleanText = bulletText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[(.*?)\]\(.*?\)/g, '$1');
          addText('• ' + cleanText, 10, false, '#333333');
        } else if (/^\d+\. /.test(trimmedLine)) {
          const cleanText = trimmedLine.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[(.*?)\]\(.*?\)/g, '$1');
          addText(cleanText, 10, false, '#333333');
        } else if (trimmedLine.startsWith('|')) {
          // Table row - simplified
          const cells = trimmedLine.split('|').filter(c => c.trim() && !c.match(/^[-:]+$/));
          if (cells.length > 0) {
            const tableText = cells.map(c => c.trim()).join(' | ');
            addText(tableText, 9, false, '#333333');
          }
        } else if (trimmedLine.startsWith('>')) {
          const quoteText = trimmedLine.replace(/^> ?/, '');
          yPosition += 2;
          pdf.setFillColor(249, 245, 255);
          pdf.rect(margin, yPosition - 3, contentWidth, 8, 'F');
          addText(quoteText, 10, false, '#666666');
        } else {
          // Regular paragraph - remove markdown formatting
          const cleanText = trimmedLine
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/`(.*?)`/g, '$1');
          addText(cleanText, 10, false, '#333333');
        }
      }

      // Add validation section if available
      if (validationData && validationData.discrepancies.length > 0) {
        pdf.addPage();
        yPosition = margin;
        
        addText('Validation Report', 18, true, '#1a1a2e');
        yPosition += 5;
        
        // Quality metrics
        addText('Data Quality Metrics', 14, true);
        const metrics = validationData.qualityMetrics;
        addText(`• Overall Score: ${Math.round(metrics.overallScore * 100)}%`, 10);
        addText(`• Completeness: ${Math.round(metrics.completeness * 100)}%`, 10);
        addText(`• Consistency: ${Math.round(metrics.consistency * 100)}%`, 10);
        addText(`• Source Authority: ${Math.round(metrics.sourceAuthority * 100)}%`, 10);
        addText(`• Cross-Validation: ${Math.round(metrics.crossValidation * 100)}%`, 10);
        yPosition += 5;
        
        // Source coverage
        addText('Source Coverage', 14, true);
        addText(`• Total Sources: ${validationData.sourceCoverage.totalSources}`, 10);
        addText(`• High Authority: ${validationData.sourceCoverage.authorityDistribution.high}`, 10);
        addText(`• Medium Authority: ${validationData.sourceCoverage.authorityDistribution.medium}`, 10);
        addText(`• Low Authority: ${validationData.sourceCoverage.authorityDistribution.low}`, 10);
        yPosition += 5;
        
        // Discrepancies
        addText(`Data Conflicts & Resolutions (${validationData.discrepancies.length})`, 14, true);
        yPosition += 3;
        
        for (const discrepancy of validationData.discrepancies) {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          
          addText(`Field: ${discrepancy.field}`, 11, true);
          addText(`Resolved Value: ${String(discrepancy.resolution.selectedValue)}`, 10);
          addText(`Selected Source: ${discrepancy.resolution.selectedSource}`, 10, false, '#666666');
          addText(`Reason: ${discrepancy.resolution.reason}`, 10, false, '#666666');
          
          addText('Conflicting Values:', 10, true);
          for (const val of discrepancy.values) {
            addText(`  • ${val.source}: ${String(val.value)} (Authority: ${Math.round(val.authority * 100)}%)`, 9, false, '#666666');
          }
          yPosition += 3;
        }
      }

      // Add footer
      yPosition = pageHeight - margin;
      pdf.setFontSize(8);
      pdf.setTextColor(136, 136, 136);
      pdf.text('Generated by NexusAI Research Engine', pageWidth / 2, yPosition, { align: 'center' });

      // Save the PDF
      const filename = report.title.replace(/\s+/g, '_') + '_report.pdf';
      pdf.save(filename);

      toast({
        title: "PDF Exported!",
        description: `Report saved as ${filename}`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (format === 'pdf') {
      handleExportPdf();
      return;
    }

    let content = report.content;
    let filename = report.title.replace(/\s+/g, '_') + '_report';
    let mimeType = 'text/plain';

    switch (format) {
      case 'markdown':
        filename += '.md';
        mimeType = 'text/markdown';
        break;
      case 'html':
        content = [
          '<!DOCTYPE html>',
          '<html>',
          '<head>',
          '  <meta charset="UTF-8">',
          '  <title>' + report.title + '</title>',
          '  <style>',
          '    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }',
          '    h1, h2, h3 { color: #1a1a2e; }',
          '    pre { background: #f4f4f5; padding: 1rem; border-radius: 8px; overflow-x: auto; }',
          '    code { background: #f4f4f5; padding: 0.2rem 0.4rem; border-radius: 4px; }',
          '    table { border-collapse: collapse; width: 100%; }',
          '    th, td { border: 1px solid #e4e4e7; padding: 0.5rem; text-align: left; }',
          '    th { background: #f4f4f5; }',
          '  </style>',
          '</head>',
          '<body>',
          '  <h1>' + report.title + '</h1>',
          '  ' + report.content,
          '</body>',
          '</html>'
        ].join('\n');
        filename += '.html';
        mimeType = 'text/html';
        break;
      case 'json':
        content = JSON.stringify({
          title: report.title,
          createdAt: report.createdAt,
          sections: report.sections,
          content: report.content,
          ...(validationData && {
            validation: {
              qualityMetrics: validationData.qualityMetrics,
              sourceCoverage: validationData.sourceCoverage,
              discrepancies: validationData.discrepancies.map(d => ({
                field: d.field,
                conflictingValues: d.values.map(v => ({
                  source: v.source,
                  value: v.value,
                  authority: v.authority,
                })),
                resolution: {
                  selectedValue: d.resolution.selectedValue,
                  selectedSource: d.resolution.selectedSource,
                  reason: d.resolution.reason,
                },
              })),
              consolidatedData: validationData.consolidatedData,
            },
          }),
        }, null, 2);
        filename += '.json';
        mimeType = 'application/json';
        break;
      case 'csv':
        content = 'Title,Content\n"' + report.title + '","' + report.content.replace(/"/g, '""') + '"';
        filename += '.csv';
        mimeType = 'text/csv';
        break;
      default:
        filename += '.txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-card/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">{report.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generated {new Date(report.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-accent" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>

              <Button variant="ghost" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Print
              </Button>

              <Button
                variant="hero"
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={isExportingPdf}
                className="gap-2"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileType className="w-4 h-4" />
                    PDF
                  </>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExportingPdf}>
                    <FileType className="w-4 h-4 mr-2" />
                    PDF Document (.pdf)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('markdown')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('html')}>
                    <FileCode className="w-4 h-4 mr-2" />
                    HTML (.html)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON (.json)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('txt')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Plain Text (.txt)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        {report.sections.length > 0 && (
          <div className="border-b border-border/50 bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
              Table of Contents
            </p>
            <div className="flex flex-wrap gap-2">
              {report.sections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                  className="text-xs"
                >
                  {section.title}
                </Button>
              ))}
            </div>
          </div>
        )}

        <CardContent className="p-6 md:p-8">
          <div ref={contentRef} className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-foreground mt-6 mb-3 pb-2 border-b border-border/50">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium text-foreground mt-5 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 mb-4 text-muted-foreground">{children}</ol>
                ),
                li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-4 bg-primary/5 rounded-r-lg text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
                code: ({ className, children }) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono text-primary">{children}</code>;
                  }
                  return <code className="block p-4 bg-muted rounded-lg overflow-x-auto text-sm font-mono">{children}</code>;
                },
                pre: ({ children }) => <pre className="bg-muted rounded-lg overflow-x-auto mb-4">{children}</pre>,
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse border border-border rounded-lg">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border bg-muted px-4 py-2 text-left font-medium text-foreground">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-4 py-2 text-muted-foreground">{children}</td>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
                    {children}
                  </a>
                ),
              }}
            >
              {report.content}
            </ReactMarkdown>
          </div>
        </CardContent>

        <div className="border-t border-border/50 bg-card/50 px-6 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Generated by NexusAI Research Engine</span>
            </div>
            <span>{report.sections.length} sections</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
