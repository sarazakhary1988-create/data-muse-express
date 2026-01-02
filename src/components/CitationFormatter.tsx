import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Quote, Copy, Check, BookOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { toast } from 'sonner';

type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee';

interface CitationFormatterProps {
  source: {
    title: string;
    url: string;
    author?: string;
    publishDate?: string;
    domain?: string;
  };
}

export const CitationFormatter = ({ source }: CitationFormatterProps) => {
  const { language, isRTL } = useLanguage();
  const [style, setStyle] = useState<CitationStyle>('apa');
  const [copied, setCopied] = useState(false);

  const isArabic = language === 'ar';

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return isArabic ? 'بدون تاريخ' : 'n.d.';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat(isArabic ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const getYear = (dateStr?: string): string => {
    if (!dateStr) return isArabic ? 'بدون تاريخ' : 'n.d.';
    try {
      return new Date(dateStr).getFullYear().toString();
    } catch {
      return isArabic ? 'بدون تاريخ' : 'n.d.';
    }
  };

  const getAccessDate = (): string => {
    return new Intl.DateTimeFormat(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  };

  const author = source.author || source.domain || 'Unknown';
  const year = getYear(source.publishDate);
  const title = source.title;
  const url = source.url;
  const accessDate = getAccessDate();

  const generateCitation = (): string => {
    switch (style) {
      case 'apa':
        return `${author}. (${year}). ${title}. Retrieved from ${url}`;
      case 'mla':
        return `${author}. "${title}." Web. ${formatDate(source.publishDate)}. <${url}>.`;
      case 'chicago':
        return `${author}. "${title}." Accessed ${accessDate}. ${url}.`;
      case 'harvard':
        return `${author} (${year}) ${title}. Available at: ${url} (Accessed: ${accessDate}).`;
      case 'ieee':
        return `${author}, "${title}," [Online]. Available: ${url}. [Accessed: ${accessDate}].`;
      default:
        return `${author}. ${title}. ${url}`;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCitation());
    setCopied(true);
    toast.success(isArabic ? 'تم نسخ الاستشهاد!' : 'Citation copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const styleLabels: Record<CitationStyle, string> = {
    apa: 'APA 7th',
    mla: 'MLA 9th',
    chicago: 'Chicago',
    harvard: 'Harvard',
    ieee: 'IEEE',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-muted/30 rounded-lg border border-border space-y-3"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Quote className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">
            {isArabic ? 'منسق الاستشهادات' : 'Citation Maestro'}
          </span>
        </div>
        
        <Select value={style} onValueChange={(v) => setStyle(v as CitationStyle)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(styleLabels).map(([key, label]) => (
              <SelectItem key={key} value={key} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 bg-background rounded border border-border/50 text-sm font-mono leading-relaxed">
        {generateCitation()}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="w-full"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-2 text-green-500" />
            {isArabic ? 'تم النسخ!' : 'Copied!'}
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            {isArabic ? 'انسخ الاستشهاد' : 'Copy Citation'}
          </>
        )}
      </Button>
    </motion.div>
  );
};
