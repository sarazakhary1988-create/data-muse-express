import { motion } from 'framer-motion';
import { Shield, Building2, Landmark, Newspaper, Globe, RotateCcw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useResearchStore, DeepVerifySourceConfig } from '@/store/researchStore';
import { Settings2 } from 'lucide-react';

const getCategoryIcon = (category: DeepVerifySourceConfig['category']) => {
  switch (category) {
    case 'official':
      return <Building2 className="w-4 h-4" />;
    case 'regulator':
      return <Landmark className="w-4 h-4" />;
    case 'news':
      return <Newspaper className="w-4 h-4" />;
    case 'international':
      return <Globe className="w-4 h-4" />;
  }
};

const getCategoryLabel = (category: DeepVerifySourceConfig['category']) => {
  switch (category) {
    case 'official':
      return 'Official Exchange';
    case 'regulator':
      return 'Regulator';
    case 'news':
      return 'Financial News';
    case 'international':
      return 'International';
  }
};

const getCategoryColor = (category: DeepVerifySourceConfig['category']) => {
  switch (category) {
    case 'official':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'regulator':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'news':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'international':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
  }
};

export const DeepVerifySettings = () => {
  const { 
    deepVerifySourceConfigs, 
    toggleSourceEnabled, 
    setAllSourcesEnabled, 
    resetSourceConfigs 
  } = useResearchStore();

  const enabledCount = deepVerifySourceConfigs.filter(s => s.enabled).length;
  const totalCount = deepVerifySourceConfigs.length;

  // Group sources by category
  const groupedSources = deepVerifySourceConfigs.reduce((acc, source) => {
    if (!acc[source.category]) {
      acc[source.category] = [];
    }
    acc[source.category].push(source);
    return acc;
  }, {} as Record<string, DeepVerifySourceConfig[]>);

  const categoryOrder: DeepVerifySourceConfig['category'][] = ['official', 'regulator', 'news', 'international'];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 px-2">
          <Settings2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sources</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {enabledCount}/{totalCount}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Deep Verify Sources
          </DialogTitle>
          <DialogDescription>
            Choose which official sources to crawl during Deep Verify research.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Quick actions */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {enabledCount} of {totalCount} sources enabled
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={() => setAllSourcesEnabled(true)}
              >
                <Check className="w-3 h-3" />
                All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={() => setAllSourcesEnabled(false)}
              >
                <X className="w-3 h-3" />
                None
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={resetSourceConfigs}
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            </div>
          </div>

          <Separator />

          {/* Grouped sources */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {categoryOrder.map((category) => {
              const sources = groupedSources[category];
              if (!sources || sources.length === 0) return null;

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1 rounded ${getCategoryColor(category)}`}>
                      {getCategoryIcon(category)}
                    </div>
                    <span className="text-sm font-medium">{getCategoryLabel(category)}</span>
                  </div>
                  <div className="space-y-2">
                    {sources.map((source, idx) => (
                      <motion.div
                        key={source.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card 
                          className={`p-3 transition-all ${
                            source.enabled 
                              ? 'bg-card border-border' 
                              : 'bg-muted/30 border-muted opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm ${!source.enabled && 'text-muted-foreground'}`}>
                                  {source.name}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {source.baseUrl.replace('https://', '').replace('www.', '')}
                              </p>
                            </div>
                            <Switch
                              checked={source.enabled}
                              onCheckedChange={() => toggleSourceEnabled(source.id)}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p>
              <strong>Tip:</strong> Enable more sources for comprehensive coverage, or fewer for faster research. 
              Official Exchange and Regulator sources provide the most authoritative data.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
