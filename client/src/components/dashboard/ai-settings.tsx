import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Bot, Settings, Zap, DollarSign, Gauge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aiConfigSchema } from "@shared/schema";

interface AIProvider {
  openai: Record<string, string>;
  gcp: Record<string, string>;
}

interface AIProvidersResponse {
  models: AIProvider;
  availability: Record<string, boolean>;
  defaultConfig: {
    provider: string;
    tier: string;
    temperature: number;
  };
}

export default function AISettings({ onConfigChange }: { onConfigChange?: (config: any) => void }) {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    provider: "openai",
    tier: "standard",
    temperature: 0.1,
  });

  const { data: providers, isLoading } = useQuery<AIProvidersResponse>({
    queryKey: ["/api/ai-providers"],
  });

  const handleConfigChange = (key: string, value: string | number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    // Validate the configuration
    try {
      const validatedConfig = aiConfigSchema.parse(newConfig);
      onConfigChange?.(validatedConfig);
    } catch (error) {
      console.error("Invalid config:", error);
    }
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case "premium":
        return {
          icon: <Zap className="h-4 w-4" />,
          label: "Premium",
          description: "Most capable and accurate",
          color: "bg-purple-100 text-purple-800",
        };
      case "standard":
        return {
          icon: <Gauge className="h-4 w-4" />,
          label: "Standard",
          description: "Balanced performance and cost",
          color: "bg-blue-100 text-blue-800",
        };
      case "economy":
        return {
          icon: <DollarSign className="h-4 w-4" />,
          label: "Economy",
          description: "Cost-effective option",
          color: "bg-green-100 text-green-800",
        };
      default:
        return {
          icon: <Bot className="h-4 w-4" />,
          label: tier,
          description: "Unknown tier",
          color: "bg-gray-100 text-gray-800",
        };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure AI provider and model settings for log analysis
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label htmlFor="provider">AI Provider</Label>
          <Select value={config.provider} onValueChange={(value) => handleConfigChange("provider", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai" disabled={!providers?.availability.openai}>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span>OpenAI</span>
                  {providers?.availability.openai ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">Unavailable</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="gcp" disabled={!providers?.availability.gcp}>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span>Google Cloud (GCP)</span>
                  {providers?.availability.gcp ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Coming Soon</Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Model Tier Selection */}
        <div className="space-y-3">
          <Label htmlFor="tier">Model Tier</Label>
          <Select value={config.tier} onValueChange={(value) => handleConfigChange("tier", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select model tier" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(providers?.models[config.provider as keyof AIProvider] || {}).map(([tier, description]) => {
                const tierInfo = getTierInfo(tier);
                return (
                  <SelectItem key={tier} value={tier}>
                    <div className="flex items-center gap-2">
                      {tierInfo.icon}
                      <div className="flex flex-col">
                        <span className="font-medium">{description}</span>
                        <span className="text-xs text-muted-foreground">{tierInfo.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {config.tier && (
            <div className="flex items-center gap-2">
              <Badge className={getTierInfo(config.tier).color}>
                {getTierInfo(config.tier).icon}
                {getTierInfo(config.tier).label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {getTierInfo(config.tier).description}
              </span>
            </div>
          )}
        </div>

        {/* Temperature Setting */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature">Creativity Level</Label>
            <span className="text-sm font-medium">{config.temperature}</span>
          </div>
          <Slider
            value={[config.temperature]}
            onValueChange={(value) => handleConfigChange("temperature", value[0])}
            max={1}
            min={0}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Conservative (0.0)</span>
            <span>Balanced (0.5)</span>
            <span>Creative (1.0)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Lower values make responses more focused and deterministic. Higher values increase creativity but may reduce accuracy.
          </p>
        </div>

        {/* Current Configuration Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Current Configuration</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Provider:</span>
              <span className="font-medium capitalize">{config.provider}</span>
            </div>
            <div className="flex justify-between">
              <span>Model:</span>
              <span className="font-medium">{providers?.models[config.provider as keyof AIProvider]?.[config.tier] || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span>Temperature:</span>
              <span className="font-medium">{config.temperature}</span>
            </div>
          </div>
        </div>

        {/* Provider Status */}
        {!providers?.availability[config.provider as keyof typeof providers.availability] && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800">
              <Bot className="h-4 w-4" />
              <span className="text-sm font-medium">Provider Not Available</span>
            </div>
            <p className="text-xs text-orange-600 mt-1">
              {config.provider === "gcp" 
                ? "GCP support is coming soon. Please use OpenAI for now."
                : "This provider is not configured. Please check your API keys."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}