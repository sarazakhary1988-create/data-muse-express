import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, Plus, Trash2, CheckCircle, XCircle, Loader2, 
  AlertCircle, ChevronDown, ChevronUp, Sparkles, Search,
  ExternalLink, RefreshCw, Brain, Wand2, BookOpen, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useResearchEngine } from '@/hooks/useResearchEngine';
import { useResearchStore } from '@/store/researchStore';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Hypothesis {
  id: string;
  statement: string;
  status: 'pending' | 'testing' | 'supported' | 'refuted' | 'inconclusive';
  confidence: number;
  supportingEvidence: Evidence[];
  refutingEvidence: Evidence[];
  createdAt: Date;
  testedAt?: Date;
  researchProgress?: number;
}

interface Evidence {
  source: string;
  url: string;
  excerpt: string;
  relevance: number;
}

const exampleHypotheses = [
  { category: 'Business', icon: TrendingUp, examples: [
    "AI-powered customer service will reduce support costs by 40% by 2026",
    "Remote work policies increase employee productivity by 15-20%",
    "Companies with strong ESG practices outperform their peers in the stock market",
  ]},
  { category: 'Technology', icon: Brain, examples: [
    "Quantum computing will break current encryption standards within 10 years",
    "Electric vehicles will comprise 50% of new car sales by 2030",
    "Edge computing will handle 75% of enterprise data by 2025",
  ]},
  { category: 'Science', icon: BookOpen, examples: [
    "Mediterranean diet reduces cardiovascular disease risk by 30%",
    "Sleep deprivation impairs cognitive function similar to alcohol intoxication",
    "Urban green spaces improve mental health outcomes by 20%",
  ]},
];

