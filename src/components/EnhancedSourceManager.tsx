import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Edit2, Check, X, Settings2, RotateCcw, ChevronDown,
  Link, Sparkles, Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  PREDEFINED_SOURCES,
  PredefinedSource,
  SOURCE_CATEGORIES,
  getSourcesByCategory,
  getEnabledSources,
} from '@/lib/predefinedSources';

interface EnhancedSourceManagerProps {
  onSourcesChange?: (sources: PredefinedSource[]) => void;
}

export const EnhancedSourceManager = ({ onSourcesChange }: EnhancedSourceManagerProps) => {
  const { t, isRTL } = useLanguage();
  const [sources, setSources] = useState<PredefinedSource[]>(PREDEFINED_SOURCES);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', description: '' });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    saudi_market: true,
    international_market: false,
    news: false,
    analysis: false,
    data: false,
    official: true,
  });

  const handleToggleSource = (id: string) => {
    const updated = sources.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setSources(updated);
    onSourcesChange?.(updated);
    
    const source = sources.find(s => s.id === id);
    toast({
      title: source?.enabled ? 'Source Disabled' : 'Source Enabled',
      description: source?.name,
    });
  };

  const handleAddCustomSource = () => {
    if (!newSource.name.trim() || !newSource.url.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both name and URL',
        variant: 'destructive',
      });
      return;
    }

    const customSource: PredefinedSource = {
      id: `custom_${Date.now()}`,
      name: newSource.name,
      url: newSource.url.startsWith('http') ? newSource.url : `https://${newSource.url}`,
      category: 'saudi_market',
      description: newSource.description || 'Custom source',
      priority: 50,
      enabled: true,
    };

    const updated = [...sources, customSource];
    setSources(updated);
    onSourcesChange?.(updated);
    setNewSource({ name: '', url: '', description: '' });
    setShowDialog(false);
    
    toast({
      title: 'Source Added',
      description: `${customSource.name} has been added to your sources`,
    });
  };

  const handleRemoveCustomSource = (id: string) => {
    if (!id.startsWith('custom_')) {
      toast({
        title: 'Cannot Remove',
        description: 'Predefined sources cannot be removed',
        variant: 'destructive',
      });
      return;
    }

    const updated = sources.filter(s => s.id !== id);
    setSources(updated);
    onSourcesChange?.(updated);
    
    toast({
      title: 'Source Removed',
      description: 'Custom source has been removed',
    });
  };

  const handleResetToDefaults = () => {
    setSources(PREDEFINED_SOURCES);
    onSourcesChange?.(PREDEFINED_SOURCES);
    toast({
      title: 'Reset Complete',
      description: 'Sources have been reset to defaults',
    });
  };

  const handleEnableAll = (category?: string) => {
    const updated = sources.map(s =>
      !category || s.category === category ? { ...s, enabled: true } : s
    );
    setSources(updated);
    onSourcesChange?.(updated);
    toast({
      title: 'All Sources Enabled',
      description: category ? `All ${SOURCE_CATEGORIES[category as keyof typeof SOURCE_CATEGORIES].label} sources enabled` : 'All sources enabled',
    });
  };

  const handleDisableAll = (category?: string) => {
    const updated = sources.map(s =>
      !category || s.category === category ? { ...s, enabled: false } : s
    );
    setSources(updated);
    onSourcesChange?.(updated);
    toast({
      title: 'All Sources Disabled',
      description: category ? `All ${SOURCE_CATEGORIES[category as keyof typeof SOURCE_CATEGORIES].label} sources disabled` : 'All sources disabled',
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const filteredSources = sources.filter(source => {
    const matchesSearch = 
      source.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      source.url.toLowerCase().includes(searchFilter.toLowerCase()) ||
      source.description.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || source.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const groupedSources = Object.keys(SOURCE_CATEGORIES).reduce((acc, category) => {
    acc[category] = filteredSources.filter(s => s.category === category);
    return acc;
  }, {} as Record<string, PredefinedSource[]>);

  const enabledCount = sources.filter(s => s.enabled).length;
  const totalCount = sources.length;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Research Sources
          </h3>
          <p className="text-sm text-muted-foreground">
            {enabledCount} of {totalCount} sources enabled
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Custom
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Source</DialogTitle>
                <DialogDescription>
                  Add a custom website to your research sources
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Source Name</Label>
                  <Input
                    placeholder="e.g., My Custom Source"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    placeholder="e.g., https://example.com"
                    value={newSource.url}
                    onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input
                    placeholder="e.g., Custom market data source"
                    value={newSource.description}
                    onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCustomSource}>
                  Add Source
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button size="sm" variant="ghost" onClick={handleResetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sources..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleEnableAll()}
        >
          Enable All
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleDisableAll()}
        >
          Disable All
        </Button>
      </div>

      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          {Object.entries(SOURCE_CATEGORIES).map(([key, { label, icon }]) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              <span className="mr-1">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {Object.entries(groupedSources).map(([category, categorySources]) => {
          if (categorySources.length === 0) return null;
          
          const categoryInfo = SOURCE_CATEGORIES[category as keyof typeof SOURCE_CATEGORIES];
          const isExpanded = expandedCategories[category];
          const enabledInCategory = categorySources.filter(s => s.enabled).length;
          
          return (
            <Collapsible
              key={category}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-3 h-auto"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                    />
                    <span className="text-lg">{categoryInfo.icon}</span>
                    <span className="font-medium">{categoryInfo.label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {enabledInCategory}/{categorySources.length}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnableAll(category);
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      All On
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisableAll(category);
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      All Off
                    </Button>
                  </div>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-1 pl-6 pt-2">
                {categorySources
                  .sort((a, b) => b.priority - a.priority)
                  .map((source) => (
                    <motion.div
                      key={source.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Switch
                          checked={source.enabled}
                          onCheckedChange={() => handleToggleSource(source.id)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{source.name}</span>
                            <Badge variant="outline" className="text-xs">
                              P{source.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {source.url}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {source.description}
                          </p>
                        </div>
                      </div>
                      
                      {source.id.startsWith('custom_') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveCustomSource(source.id)}
                          className="ml-2"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
};
