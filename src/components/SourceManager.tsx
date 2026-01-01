import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Edit2, Check, X, Globe, Building2, Landmark, 
  Newspaper, Settings2, RotateCcw, ChevronDown, ChevronRight,
  Link, Tag, Sparkles
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useResearchStore, DeepVerifySourceConfig } from '@/store/researchStore';
import { toast } from '@/hooks/use-toast';

type SourceCategory = DeepVerifySourceConfig['category'];

const getCategoryIcon = (category: SourceCategory) => {
  switch (category) {
    case 'official': return <Building2 className="w-4 h-4" />;
    case 'regulator': return <Landmark className="w-4 h-4" />;
    case 'news': return <Newspaper className="w-4 h-4" />;
    case 'international': return <Globe className="w-4 h-4" />;
    case 'custom': return <Sparkles className="w-4 h-4" />;
  }
};

const getCategoryLabel = (category: SourceCategory) => {
  switch (category) {
    case 'official': return 'Official';
    case 'regulator': return 'Regulator';
    case 'news': return 'News';
    case 'international': return 'International';
    case 'custom': return 'Custom';
  }
};

const getCategoryColor = (category: SourceCategory) => {
  switch (category) {
    case 'official': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'regulator': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'news': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'international': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'custom': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
  }
};

interface AddSourceFormProps {
  onAdd: (source: Omit<DeepVerifySourceConfig, 'id' | 'isCustom'>) => void;
  onClose: () => void;
  editSource?: DeepVerifySourceConfig;
  onUpdate?: (id: string, updates: Partial<DeepVerifySourceConfig>) => void;
}

const AddSourceForm = ({ onAdd, onClose, editSource, onUpdate }: AddSourceFormProps) => {
  const [name, setName] = useState(editSource?.name || '');
  const [baseUrl, setBaseUrl] = useState(editSource?.baseUrl || '');
  const [category, setCategory] = useState<SourceCategory>(editSource?.category || 'custom');
  const [searchTerms, setSearchTerms] = useState(editSource?.searchTerms.join(', ') || '');

  const handleSubmit = () => {
    if (!name.trim() || !baseUrl.trim()) {
      toast({
        title: "Missing fields",
        description: "Name and URL are required",
        variant: "destructive"
      });
      return;
    }

    let formattedUrl = baseUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const terms = searchTerms.split(',').map(t => t.trim()).filter(t => t.length > 0);

    if (editSource && onUpdate) {
      onUpdate(editSource.id, {
        name: name.trim(),
        baseUrl: formattedUrl,
        category,
        searchTerms: terms.length > 0 ? terms : [name.trim()],
      });
      toast({ title: "Source updated", description: `${name} has been updated` });
    } else {
      onAdd({
        name: name.trim(),
        baseUrl: formattedUrl,
        category,
        searchTerms: terms.length > 0 ? terms : [name.trim()],
        enabled: true,
      });
      toast({ title: "Source added", description: `${name} has been added to your sources` });
    }
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Source Name</Label>
        <Input
          id="name"
          placeholder="e.g., Wikipedia, Reuters, Company Blog"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">Website URL</Label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="url"
            placeholder="https://example.com"
            className="pl-9"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as SourceCategory)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Custom
              </div>
            </SelectItem>
            <SelectItem value="official">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Official
              </div>
            </SelectItem>
            <SelectItem value="news">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4" /> News
              </div>
            </SelectItem>
            <SelectItem value="regulator">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4" /> Regulator
              </div>
            </SelectItem>
            <SelectItem value="international">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> International
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="terms">Search Terms (comma separated)</Label>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="terms"
            placeholder="research, data, report, analysis"
            className="pl-9"
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Keywords to filter relevant pages on this source
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>
          {editSource ? 'Update Source' : 'Add Source'}
        </Button>
      </DialogFooter>
    </div>
  );
};

