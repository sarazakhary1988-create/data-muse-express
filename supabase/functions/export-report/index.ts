import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportData {
  title: string;
  summary: string;
  sections: { heading: string; content: string; citations: string[] }[];
  citations: { id: string; text: string; context: string; confidence: number }[];
  metadata: {
    totalSources: number;
    verifiedClaims: number;
    confidenceScore: number;
    generatedAt: string;
  };
}

// Simple PDF generation using text-based layout
function generatePDFContent(report: ReportData): string {
  const lines: string[] = [];

  // Header
  lines.push("%PDF-1.4");
  lines.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  lines.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");

  // Build text content
  const textContent: string[] = [];
  textContent.push(`RESEARCH REPORT`);
  textContent.push("");
  textContent.push(report.title);
  textContent.push("");
  textContent.push(`Generated: ${new Date(report.metadata.generatedAt).toLocaleDateString()}`);
  textContent.push(`Sources: ${report.metadata.totalSources} | Verified Claims: ${report.metadata.verifiedClaims}`);
  textContent.push(`Confidence Score: ${(report.metadata.confidenceScore * 100).toFixed(1)}%`);
  textContent.push("");
  textContent.push("─".repeat(60));
  textContent.push("");
  textContent.push("EXECUTIVE SUMMARY");
  textContent.push("");
  textContent.push(report.summary);
  textContent.push("");

  for (const section of report.sections) {
    textContent.push("─".repeat(60));
    textContent.push("");
    textContent.push(section.heading.toUpperCase());
    textContent.push("");
    textContent.push(section.content.replace(/\n+/g, " ").trim());
    textContent.push("");
  }

  textContent.push("─".repeat(60));
  textContent.push("");
  textContent.push("REFERENCES");
  textContent.push("");
  for (const cite of report.citations) {
    textContent.push(`${cite.text}`);
    textContent.push(`  URL: ${cite.context}`);
    textContent.push("");
  }

  const fullText = textContent.join("\n");
  const escapedText = fullText
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x00-\x7F]/g, " "); // Remove non-ASCII for basic PDF

  // Page content
  const pageContent = `BT /F1 10 Tf 50 750 Td (${escapedText.substring(0, 4000)}) Tj ET`;
  const contentStream = pageContent;
  const streamLength = contentStream.length;

  lines.push(
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`,
  );
  lines.push(`4 0 obj << /Length ${streamLength} >> stream`);
  lines.push(contentStream);
  lines.push("endstream endobj");
  lines.push("5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");

  // Cross-reference table
  lines.push("xref");
  lines.push("0 6");
  lines.push("0000000000 65535 f ");
  lines.push("0000000009 00000 n ");
  lines.push("0000000058 00000 n ");
  lines.push("0000000115 00000 n ");
  lines.push("0000000270 00000 n ");
  lines.push("0000000380 00000 n ");

  lines.push("trailer << /Size 6 /Root 1 0 R >>");
  lines.push("startxref");
  lines.push("459");
  lines.push("%%EOF");

  return lines.join("\n");
}

// Generate HTML report for better formatting
function generateHTMLReport(report: ReportData): string {
  const sections = report.sections
    .map(
      (s) => `
    <section class="section">
      <h2>${escapeHtml(s.heading)}</h2>
      <div class="content">${markdownToHtml(s.content)}</div>
    </section>
  `,
    )
    .join("\n");

  const citations = report.citations
    .map(
      (c, i) => `
    <li>
      <strong>${escapeHtml(c.text)}</strong><br>
      <a href="${escapeHtml(c.context)}" target="_blank">${escapeHtml(c.context)}</a>
      <span class="confidence">(${(c.confidence * 100).toFixed(0)}% confidence)</span>
    </li>
  `,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Georgia', serif; 
      line-height: 1.6; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 40px 20px;
      color: #1a1a1a;
      background: #fafafa;
    }
    .header { 
      border-bottom: 3px solid #2563eb; 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
    }
    h1 { 
      color: #0f172a; 
      font-size: 2em; 
      margin-bottom: 10px;
    }
    .meta { 
      color: #64748b; 
      font-size: 0.9em; 
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .meta-item {
      background: #e2e8f0;
      padding: 4px 12px;
      border-radius: 4px;
    }
    .summary { 
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
      padding: 25px; 
      border-radius: 8px; 
      margin: 25px 0;
      border-left: 4px solid #2563eb;
    }
    .summary h2 { margin-top: 0; color: #1e40af; }
    .section { margin: 30px 0; }
    .section h2 { 
      color: #1e40af; 
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 8px;
    }
    .content { 
      text-align: justify; 
    }
    .content p { margin: 12px 0; }
    .content ul, .content ol { margin: 12px 0; padding-left: 24px; }
    .references { 
      background: #f8fafc; 
      padding: 25px; 
      border-radius: 8px;
      margin-top: 40px;
    }
    .references h2 { color: #1e40af; margin-top: 0; }
    .references ol { padding-left: 20px; }
    .references li { 
      margin: 15px 0; 
      padding: 10px;
      background: white;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .references a { color: #2563eb; word-break: break-all; }
    .confidence { 
      color: #64748b; 
      font-size: 0.85em;
      margin-left: 8px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 0.85em;
    }
    @media print {
      body { background: white; }
      .references li { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(report.title)}</h1>
    <div class="meta">
      <span class="meta-item">📅 ${new Date(report.metadata.generatedAt).toLocaleDateString()}</span>
      <span class="meta-item">📚 ${report.metadata.totalSources} Sources</span>
      <span class="meta-item">✓ ${report.metadata.verifiedClaims} Verified Claims</span>
      <span class="meta-item">📊 ${(report.metadata.confidenceScore * 100).toFixed(1)}% Confidence</span>
    </div>
  </div>

  <div class="summary">
    <h2>Executive Summary</h2>
    <p>${escapeHtml(report.summary)}</p>
  </div>

  ${sections}

  <div class="references">
    <h2>References</h2>
    <ol>
      ${citations}
    </ol>
  </div>

  <div class="footer">
    <p>Generated by NexusAI Research Engine • Manus 1.6 MAX</p>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h4>$1</h4>")
    .replace(/^# (.*$)/gm, "<h5>$1</h5>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^\- (.*$)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/^\d+\. (.*$)/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith("<")) return match;
      return `<p>${match}</p>`;
    });
}

// Generate Markdown report
function generateMarkdownReport(report: ReportData): string {
  const lines: string[] = [];

  lines.push(`# ${report.title}`);
  lines.push("");
  lines.push(
    `> Generated: ${new Date(report.metadata.generatedAt).toLocaleDateString()} | Sources: ${report.metadata.totalSources} | Verified Claims: ${report.metadata.verifiedClaims} | Confidence: ${(report.metadata.confidenceScore * 100).toFixed(1)}%`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(report.summary);
  lines.push("");

  for (const section of report.sections) {
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.content);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## References");
  lines.push("");

  for (const cite of report.citations) {
    lines.push(`- ${cite.text}: [${cite.context}](${cite.context})`);
  }

  lines.push("");
  lines.push("---");
  lines.push("*Generated by NexusAI Research Engine • Manus 1.6 MAX*");

  return lines.join("\n");
}

// Generate JSON export
function generateJSONReport(report: ReportData): string {
  return JSON.stringify(
    {
      ...report,
      exportedAt: new Date().toISOString(),
      format: "structured",
      version: "1.0",
    },
    null,
    2,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { report, format = "html" } = await req.json();

    if (!report) {
      return new Response(JSON.stringify({ error: "Report data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "pdf":
        content = generatePDFContent(report);
        contentType = "application/pdf";
        filename = "research-report.pdf";
        break;
      case "html":
        content = generateHTMLReport(report);
        contentType = "text/html; charset=utf-8";
        filename = "research-report.html";
        break;
      case "markdown":
      case "md":
        content = generateMarkdownReport(report);
        contentType = "text/markdown; charset=utf-8";
        filename = "research-report.md";
        break;
      case "json":
        content = generateJSONReport(report);
        contentType = "application/json";
        filename = "research-report.json";
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unsupported format: ${format}. Supported: pdf, html, markdown, json` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    return new Response(content, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Export] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Export failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