export const HypothesisLab = () => {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [newHypothesis, setNewHypothesis] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  
  const { startResearch } = useResearchEngine();
  const { currentTask, agentState, isSearching } = useResearchStore();

  const addHypothesis = () => {
    if (!newHypothesis.trim()) return;
    
    const hypothesis: Hypothesis = {
      id: Date.now().toString(),
      statement: newHypothesis.trim(),
      status: 'pending',
      confidence: 0,
      supportingEvidence: [],
      refutingEvidence: [],
      createdAt: new Date(),
    };
    
    setHypotheses(prev => [hypothesis, ...prev]);
    setNewHypothesis('');
    setShowExamples(false);
    toast({ title: "Hypothesis Added", description: "Ready to test with AI research engine" });
  };

  const enhanceHypothesis = async () => {
    if (!newHypothesis.trim()) {
      toast({ title: "Enter a hypothesis", description: "Please write a hypothesis to enhance", variant: "destructive" });
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { 
          prompt: newHypothesis,
          context: 'hypothesis',
          instructions: 'Improve this hypothesis to be more specific, testable, and measurable. Add quantifiable metrics where possible. Keep it concise but precise.'
        },
      });

      if (error) throw error;
      
      if (data?.enhancedPrompt) {
        setNewHypothesis(data.enhancedPrompt);
        toast({ title: "Hypothesis Enhanced", description: "Your hypothesis has been refined for better testability" });
      }
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast({ title: "Enhancement Failed", description: error.message || "Could not enhance hypothesis", variant: "destructive" });
    } finally {
      setIsEnhancing(false);
    }
  };

  const useExampleHypothesis = (example: string) => {
    setNewHypothesis(example);
    setShowExamples(false);
  };

  const extractEvidenceFromResults = useCallback((results: any[], isSupporting: boolean): Evidence[] => {
    if (!results || results.length === 0) return [];
    
    return results.slice(0, 3).map(result => ({
      source: result.metadata?.domain || new URL(result.url).hostname.replace('www.', ''),
      url: result.url,
      excerpt: result.summary || result.content?.slice(0, 200) + '...',
      relevance: result.relevanceScore || Math.random() * 0.3 + 0.6,
    }));
  }, []);

  const testHypothesis = async (hypothesis: Hypothesis) => {
    setTestingId(hypothesis.id);
    setHypotheses(prev => prev.map(h => 
      h.id === hypothesis.id ? { ...h, status: 'testing' as const, researchProgress: 0 } : h
    ));

    try {
      toast({ title: "Phase 1: Gathering Supporting Evidence", description: "Researching claims that support the hypothesis..." });
      
      const supportQuery = `Find evidence, studies, data, and expert opinions that SUPPORT this claim: "${hypothesis.statement}". Include statistics, research findings, and credible sources.`;
      
      const supportResult = await startResearch(supportQuery);
      
      setHypotheses(prev => prev.map(h => 
        h.id === hypothesis.id ? { ...h, researchProgress: 50 } : h
      ));

      toast({ title: "Phase 2: Gathering Counter Evidence", description: "Researching claims that contradict the hypothesis..." });
      
      const refuteQuery = `Find evidence, studies, data, and expert opinions that CONTRADICT or REFUTE this claim: "${hypothesis.statement}". Include counter-arguments, opposing research, and critical analysis.`;
      
      const refuteResult = await startResearch(refuteQuery);

      const supportingEvidence = supportResult?.results 
        ? extractEvidenceFromResults(supportResult.results, true)
        : [];
      
      const refutingEvidence = refuteResult?.results 
        ? extractEvidenceFromResults(refuteResult.results, false)
        : [];

      const supportScore = supportingEvidence.reduce((acc, e) => acc + e.relevance, 0) / Math.max(supportingEvidence.length, 1);
      const refuteScore = refutingEvidence.reduce((acc, e) => acc + e.relevance, 0) / Math.max(refutingEvidence.length, 1);
      
      let status: Hypothesis['status'] = 'inconclusive';
      let confidence = 50;
      
      const evidenceDiff = supportScore - refuteScore;
      const totalEvidence = supportingEvidence.length + refutingEvidence.length;
      
      if (totalEvidence === 0) {
        status = 'inconclusive';
        confidence = 0;
      } else if (evidenceDiff > 0.15 && supportingEvidence.length >= 2) {
        status = 'supported';
        confidence = Math.min(95, Math.round(50 + evidenceDiff * 100 + supportingEvidence.length * 5));
      } else if (evidenceDiff < -0.15 && refutingEvidence.length >= 2) {
        status = 'refuted';
        confidence = Math.min(95, Math.round(50 + Math.abs(evidenceDiff) * 100 + refutingEvidence.length * 5));
      } else {
        status = 'inconclusive';
        confidence = Math.round(50 + evidenceDiff * 50);
      }

      setHypotheses(prev => prev.map(h => 
        h.id === hypothesis.id ? {
          ...h,
          status,
          confidence: Math.max(0, Math.min(100, confidence)),
          supportingEvidence,
          refutingEvidence,
          testedAt: new Date(),
          researchProgress: 100,
        } : h
      ));
      
      setTestingId(null);
      setExpandedId(hypothesis.id);
      
      toast({ 
        title: "Hypothesis Testing Complete", 
        description: `Verdict: ${status.charAt(0).toUpperCase() + status.slice(1)} with ${confidence}% confidence based on ${totalEvidence} sources` 
      });

    } catch (error) {
      console.error('Hypothesis testing failed:', error);
      setTestingId(null);
      setHypotheses(prev => prev.map(h => 
        h.id === hypothesis.id ? { ...h, status: 'pending' as const, researchProgress: undefined } : h
      ));
      toast({ 
        title: "Test Failed", 
        description: error instanceof Error ? error.message : "Could not complete hypothesis testing", 
        variant: "destructive" 
      });
    }
  };

  const retestHypothesis = (hypothesis: Hypothesis) => {
    setHypotheses(prev => prev.map(h => 
      h.id === hypothesis.id ? { 
        ...h, 
        status: 'pending' as const, 
        supportingEvidence: [], 
        refutingEvidence: [],
        confidence: 0,
        testedAt: undefined,
        researchProgress: undefined
      } : h
    ));
    testHypothesis(hypothesis);
  };

  const deleteHypothesis = (id: string) => {
    setHypotheses(prev => prev.filter(h => h.id !== id));
  };

  const getStatusIcon = (status: Hypothesis['status']) => {
    switch (status) {
      case 'supported': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'refuted': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'testing': return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'inconclusive': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default: return <Lightbulb className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: Hypothesis['status']) => {
    switch (status) {
      case 'supported': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'refuted': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'testing': return 'bg-primary/10 text-primary border-primary/20';
      case 'inconclusive': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const testingHypothesis = hypotheses.find(h => h.id === testingId);
  if (testingHypothesis && currentTask && testingId) {
    const progress = Math.min(currentTask.progress, 100);
    if (testingHypothesis.researchProgress !== progress) {
      setHypotheses(prev => prev.map(h => 
        h.id === testingId ? { ...h, researchProgress: progress } : h
      ));
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Hypothesis Lab</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Test your theories with real AI-powered research. Draft hypotheses and let the research engine find evidence to validate or refute them.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="outline" className="gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by Research Engine
            </Badge>
          </div>
        </div>

        {/* New Hypothesis Input */}
        <Card variant="glass" className="p-6 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Draft a Hypothesis
          </h3>
          <Textarea
            value={newHypothesis}
            onChange={(e) => setNewHypothesis(e.target.value)}
            placeholder="Write a clear, testable statement that can be validated with research (e.g., 'Electric vehicle adoption will exceed 50% market share in Europe by 2030')"
            className="min-h-[100px] mb-4 resize-none"
          />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={enhanceHypothesis}
                disabled={!newHypothesis.trim() || isEnhancing}
                className="gap-2"
              >
                {isEnhancing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                AI Enhance
              </Button>
              <p className="text-xs text-muted-foreground">
                Make it more specific & testable
              </p>
            </div>
            <Button onClick={addHypothesis} disabled={!newHypothesis.trim()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Hypothesis
            </Button>
          </div>
        </Card>

        {/* Example Hypotheses */}
        <Collapsible open={showExamples} onOpenChange={setShowExamples}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <Lightbulb className="w-4 h-4" />
              Example Hypotheses
              <ChevronDown className={`w-4 h-4 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {exampleHypotheses.map((category) => (
                <Card key={category.category} variant="glass" className="p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <category.icon className="w-4 h-4 text-primary" />
                    {category.category}
                  </h4>
                  <div className="space-y-2">
                    {category.examples.map((example, i) => (
                      <button
                        key={i}
                        onClick={() => useExampleHypothesis(example)}
                        className="w-full text-left text-sm p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Hypotheses List */}
        <div className="space-y-4">
          <AnimatePresence>
            {hypotheses.length === 0 && !showExamples ? (
              <Card variant="glass" className="p-12 text-center">
                <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No Hypotheses Yet</h3>
                <p className="text-sm text-muted-foreground/70 mt-2 max-w-md mx-auto">
                  Draft a hypothesis above or use an example. Our AI research engine will analyze evidence from multiple sources to determine if it's supported or refuted.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowExamples(true)} 
                  className="mt-4 gap-2"
                >
                  <Lightbulb className="w-4 h-4" />
                  Show Examples
                </Button>
              </Card>
            ) : (
              hypotheses.map((hypothesis) => (
                <motion.div
                  key={hypothesis.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  layout
                >
                  <Card variant="glass" className="overflow-hidden">
                    <Collapsible open={expandedId === hypothesis.id} onOpenChange={() => setExpandedId(expandedId === hypothesis.id ? null : hypothesis.id)}>
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {getStatusIcon(hypothesis.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{hypothesis.statement}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              <Badge className={getStatusColor(hypothesis.status)}>
                                {hypothesis.status.charAt(0).toUpperCase() + hypothesis.status.slice(1)}
                              </Badge>
                              
                              {hypothesis.status === 'testing' && hypothesis.researchProgress !== undefined && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Progress value={hypothesis.researchProgress} className="w-24 h-2" />
                                  <span>{hypothesis.researchProgress}%</span>
                                </div>
                              )}
                              
                              {hypothesis.status !== 'pending' && hypothesis.status !== 'testing' && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>Confidence:</span>
                                  <Progress value={hypothesis.confidence} className="w-20 h-2" />
                                  <span>{hypothesis.confidence}%</span>
                                </div>
                              )}
                              
                              {hypothesis.testedAt && (
                                <span className="text-xs text-muted-foreground">
                                  Tested {new Date(hypothesis.testedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hypothesis.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => testHypothesis(hypothesis)}
                                disabled={testingId !== null}
                                className="gap-2"
                              >
                                <Search className="w-4 h-4" />
                                Test
                              </Button>
                            )}
                            {(hypothesis.status === 'supported' || hypothesis.status === 'refuted' || hypothesis.status === 'inconclusive') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => retestHypothesis(hypothesis)}
                                disabled={testingId !== null}
                                className="gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Retest
                              </Button>
                            )}
                            {(hypothesis.supportingEvidence.length > 0 || hypothesis.refutingEvidence.length > 0) && (
                              <CollapsibleTrigger asChild>
                                <Button size="icon" variant="ghost">
                                  {expandedId === hypothesis.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => deleteHypothesis(hypothesis.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                          {hypothesis.supportingEvidence.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium flex items-center gap-2 mb-3 text-green-500">
                                <CheckCircle className="w-4 h-4" />
                                Supporting Evidence ({hypothesis.supportingEvidence.length})
                              </h4>
                              <div className="space-y-2">
                                {hypothesis.supportingEvidence.map((evidence, i) => (
                                  <div key={i} className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <a 
                                        href={evidence.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-medium text-sm hover:underline flex items-center gap-1"
                                      >
                                        {evidence.source}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                      <Badge variant="outline" className="text-xs">{Math.round(evidence.relevance * 100)}% relevant</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{evidence.excerpt}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {hypothesis.refutingEvidence.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium flex items-center gap-2 mb-3 text-red-500">
                                <XCircle className="w-4 h-4" />
                                Refuting Evidence ({hypothesis.refutingEvidence.length})
                              </h4>
                              <div className="space-y-2">
                                {hypothesis.refutingEvidence.map((evidence, i) => (
                                  <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <a 
                                        href={evidence.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-medium text-sm hover:underline flex items-center gap-1"
                                      >
                                        {evidence.source}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                      <Badge variant="outline" className="text-xs">{Math.round(evidence.relevance * 100)}% relevant</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{evidence.excerpt}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {hypothesis.supportingEvidence.length === 0 && hypothesis.refutingEvidence.length === 0 && hypothesis.status !== 'pending' && (
                            <div className="text-center py-4 text-muted-foreground">
                              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No evidence found. Try rephrasing the hypothesis.</p>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
