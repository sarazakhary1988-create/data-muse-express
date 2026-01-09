/**
 * Document Export Generator
 * Real implementations for all 7 export formats:
 * PDF, DOCX, XLSX, PPTX, JSON, Markdown, CSV
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';
import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';

// Extend jsPDF type to include autoTable's finalY property
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

// Types for enriched data
export interface EnrichedProfile {
  fullName: string;
  title: string;
  company: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  twitter?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  technologies?: string[];
  metadata?: {
    confidence?: number;
    freshness?: string;
    sources?: string[];
  };
}

export interface ExperienceEntry {
  company: string;
  title: string;
  duration: string;
  current?: boolean;
  description?: string;
}

export interface EducationEntry {
  school: string;
  degree: string;
  field?: string;
  year: string;
}

export interface CompanyData {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  revenue?: string;
  founded?: string;
  headquarters?: string;
  technologies?: string[];
  employees?: number;
  description?: string;
}

export type ExportFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'json' | 'md' | 'csv';

/**
 * Generate PDF export using jsPDF + autoTable
 */
export async function generatePDF(data: EnrichedProfile): Promise<Blob> {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(data.fullName, 20, 20);
  
  // Subtitle
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(data.title, 20, 30);
  doc.text(data.company, 20, 38);
  
  if (data.location) {
    doc.setFontSize(10);
    doc.text(data.location, 20, 45);
  }
  
  let yPos = 55;
  
  // Contact Information
  if (data.email || data.phone) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Contact Information', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (data.email) {
      doc.text(`Email: ${data.email}`, 20, yPos);
      yPos += 6;
    }
    if (data.phone) {
      doc.text(`Phone: ${data.phone}`, 20, yPos);
      yPos += 6;
    }
    if (data.linkedin) {
      doc.text(`LinkedIn: ${data.linkedin}`, 20, yPos);
      yPos += 6;
    }
    yPos += 5;
  }
  
  // Professional Experience
  if (data.experience && data.experience.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Professional Experience', 20, yPos);
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Company', 'Title', 'Duration']],
      body: data.experience.map(exp => [
        exp.company,
        exp.title,
        exp.duration
      ]),
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
    });
    
    // Safely access finalY using type assertion
    yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 50;
    yPos += 10;
  }
  
  // Education
  if (data.education && data.education.length > 0 && yPos < 250) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Education', 20, yPos);
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['School', 'Degree', 'Field', 'Year']],
      body: data.education.map(edu => [
        edu.school,
        edu.degree,
        edu.field || '',
        edu.year
      ]),
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
    });
    
    // Safely access finalY using type assertion
    yPos = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY ?? yPos + 50;
    yPos += 10;
  }
  
  // Skills
  if (data.skills && data.skills.length > 0 && yPos < 260) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Skills', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const skillsText = data.skills.join(', ');
    const splitSkills = doc.splitTextToSize(skillsText, 170);
    doc.text(splitSkills, 20, yPos);
  }
  
  return doc.output('blob');
}

/**
 * Generate Word document using docx library
 */
export async function generateDOCX(data: EnrichedProfile): Promise<Blob> {
  const children: any[] = [];
  
  // Title
  children.push(
    new Paragraph({
      text: data.fullName,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [new TextRun({ text: data.title, bold: true, size: 28 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: data.company, size: 24 })],
    })
  );
  
  if (data.location) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.location, size: 20, italics: true })],
      })
    );
  }
  
  children.push(new Paragraph({ text: '' })); // Spacer
  
  // Contact Information
  if (data.email || data.phone) {
    children.push(
      new Paragraph({
        text: 'Contact Information',
        heading: HeadingLevel.HEADING_2,
      })
    );
    
    if (data.email) {
      children.push(new Paragraph({ text: `Email: ${data.email}` }));
    }
    if (data.phone) {
      children.push(new Paragraph({ text: `Phone: ${data.phone}` }));
    }
    if (data.linkedin) {
      children.push(new Paragraph({ text: `LinkedIn: ${data.linkedin}` }));
    }
    
    children.push(new Paragraph({ text: '' }));
  }
  
  // Professional Experience
  if (data.experience && data.experience.length > 0) {
    children.push(
      new Paragraph({
        text: 'Professional Experience',
        heading: HeadingLevel.HEADING_2,
      })
    );
    
    const expRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'Company', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: 'Title', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: 'Duration', bold: true })] }),
        ],
      }),
      ...data.experience.map(exp => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(exp.company)] }),
          new TableCell({ children: [new Paragraph(exp.title)] }),
          new TableCell({ children: [new Paragraph(exp.duration)] }),
        ],
      })),
    ];
    
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: expRows,
      }),
      new Paragraph({ text: '' })
    );
  }
  
  // Education
  if (data.education && data.education.length > 0) {
    children.push(
      new Paragraph({
        text: 'Education',
        heading: HeadingLevel.HEADING_2,
      })
    );
    
    const eduRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: 'School', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: 'Degree', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: 'Field', bold: true })] }),
          new TableCell({ children: [new Paragraph({ text: 'Year', bold: true })] }),
        ],
      }),
      ...data.education.map(edu => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(edu.school)] }),
          new TableCell({ children: [new Paragraph(edu.degree)] }),
          new TableCell({ children: [new Paragraph(edu.field || '')] }),
          new TableCell({ children: [new Paragraph(edu.year)] }),
        ],
      })),
    ];
    
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: eduRows,
      }),
      new Paragraph({ text: '' })
    );
  }
  
  // Skills
  if (data.skills && data.skills.length > 0) {
    children.push(
      new Paragraph({
        text: 'Skills',
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({ text: data.skills.join(', ') })
    );
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });
  
  return await Packer.toBlob(doc);
}

