import { useState } from 'react';
import { Settings, Moon, Sun, Trash2, Database, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { useResearchStore } from '@/store/researchStore';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  collapsed?: boolean;
}

export const SettingsDialog = ({ collapsed = false }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { clearTasks, resetSourceConfigs, strictMode, setStrictMode } = useResearchStore();
  const { toast } = useToast();

  const handleClearHistory = () => {
    clearTasks();
    toast({
      title: "History Cleared",
      description: "All research history has been deleted.",
    });
  };

  const handleResetSources = () => {
    resetSourceConfigs();
    toast({
      title: "Sources Reset",
      description: "Deep Verify sources have been reset to defaults.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span>Settings</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your research engine preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appearance */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Appearance</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                )}
                <Label htmlFor="theme-toggle">Dark Mode</Label>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </div>

          <Separator />

          {/* Research Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Research</h4>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="strict-mode">Strict Verification</Label>
                <p className="text-xs text-muted-foreground">
                  Require minimum {strictMode.minSources} sources
                </p>
              </div>
              <Switch
                id="strict-mode"
                checked={strictMode.enabled}
                onCheckedChange={(checked) => setStrictMode({ ...strictMode, enabled: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Data Management */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Data Management</h4>
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleResetSources}
              >
                <RefreshCw className="w-4 h-4" />
                Reset Source Configurations
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={handleClearHistory}
              >
                <Trash2 className="w-4 h-4" />
                Clear Research History
              </Button>
            </div>
          </div>

          <Separator />

          {/* Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">About</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>MANUS 1.6 MAX Research Engine</p>
              <p>Embedded Web Search (Zero Dependencies)</p>
              <p className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                Search engines: DuckDuckGo, Google, Bing
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
