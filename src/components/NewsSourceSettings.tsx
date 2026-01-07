import { useState } from 'react';
import { 
  Shield, 
  ShieldOff, 
  Plus, 
  X, 
  RotateCcw,
  Check,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNewsSourceSettings } from '@/hooks/useNewsSourceSettings';
import { cn } from '@/lib/utils';

export function NewsSourceSettings() {
  const {
    settings,
    setMode,
    addToWhitelist,
    removeFromWhitelist,
    addToBlacklist,
    removeFromBlacklist,
    resetSettings,
  } = useNewsSourceSettings();

  const [newSource, setNewSource] = useState('');

  const handleAddSource = () => {
    if (!newSource.trim()) return;
    
    if (settings.mode === 'whitelist') {
      addToWhitelist(newSource);
    } else {
      addToBlacklist(newSource);
    }
    setNewSource('');
  };

  const handleRemoveSource = (source: string) => {
    if (settings.mode === 'whitelist') {
      removeFromWhitelist(source);
    } else {
      removeFromBlacklist(source);
    }
  };

  const currentList = settings.mode === 'whitelist' ? settings.whitelist : settings.blacklist;

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
        <div className="flex items-center gap-3">
          {settings.mode === 'whitelist' ? (
            <Shield className="w-4 h-4 text-green-500" />
          ) : (
            <ShieldOff className="w-4 h-4 text-amber-500" />
          )}
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">
              {settings.mode === 'whitelist' ? 'Whitelist Mode' : 'Blacklist Mode'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {settings.mode === 'whitelist' 
                ? 'Only show news from listed sources' 
                : 'Hide news from listed sources'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Blacklist</span>
          <Switch
            checked={settings.mode === 'whitelist'}
            onCheckedChange={(checked) => setMode(checked ? 'whitelist' : 'blacklist')}
          />
          <span className="text-xs text-muted-foreground">Whitelist</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          {settings.mode === 'whitelist'
            ? 'Add trusted sources to show only their news. Leave empty to show all sources.'
            : 'Add unwanted sources to hide their news from your feed.'}
        </p>
      </div>

      {/* Add Source Input */}
      <div className="flex gap-2">
        <Input
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
          placeholder={`Add source to ${settings.mode}...`}
          className="flex-1 h-9 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
        />
        <Button
          size="sm"
          onClick={handleAddSource}
          disabled={!newSource.trim()}
          className="h-9 px-3"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Common Sources Quick Add */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quick add common sources:</Label>
        <div className="flex flex-wrap gap-1.5">
          {['reuters', 'bloomberg', 'cnbc', 'wsj', 'ft', 'yahoo', 'marketwatch', 'seeking alpha'].map((source) => {
            const isInList = currentList.includes(source);
            return (
              <Button
                key={source}
                variant="outline"
                size="sm"
                onClick={() => isInList ? handleRemoveSource(source) : (settings.mode === 'whitelist' ? addToWhitelist(source) : addToBlacklist(source))}
                className={cn(
                  "h-6 px-2 text-xs capitalize",
                  isInList && "bg-primary/10 border-primary/30 text-primary"
                )}
              >
                {isInList && <Check className="w-3 h-3 mr-1" />}
                {source}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Current List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            {settings.mode === 'whitelist' ? 'Whitelisted' : 'Blacklisted'} sources ({currentList.length})
          </Label>
          {currentList.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetSettings}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear all and reset to defaults</TooltipContent>
            </Tooltip>
          )}
        </div>

        {currentList.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No sources {settings.mode === 'whitelist' ? 'whitelisted' : 'blacklisted'} yet
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border/50 bg-muted/30 max-h-32 overflow-y-auto">
            {currentList.map((source) => (
              <Badge
                key={source}
                variant="secondary"
                className={cn(
                  "gap-1 px-2 py-1 capitalize",
                  settings.mode === 'whitelist' 
                    ? "bg-green-500/10 text-green-600 border-green-500/30" 
                    : "bg-red-500/10 text-red-600 border-red-500/30"
                )}
              >
                {source}
                <button
                  onClick={() => handleRemoveSource(source)}
                  className="hover:bg-background/50 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