/**
 * Generate Excel spreadsheet using exceljs
 */
export async function generateXLSX(data: EnrichedProfile): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  
  // Overview sheet
  const overviewSheet = workbook.addWorksheet('Overview');
  overviewSheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 50 },
  ];
  
  overviewSheet.addRow({ field: 'Full Name', value: data.fullName });
  overviewSheet.addRow({ field: 'Title', value: data.title });
  overviewSheet.addRow({ field: 'Company', value: data.company });
  if (data.location) overviewSheet.addRow({ field: 'Location', value: data.location });
  if (data.email) overviewSheet.addRow({ field: 'Email', value: data.email });
  if (data.phone) overviewSheet.addRow({ field: 'Phone', value: data.phone });
  if (data.linkedin) overviewSheet.addRow({ field: 'LinkedIn', value: data.linkedin });
  
  // Style header row
  overviewSheet.getRow(1).font = { bold: true };
  overviewSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF428BCA' },
  };
  
  // Experience sheet
  if (data.experience && data.experience.length > 0) {
    const expSheet = workbook.addWorksheet('Experience');
    expSheet.columns = [
      { header: 'Company', key: 'company', width: 30 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Duration', key: 'duration', width: 20 },
      { header: 'Current', key: 'current', width: 10 },
    ];
    
    expSheet.addRows(data.experience.map(exp => ({
      company: exp.company,
      title: exp.title,
      duration: exp.duration,
      current: exp.current ? 'Yes' : 'No',
    })));
    
    expSheet.getRow(1).font = { bold: true };
    expSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF428BCA' },
    };
  }
  
  // Education sheet
  if (data.education && data.education.length > 0) {
    const eduSheet = workbook.addWorksheet('Education');
    eduSheet.columns = [
      { header: 'School', key: 'school', width: 35 },
      { header: 'Degree', key: 'degree', width: 25 },
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Year', key: 'year', width: 10 },
    ];
    
    eduSheet.addRows(data.education);
    
    eduSheet.getRow(1).font = { bold: true };
    eduSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF428BCA' },
    };
  }
  
  // Skills sheet
  if (data.skills && data.skills.length > 0) {
    const skillsSheet = workbook.addWorksheet('Skills');
    skillsSheet.columns = [{ header: 'Skill', key: 'skill', width: 30 }];
    skillsSheet.addRows(data.skills.map(skill => ({ skill })));
    
    skillsSheet.getRow(1).font = { bold: true };
    skillsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF428BCA' },
    };
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generate PowerPoint presentation using pptxgenjs
 */
export async function generatePPTX(data: EnrichedProfile): Promise<Blob> {
  const pptx = new PptxGenJS();
  
  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: '428BCA' };
  titleSlide.addText(data.fullName, {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 1,
    fontSize: 44,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  });
  titleSlide.addText(data.title, {
    x: 0.5,
    y: 2.8,
    w: 9,
    h: 0.5,
    fontSize: 28,
    color: 'FFFFFF',
    align: 'center',
  });
  titleSlide.addText(data.company, {
    x: 0.5,
    y: 3.5,
    w: 9,
    h: 0.5,
    fontSize: 24,
    color: 'FFFFFF',
    align: 'center',
  });
  
  // Overview slide
  const overviewSlide = pptx.addSlide();
  overviewSlide.addText('Contact Information', {
    x: 0.5,
    y: 0.5,
    fontSize: 32,
    bold: true,
    color: '363636',
  });
  
  const contactInfo: string[] = [];
  if (data.email) contactInfo.push(`Email: ${data.email}`);
  if (data.phone) contactInfo.push(`Phone: ${data.phone}`);
  if (data.location) contactInfo.push(`Location: ${data.location}`);
  if (data.linkedin) contactInfo.push(`LinkedIn: ${data.linkedin}`);
  
  overviewSlide.addText(contactInfo.join('\n'), {
    x: 0.5,
    y: 1.5,
    w: 9,
    h: 3,
    fontSize: 18,
    color: '666666',
  });
  
  // Experience slide
  if (data.experience && data.experience.length > 0) {
    const expSlide = pptx.addSlide();
    expSlide.addText('Professional Experience', {
      x: 0.5,
      y: 0.5,
      fontSize: 32,
      bold: true,
      color: '363636',
    });
    
    const rows = [
      [
        { text: 'Company', options: { bold: true } },
        { text: 'Title', options: { bold: true } },
        { text: 'Duration', options: { bold: true } },
      ],
      ...data.experience.slice(0, 5).map(exp => [
        { text: exp.company },
        { text: exp.title },
        { text: exp.duration },
      ]),
    ];
    
    expSlide.addTable(rows, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 4,
      colW: [3, 3, 3],
      fontSize: 14,
    });
  }
  
  // Skills slide
  if (data.skills && data.skills.length > 0) {
    const skillsSlide = pptx.addSlide();
    skillsSlide.addText('Skills & Technologies', {
      x: 0.5,
      y: 0.5,
      fontSize: 32,
      bold: true,
      color: '363636',
    });
    
    skillsSlide.addText(data.skills.join(' • '), {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 4,
      fontSize: 16,
      color: '666666',
    });
  }
  
  return await pptx.write({ outputType: 'blob' }) as Blob;
}

