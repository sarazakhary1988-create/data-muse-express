import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ArrowLeft, Filter, SortDesc, Activity, LayoutList, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResultCard } from '@/components/ResultCard';
import { ResearchTrace } from '@/components/ResearchTrace';
import { DiscrepancyReport } from '@/components/DiscrepancyReport';
import { ResearchTask, useResearchStore } from '@/store/researchStore';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ResultsViewProps {
  task: ResearchTask;
  onBack: () => void;
  onViewReport: () => void;
}

export const ResultsView = ({ task, onBack, onViewReport }: ResultsViewProps) => {
  const { reports, agentState } = useResearchStore();
  const { t, isRTL } = useLanguage();
  const taskReport = reports.find(r => r.taskId === task.id);
  const consolidation = agentState.consolidation;

  if (task.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4 text-muted-foreground">{t.common.processing}</p>
      </div>
    );
  }

  if (task.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">{t.common.noResults}</h3>
        <p className="text-sm text-muted-foreground/60 mt-1">
          {isRTL ? 'جرب استعلام بحث مختلف' : 'Try a different search query'}
        </p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isRTL ? 'بحث جديد' : 'New Search'}
        </Button>
      </div>
    );
  }

  // Extract a clean title from the query
  const extractTitle = (query: string): { title: string; description: string } => {
    // Check if query looks like an enhanced prompt with detailed instructions
    const isEnhanced = query.length > 100 || query.includes('analyze') || query.includes('focus on') || query.includes('identify');
    
    if (isEnhanced) {
      // Extract the core topic from the first sentence or key phrase
      const sentences = query.split(/[.!?]/);
      const firstSentence = sentences[0]?.trim() || query;
      
      // Look for common patterns to extract the main topic
      const patterns = [
        /(?:research|analyze|investigate|study|examine)\s+(?:about\s+)?(.+?)(?:\s+and\s+|\s+with\s+|\s+focusing|\s+including|$)/i,
        /^(.+?)\s+(?:company|organization|business|market|industry)/i,
        /^(.+?)(?:\s+analysis|\s+report|\s+study)/i,
      ];
      
      for (const pattern of patterns) {
        const match = firstSentence.match(pattern);
        if (match && match[1]) {
          const title = match[1].trim().replace(/^(the|a|an)\s+/i, '');
          return {
            title: title.charAt(0).toUpperCase() + title.slice(1),
            description: query.length > 200 ? query.substring(0, 200) + '...' : query
          };
        }
      }
      
      // Fallback: use first 50 chars as title
      const shortTitle = firstSentence.length > 50 
        ? firstSentence.substring(0, 50).trim() + '...'
        : firstSentence;
      
      return {
        title: shortTitle,
        description: query.length > 200 ? query.substring(0, 200) + '...' : query
      };
    }
    
    // Simple query - use as is
    return {
      title: query,
      description: ''
    };
  };

  const { title: researchTitle, description: researchDescription } = extractTitle(task.query);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.common.back}
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{researchTitle}</h2>
            {researchDescription && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                {researchDescription}
              </p>
            )}
            <p className="text-sm text-muted-foreground/70 mt-3">
              {isRTL ? 'تم العثور على' : 'Found'} <span className="text-primary font-medium">{task.results.length}</span> {isRTL ? 'مصادر ذات صلة' : 'relevant sources'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {taskReport && (
              <Button variant="hero" size="sm" onClick={onViewReport} className="gap-2">
                <FileText className="w-4 h-4" />
                {t.common.view} {t.report.title}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Sources vs Trace vs Validation */}
      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sources" className="gap-2">
            <LayoutList className="w-4 h-4" />
            {t.common.sources}
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-2">
            <Scale className="w-4 h-4" />
            {isRTL ? 'التحقق' : 'Validation'}
            {consolidation?.discrepancies && consolidation.discrepancies.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {consolidation.discrepancies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trace" className="gap-2">
            <Activity className="w-4 h-4" />
            {isRTL ? 'التتبع' : 'Trace'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card variant="glass" className="p-4">
              <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي المصادر' : 'Total Sources'}</p>
              <p className="text-2xl font-bold">{task.results.length}</p>
            </Card>
            <Card variant="glass" className="p-4">
              <p className="text-sm text-muted-foreground">{isRTL ? 'متوسط الصلة' : 'Avg. Relevance'}</p>
              <p className="text-2xl font-bold text-primary">
                {Math.round(task.results.reduce((acc, r) => acc + r.relevanceScore, 0) / task.results.length * 100)}%
              </p>
            </Card>
            <Card variant="glass" className="p-4">
              <p className="text-sm text-muted-foreground">{isRTL ? 'نطاقات فريدة' : 'Unique Domains'}</p>
              <p className="text-2xl font-bold">
                {new Set(task.results.map(r => r.metadata.domain)).size}
              </p>
            </Card>
            <Card variant="glass" className="p-4">
              <p className="text-sm text-muted-foreground">{isRTL ? 'وقت البحث' : 'Research Time'}</p>
              <p className="text-2xl font-bold">
                {task.completedAt 
                  ? `${Math.round((new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / 1000)}s`
                  : '--'
                }
              </p>
            </Card>
          </div>

          {/* Results Grid */}
          <div className="grid gap-4">
            <AnimatePresence>
              {task.results
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .map((result, index) => (
                  <ResultCard key={result.id} result={result} index={index} />
                ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="validation">
          {consolidation ? (
            <DiscrepancyReport 
              discrepancies={consolidation.discrepancies}
              qualityMetrics={consolidation.qualityMetrics}
              sourceCoverage={consolidation.sourceCoverage}
              consolidatedData={consolidation.consolidatedData}
            />
          ) : (
            <Card variant="glass" className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Scale className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">{isRTL ? 'لا توجد بيانات تحقق' : 'No Validation Data'}</h3>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {isRTL ? 'ستظهر بيانات التحقق هنا بعد اكتمال البحث' : 'Validation data will appear here after research is completed'}
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trace">
          <ResearchTrace task={task} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
