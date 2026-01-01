import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, Plus, Trash2, CheckCircle, XCircle, Loader2, 
  AlertCircle, ChevronDown, ChevronUp, Sparkles, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useResearchEngine } from '@/hooks/useResearchEngine';
import { toast } from '@/hooks/use-toast';

interface Hypothesis {
  id: string;
  statement: string;
  status: 'pending' | 'testing' | 'supported' | 'refuted' | 'inconclusive';
  confidence: number;
  supportingEvidence: Evidence[];
  refutingEvidence: Evidence[];
  createdAt: Date;
  testedAt?: Date;
}

interface Evidence {
  source: string;
  url: string;
  excerpt: string;
  relevance: number;
}

export const HypothesisLab = () => {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [newHypothesis, setNewHypothesis] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const { startResearch } = useResearchEngine();

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
    toast({ title: "Hypothesis Added", description: "Ready to test with AI research" });
  };

  const testHypothesis = async (hypothesis: Hypothesis) => {
    setTestingId(hypothesis.id);
    setHypotheses(prev => prev.map(h => 
      h.id === hypothesis.id ? { ...h, status: 'testing' as const } : h
    ));

    try {
      // Search for supporting evidence
      const supportQuery = `Evidence supporting: "${hypothesis.statement}"`;
      const refuteQuery = `Evidence against or contradicting: "${hypothesis.statement}"`;
      
      // Run both searches
      await startResearch(supportQuery);
      
      // Simulate evidence gathering (in real implementation, this would parse research results)
      setTimeout(() => {
        const mockSupporting: Evidence[] = [
          { source: 'Academic Study', url: 'https://example.com/study1', excerpt: 'Research findings suggest...', relevance: 0.85 },
          { source: 'Industry Report', url: 'https://example.com/report', excerpt: 'Data indicates...', relevance: 0.72 },
        ];
        
        const mockRefuting: Evidence[] = [
          { source: 'Counter Analysis', url: 'https://example.com/analysis', excerpt: 'However, alternative data shows...', relevance: 0.68 },
        ];

        const supportScore = mockSupporting.reduce((acc, e) => acc + e.relevance, 0) / mockSupporting.length;
        const refuteScore = mockRefuting.reduce((acc, e) => acc + e.relevance, 0) / (mockRefuting.length || 1);
        
        let status: Hypothesis['status'] = 'inconclusive';
        let confidence = 50;
        
        if (supportScore > refuteScore + 0.2) {
          status = 'supported';
          confidence = Math.min(95, Math.round(supportScore * 100));
        } else if (refuteScore > supportScore + 0.2) {
          status = 'refuted';
          confidence = Math.min(95, Math.round(refuteScore * 100));
        } else {
          confidence = Math.round((supportScore + refuteScore) / 2 * 100);
        }

        setHypotheses(prev => prev.map(h => 
          h.id === hypothesis.id ? {
            ...h,
            status,
            confidence,
            supportingEvidence: mockSupporting,
            refutingEvidence: mockRefuting,
            testedAt: new Date(),
          } : h
        ));
        
        setTestingId(null);
        setExpandedId(hypothesis.id);
        toast({ 
          title: "Hypothesis Tested", 
          description: `Result: ${status.charAt(0).toUpperCase() + status.slice(1)} (${confidence}% confidence)` 
        });
      }, 3000);
    } catch (error) {
      setTestingId(null);
      setHypotheses(prev => prev.map(h => 
        h.id === hypothesis.id ? { ...h, status: 'pending' as const } : h
      ));
      toast({ title: "Test Failed", description: "Could not complete hypothesis testing", variant: "destructive" });
    }
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <Lightbulb className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Hypothesis Lab</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Test your theories with AI-powered validation. Draft hypotheses and let the AI find evidence to support or refute them.
          </p>
        </div>

        {/* New Hypothesis Input */}
        <Card variant="glass" className="p-6 mb-8">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Draft a Hypothesis
          </h3>
          <Textarea
            value={newHypothesis}
            onChange={(e) => setNewHypothesis(e.target.value)}
            placeholder="Write a clear, testable statement that can be validated with research (e.g., 'Electric vehicle adoption will exceed 50% market share in Europe by 2030')"
            className="min-h-[100px] mb-4"
          />
          <Button onClick={addHypothesis} disabled={!newHypothesis.trim()} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Hypothesis
          </Button>
        </Card>

        {/* Hypotheses List */}
        <div className="space-y-4">
          <AnimatePresence>
            {hypotheses.length === 0 ? (
              <Card variant="glass" className="p-12 text-center">
                <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No Hypotheses Yet</h3>
                <p className="text-sm text-muted-foreground/70 mt-2">
                  Draft a hypothesis above and our AI will analyze evidence to determine if it's supported or refuted.
                </p>
              </Card>
            ) : (
              hypotheses.map((hypothesis) => (
                <motion.div
                  key={hypothesis.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
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
                            <div className="flex items-center gap-3 mt-2">
                              <Badge className={getStatusColor(hypothesis.status)}>
                                {hypothesis.status.charAt(0).toUpperCase() + hypothesis.status.slice(1)}
                              </Badge>
                              {hypothesis.status !== 'pending' && hypothesis.status !== 'testing' && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>Confidence:</span>
                                  <Progress value={hypothesis.confidence} className="w-20 h-2" />
                                  <span>{hypothesis.confidence}%</span>
                                </div>
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
                              <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-green-500">
                                <CheckCircle className="w-4 h-4" />
                                Supporting Evidence ({hypothesis.supportingEvidence.length})
                              </h4>
                              <div className="space-y-2">
                                {hypothesis.supportingEvidence.map((evidence, i) => (
                                  <div key={i} className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-sm">{evidence.source}</span>
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
                              <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-red-500">
                                <XCircle className="w-4 h-4" />
                                Refuting Evidence ({hypothesis.refutingEvidence.length})
                              </h4>
                              <div className="space-y-2">
                                {hypothesis.refutingEvidence.map((evidence, i) => (
                                  <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-sm">{evidence.source}</span>
                                      <Badge variant="outline" className="text-xs">{Math.round(evidence.relevance * 100)}% relevant</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{evidence.excerpt}</p>
                                  </div>
                                ))}
                              </div>
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