/**
 * Generate JSON export
 */
export function generateJSON(data: EnrichedProfile): Blob {
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * Generate Markdown export
 */
export function generateMarkdown(data: EnrichedProfile): Blob {
  let md = `# ${data.fullName}\n\n`;
  md += `## ${data.title}\n`;
  md += `**${data.company}**\n\n`;
  
  if (data.location) {
    md += `📍 ${data.location}\n\n`;
  }
  
  // Contact
  if (data.email || data.phone) {
    md += `### Contact Information\n\n`;
    if (data.email) md += `- **Email**: ${data.email}\n`;
    if (data.phone) md += `- **Phone**: ${data.phone}\n`;
    if (data.linkedin) md += `- **LinkedIn**: ${data.linkedin}\n`;
    md += '\n';
  }
  
  // Experience
  if (data.experience && data.experience.length > 0) {
    md += `### Professional Experience\n\n`;
    data.experience.forEach(exp => {
      md += `#### ${exp.title} at ${exp.company}\n`;
      md += `*${exp.duration}*\n\n`;
      if (exp.description) {
        md += `${exp.description}\n\n`;
      }
    });
  }
  
  // Education
  if (data.education && data.education.length > 0) {
    md += `### Education\n\n`;
    data.education.forEach(edu => {
      md += `- **${edu.degree}** in ${edu.field || 'N/A'}\n`;
      md += `  ${edu.school} - ${edu.year}\n\n`;
    });
  }
  
  // Skills
  if (data.skills && data.skills.length > 0) {
    md += `### Skills\n\n`;
    md += data.skills.map(skill => `- ${skill}`).join('\n');
    md += '\n';
  }
  
  return new Blob([md], { type: 'text/markdown' });
}

/**
 * Generate CSV export
 */
export function generateCSV(data: EnrichedProfile): Blob {
  let csv = 'Section,Field,Value\n';
  
  // Basic info
  csv += `Basic,Full Name,"${data.fullName}"\n`;
  csv += `Basic,Title,"${data.title}"\n`;
  csv += `Basic,Company,"${data.company}"\n`;
  if (data.location) csv += `Basic,Location,"${data.location}"\n`;
  if (data.email) csv += `Basic,Email,"${data.email}"\n`;
  if (data.phone) csv += `Basic,Phone,"${data.phone}"\n`;
  
  // Experience
  if (data.experience && data.experience.length > 0) {
    csv += '\nCompany,Title,Duration\n';
    data.experience.forEach(exp => {
      csv += `"${exp.company}","${exp.title}","${exp.duration}"\n`;
    });
  }
  
  // Education
  if (data.education && data.education.length > 0) {
    csv += '\nSchool,Degree,Field,Year\n';
    data.education.forEach(edu => {
      csv += `"${edu.school}","${edu.degree}","${edu.field || ''}","${edu.year}"\n`;
    });
  }
  
  // Skills
  if (data.skills && data.skills.length > 0) {
    csv += '\nSkill\n';
    data.skills.forEach(skill => {
      csv += `"${skill}"\n`;
    });
  }
  
  return new Blob([csv], { type: 'text/csv' });
}

/**
 * Main export function - dispatches to appropriate format generator
 */
export async function exportProfile(
  data: EnrichedProfile,
  format: ExportFormat
): Promise<Blob> {
  switch (format) {
    case 'pdf':
      return await generatePDF(data);
    case 'docx':
      return await generateDOCX(data);
    case 'xlsx':
      return await generateXLSX(data);
    case 'pptx':
      return await generatePPTX(data);
    case 'json':
      return generateJSON(data);
    case 'md':
      return generateMarkdown(data);
    case 'csv':
      return generateCSV(data);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Helper to trigger download in browser
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