export const SourceManager = () => {
  const { 
    deepVerifySourceConfigs, 
    toggleSourceEnabled, 
    setAllSourcesEnabled, 
    resetSourceConfigs,
    addCustomSource,
    updateSource,
    deleteSource
  } = useResearchStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DeepVerifySourceConfig | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['custom', 'official']));

  const enabledCount = deepVerifySourceConfigs.filter(s => s.enabled).length;
  const totalCount = deepVerifySourceConfigs.length;
  const customCount = deepVerifySourceConfigs.filter(s => s.isCustom).length;

  // Group sources by category
  const groupedSources = deepVerifySourceConfigs.reduce((acc, source) => {
    const cat = source.isCustom ? 'custom' : source.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(source);
    return acc;
  }, {} as Record<string, DeepVerifySourceConfig[]>);

  const categoryOrder: SourceCategory[] = ['custom', 'official', 'regulator', 'news', 'international'];

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleDelete = (source: DeepVerifySourceConfig) => {
    deleteSource(source.id);
    toast({ title: "Source deleted", description: `${source.name} has been removed` });
  };

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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Research Sources
          </DialogTitle>
          <DialogDescription>
            Add any website as a research source. The agent will crawl these during Deep Verify mode.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-1">
          {/* Quick actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              {enabledCount} enabled • {customCount} custom
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={() => setAllSourcesEnabled(true)}
              >
                <Check className="w-3 h-3" /> All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={() => setAllSourcesEnabled(false)}
              >
                <X className="w-3 h-3" /> None
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={resetSourceConfigs}
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
            </div>
          </div>

          {/* Add new source button */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2" variant="outline">
                <Plus className="w-4 h-4" />
                Add Custom Source
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Research Source</DialogTitle>
                <DialogDescription>
                  Add any website to be crawled during Deep Verify research.
                </DialogDescription>
              </DialogHeader>
              <AddSourceForm 
                onAdd={addCustomSource} 
                onClose={() => setIsAddOpen(false)} 
              />
            </DialogContent>
          </Dialog>

          <Separator />

          {/* Grouped sources */}
          <div className="space-y-2">
            {categoryOrder.map((category) => {
              const sources = groupedSources[category];
              if (!sources || sources.length === 0) return null;
              const isExpanded = expandedCategories.has(category);
              const enabledInCategory = sources.filter(s => s.enabled).length;

              return (
                <Collapsible 
                  key={category} 
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-between h-auto py-2 px-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${getCategoryColor(category)}`}>
                          {getCategoryIcon(category)}
                        </div>
                        <span className="font-medium">{getCategoryLabel(category)}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {enabledInCategory}/{sources.length}
                        </Badge>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 pt-2 pl-2">
                      <AnimatePresence>
                        {sources.map((source, idx) => (
                          <motion.div
                            key={source.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ delay: idx * 0.03 }}
                          >
                            <Card 
                              className={`p-3 transition-all ${
                                source.enabled 
                                  ? 'bg-card border-border' 
                                  : 'bg-muted/30 border-muted opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium text-sm truncate ${!source.enabled && 'text-muted-foreground'}`}>
                                      {source.name}
                                    </span>
                                    {source.isCustom && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                                        Custom
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {source.baseUrl.replace('https://', '').replace('www.', '').replace('http://', '')}
                                  </p>
                                  {source.searchTerms.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {source.searchTerms.slice(0, 3).map((term, i) => (
                                        <Badge key={i} variant="secondary" className="text-[10px] h-4 px-1">
                                          {term}
                                        </Badge>
                                      ))}
                                      {source.searchTerms.length > 3 && (
                                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                          +{source.searchTerms.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {source.isCustom && (
                                    <>
                                      <Dialog open={editingSource?.id === source.id} onOpenChange={(open) => !open && setEditingSource(null)}>
                                        <DialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7"
                                            onClick={() => setEditingSource(source)}
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Edit Source</DialogTitle>
                                          </DialogHeader>
                                          <AddSourceForm 
                                            editSource={source}
                                            onAdd={addCustomSource}
                                            onUpdate={updateSource}
                                            onClose={() => setEditingSource(null)} 
                                          />
                                        </DialogContent>
                                      </Dialog>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(source)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                  <Switch
                                    checked={source.enabled}
                                    onCheckedChange={() => toggleSourceEnabled(source.id)}
                                    className="data-[state=checked]:bg-primary"
                                  />
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p>
              <strong>Tip:</strong> Add any website relevant to your research topic. 
              The agent will map and scrape pages matching your search terms.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
