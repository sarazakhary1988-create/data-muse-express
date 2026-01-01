import { motion } from 'framer-motion';
import { ExternalLink, Calendar, User, Globe, Copy, Check, Star } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResearchResult } from '@/store/researchStore';
import { useState } from 'react';

interface ResultCardProps {
  result: ResearchResult;
  index: number;
}

export const ResultCard = ({ result, index }: ResultCardProps) => {
  // DEBUG: Log result to identify React #418 source
  console.log(`[ResultCard ${index}] Rendering:`, {
    id: result?.id,
    title: typeof result?.title === 'string' ? result.title.slice(0, 50) : typeof result?.title,
    titleIsString: typeof result?.title === 'string',
    summary: typeof result?.summary === 'string' ? result.summary.slice(0, 50) : typeof result?.summary,
    summaryIsString: typeof result?.summary === 'string',
    url: typeof result?.url,
    metadata: result?.metadata,
  });
  
  // Guard against non-string values
  if (typeof result?.title !== 'string') {
    console.error(`[ResultCard ${index}] ERROR: result.title is not a string!`, result);
  }
  if (typeof result?.summary !== 'string') {
    console.error(`[ResultCard ${index}] ERROR: result.summary is not a string!`, result);
  }

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-accent bg-accent/10';
    if (score >= 0.6) return 'text-primary bg-primary/10';
    return 'text-muted-foreground bg-muted';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card variant="default" className="hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className={getRelevanceColor(result.relevanceScore)}>
                  <Star className="w-3 h-3 mr-1" />
                  {Math.round(result.relevanceScore * 100)}% Match
                </Badge>
                {result.metadata.domain && (
                  <Badge variant="outline" className="text-xs">
                    <Globe className="w-3 h-3 mr-1" />
                    {result.metadata.domain}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {result.title}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-accent" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-4">
            {result.summary}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {result.metadata.author && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {result.metadata.author}
              </span>
            )}
            {result.metadata.publishDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {result.metadata.publishDate}
              </span>
            )}
            {result.metadata.wordCount && (
              <span>{result.metadata.wordCount.toLocaleString()} words</span>
            )}
          </div>

          <a 
            href={result.url}
            target="_blank"
            rel="noopener noreferrer" 
            className="block mt-3 text-xs text-primary/60 hover:text-primary truncate transition-colors"
          >
            {result.url}
          </a>
        </CardContent>
      </Card>
    </motion.div>
  );
};
