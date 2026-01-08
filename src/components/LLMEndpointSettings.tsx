import { useState, useEffect } from 'react';
import { Server, Cpu, TestTube2, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EndpointConfig {
  ollamaUrl: string;
  vllmUrl: string;
  hfTgiUrl: string;
  preferLocal: boolean;
}

interface EndpointStatus {
  ollama: 'unknown' | 'checking' | 'online' | 'offline';
  vllm: 'unknown' | 'checking' | 'online' | 'offline';
  hfTgi: 'unknown' | 'checking' | 'online' | 'offline';
}

const DEFAULT_CONFIG: EndpointConfig = {
  ollamaUrl: 'http://localhost:11434',
  vllmUrl: 'http://localhost:8000',
  hfTgiUrl: 'http://localhost:8080',
  preferLocal: true,
};

const STORAGE_KEY = 'llm-endpoint-config';

export const LLMEndpointSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<EndpointConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<EndpointStatus>({
    ollama: 'unknown',
    vllm: 'unknown',
    hfTgi: 'unknown',
  });
  const [isTesting, setIsTesting] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      } catch (e) {
        console.error('Failed to parse LLM endpoint config:', e);
      }
    }
  }, []);

  // Save config to localStorage when it changes
  const saveConfig = (newConfig: EndpointConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const updateField = (field: keyof EndpointConfig, value: string | boolean) => {
    saveConfig({ ...config, [field]: value });
  };

  const resetToDefaults = () => {
    saveConfig(DEFAULT_CONFIG);
    setStatus({ ollama: 'unknown', vllm: 'unknown', hfTgi: 'unknown' });
    toast({ title: "Reset Complete", description: "LLM endpoints reset to defaults" });
  };

  const testEndpoint = async (type: 'ollama' | 'vllm' | 'hfTgi') => {
    const urlMap = {
      ollama: config.ollamaUrl,
      vllm: config.vllmUrl,
      hfTgi: config.hfTgiUrl,
    };

    setStatus(prev => ({ ...prev, [type]: 'checking' }));

    try {
      // Test via the llm-router edge function
      const { data, error } = await supabase.functions.invoke('llm-router', {
        body: {
          testEndpoint: true,
          endpointType: type,
          endpointUrl: urlMap[type],
        },
      });

      if (error) throw error;

      setStatus(prev => ({ 
        ...prev, 
        [type]: data?.available ? 'online' : 'offline' 
      }));

      if (data?.available) {
        toast({ 
          title: "Endpoint Online", 
          description: `${type.toUpperCase()} is responding at ${urlMap[type]}` 
        });
      } else {
        toast({ 
          title: "Endpoint Offline", 
          description: data?.error || `Could not connect to ${type.toUpperCase()}`, 
          variant: "destructive" 
        });
      }
    } catch (err) {
      setStatus(prev => ({ ...prev, [type]: 'offline' }));
      toast({ 
        title: "Test Failed", 
        description: err instanceof Error ? err.message : "Connection test failed", 
        variant: "destructive" 
      });
    }
  };

  const testAllEndpoints = async () => {
    setIsTesting(true);
    await Promise.all([
      testEndpoint('ollama'),
      testEndpoint('vllm'),
      testEndpoint('hfTgi'),
    ]);
    setIsTesting(false);
  };

  const getStatusIcon = (s: 'unknown' | 'checking' | 'online' | 'offline') => {
    switch (s) {
      case 'checking': return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
      case 'online': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Server className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (s: 'unknown' | 'checking' | 'online' | 'offline') => {
    switch (s) {
      case 'checking': return <Badge variant="secondary">Checking...</Badge>;
      case 'online': return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Online</Badge>;
      case 'offline': return <Badge variant="destructive">Offline</Badge>;
      default: return <Badge variant="outline">Not Tested</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Prefer Local Switch */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div className="space-y-0.5">
          <Label htmlFor="prefer-local" className="font-medium">Prefer Local Models</Label>
          <p className="text-xs text-muted-foreground">
            Try local inference first before using commercial APIs
          </p>
        </div>
        <Switch
          id="prefer-local"
          checked={config.preferLocal}
          onCheckedChange={(checked) => updateField('preferLocal', checked)}
        />
      </div>

      {/* Endpoint Configurations */}
      <div className="space-y-3">
        {/* Ollama */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.ollama)}
              <div>
                <Label className="font-medium">Ollama (DeepSeek, Llama, Qwen)</Label>
                <p className="text-xs text-muted-foreground">Local inference via Ollama</p>
              </div>
            </div>
            {getStatusBadge(status.ollama)}
          </div>
          <div className="flex gap-2">
            <Input
              value={config.ollamaUrl}
              onChange={(e) => updateField('ollamaUrl', e.target.value)}
              placeholder="http://localhost:11434"
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => testEndpoint('ollama')}
              disabled={status.ollama === 'checking'}
            >
              <TestTube2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* vLLM */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.vllm)}
              <div>
                <Label className="font-medium">vLLM (DeepSeek High Performance)</Label>
                <p className="text-xs text-muted-foreground">High-throughput inference server</p>
              </div>
            </div>
            {getStatusBadge(status.vllm)}
          </div>
          <div className="flex gap-2">
            <Input
              value={config.vllmUrl}
              onChange={(e) => updateField('vllmUrl', e.target.value)}
              placeholder="http://localhost:8000"
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => testEndpoint('vllm')}
              disabled={status.vllm === 'checking'}
            >
              <TestTube2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* HuggingFace TGI */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.hfTgi)}
              <div>
                <Label className="font-medium">HuggingFace TGI (Llama, Qwen)</Label>
                <p className="text-xs text-muted-foreground">Text Generation Inference server</p>
              </div>
            </div>
            {getStatusBadge(status.hfTgi)}
          </div>
          <div className="flex gap-2">
            <Input
              value={config.hfTgiUrl}
              onChange={(e) => updateField('hfTgiUrl', e.target.value)}
              placeholder="http://localhost:8080"
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => testEndpoint('hfTgi')}
              disabled={status.hfTgi === 'checking'}
            >
              <TestTube2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 gap-2"
          onClick={testAllEndpoints}
          disabled={isTesting}
        >
          {isTesting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <TestTube2 className="w-4 h-4" />
          )}
          Test All Endpoints
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          onClick={resetToDefaults}
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/30">
        <p className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          <strong>Requirements:</strong> DeepSeek needs 2x A100 GPUs; Llama/Qwen need ~40GB+ VRAM
        </p>
        <p>Local models provide privacy and no API costs. Falls back to commercial APIs if unavailable.</p>
      </div>
    </div>
  );
};

// Export helper to get current config for use in API calls
export const getLLMEndpointConfig = (): EndpointConfig => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
};
