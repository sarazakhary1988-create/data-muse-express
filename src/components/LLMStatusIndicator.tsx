import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Server, Cloud, Wifi, WifiOff, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getLLMConfig, type LLMEndpointConfig } from '@/lib/llmConfig';

interface LLMStatusIndicatorProps {
  collapsed?: boolean;
  onOpenSettings?: () => void;
}

export const LLMStatusIndicator = ({ collapsed, onOpenSettings }: LLMStatusIndicatorProps) => {
  const [config, setConfig] = useState<LLMEndpointConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Reload config periodically and on focus
  useEffect(() => {
    const loadConfig = () => setConfig(getLLMConfig());
    loadConfig();
    
    // Refresh on window focus (in case settings changed)
    window.addEventListener('focus', loadConfig);
    // Also listen for storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'llm-endpoint-config') loadConfig();
    };
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener('focus', loadConfig);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  if (!config) return null;

  const preferLocal = config.preferLocal;
  const hasCustomEndpoints = 
    config.ollamaUrl !== 'http://localhost:11434' ||
    config.vllmUrl !== 'http://localhost:8000' ||
    config.hfTgiUrl !== 'http://localhost:8080';

  const statusContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all cursor-pointer",
        "bg-gradient-to-r border",
        preferLocal 
          ? "from-green-500/10 to-emerald-500/5 border-green-500/30 hover:border-green-500/50" 
          : "from-blue-500/10 to-cyan-500/5 border-blue-500/30 hover:border-blue-500/50"
      )}
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {preferLocal ? (
          <Cpu className="w-4 h-4 text-green-500" />
        ) : (
          <Cloud className="w-4 h-4 text-blue-500" />
        )}
      </motion.div>
      
      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <span className={cn(
            "text-xs font-medium truncate",
            preferLocal ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"
          )}>
            {preferLocal ? 'Local LLM' : 'Cloud LLM'}
          </span>
          <span className="text-[10px] text-muted-foreground truncate">
            {preferLocal ? 'Ollama/vLLM/HF' : 'ORKESTRA AI'}
          </span>
        </div>
      )}

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="ml-auto"
        >
          {preferLocal ? (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
              LOCAL
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
              CLOUD
            </Badge>
          )}
        </motion.div>
      )}
    </motion.div>
  );

  const popoverContent = (
    <div className="space-y-3 w-64">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">LLM Backend Status</h4>
        <Badge 
          variant={preferLocal ? "default" : "secondary"}
          className={cn(
            "text-[10px]",
            preferLocal 
              ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" 
              : "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30"
          )}
        >
          {preferLocal ? 'Local First' : 'Cloud First'}
        </Badge>
      </div>

      <div className="space-y-2 text-xs">
        {/* Ollama */}
        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">Ollama</span>
          </div>
          <span className="text-muted-foreground truncate max-w-[120px]" title={config.ollamaUrl}>
            {new URL(config.ollamaUrl).host}
          </span>
        </div>

        {/* vLLM */}
        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">vLLM</span>
          </div>
          <span className="text-muted-foreground truncate max-w-[120px]" title={config.vllmUrl}>
            {new URL(config.vllmUrl).host}
          </span>
        </div>

        {/* HF TGI */}
        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">HF TGI</span>
          </div>
          <span className="text-muted-foreground truncate max-w-[120px]" title={config.hfTgiUrl}>
            {new URL(config.hfTgiUrl).host}
          </span>
        </div>
      </div>

      {/* Fallback note */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {preferLocal 
          ? "Requests go to local endpoints first, falling back to ORKESTRA AI if unavailable."
          : "Using ORKESTRA AI (Gemini) for all requests. Enable 'Prefer Local' in Settings to use local models."
        }
      </p>

      {/* Settings button */}
      {onOpenSettings && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 text-xs"
          onClick={() => {
            setIsOpen(false);
            onOpenSettings();
          }}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Configure Endpoints
        </Button>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-2">
            {statusContent}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          {popoverContent}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="px-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {statusContent}
        </PopoverTrigger>
        <PopoverContent side="right" align="end" className="w-auto">
          {popoverContent}
        </PopoverContent>
      </Popover>
    </div>
  );
};
