import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Key, CheckCircle, XCircle, Save, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface APIKeyStatus {
  openai: { configured: boolean; working: boolean; error?: string };
  gemini: { configured: boolean; working: boolean; error?: string };
}

export function APIKeySettings() {
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState({ openai: false, gemini: false });
  const [apiKeys, setApiKeys] = useState({ openai: "", gemini: "" });

  // Get current API key status
  const { data: keyStatus, isLoading } = useQuery<APIKeyStatus>({
    queryKey: ["/api/user-api-keys/status"],
  });

  // Save API keys mutation
  const saveKeysMutation = useMutation({
    mutationFn: async (keys: { provider: string; apiKey: string }) => {
      const res = await apiRequest("POST", "/api/user-api-keys", keys);
      return await res.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "API Key Saved",
        description: `${variables.provider.toUpperCase()} API key configured successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-api-keys/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      // Clear the input after successful save
      setApiKeys(prev => ({ ...prev, [variables.provider]: "" }));
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test API key mutation
  const testKeyMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await apiRequest("POST", `/api/user-api-keys/${provider}/test`);
      return await res.json();
    },
    onSuccess: (data, provider) => {
      toast({
        title: "API Key Test Successful",
        description: `${provider.toUpperCase()} API key is working correctly`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-api-keys/status"] });
    },
    onError: (error: Error, provider) => {
      toast({
        title: `${provider.toUpperCase()} API Key Test Failed`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveKey = (provider: string) => {
    const key = apiKeys[provider as keyof typeof apiKeys];
    if (!key.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }
    saveKeysMutation.mutate({ provider, apiKey: key });
  };

  const handleTestKey = (provider: string) => {
    testKeyMutation.mutate(provider);
  };

  const getStatusBadge = (status: { configured: boolean; working: boolean; error?: string }) => {
    if (!status.configured) {
      return <Badge variant="secondary">Not Configured</Badge>;
    }
    if (status.working) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Working</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
  };

  if (isLoading) {
    return (
      <Card className="bg-dark-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Key className="h-5 w-5" />
            API Key Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-dark-secondary border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Key className="h-5 w-5" />
          API Key Configuration
        </CardTitle>
        <p className="text-sm text-slate-400">
          Configure your own API keys for enhanced AI analysis capabilities
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="openai" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-dark-tertiary">
            <TabsTrigger value="openai" className="data-[state=active]:bg-slate-600">
              OpenAI GPT-4o
            </TabsTrigger>
            <TabsTrigger value="gemini" className="data-[state=active]:bg-slate-600">
              Google Gemini
            </TabsTrigger>
          </TabsList>

          <TabsContent value="openai" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">OpenAI Configuration</h3>
                <p className="text-sm text-slate-400">Configure your OpenAI API key for GPT-4o analysis</p>
              </div>
              {keyStatus?.openai && getStatusBadge(keyStatus.openai)}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key" className="text-slate-300">API Key</Label>
                <div className="relative">
                  <Input
                    id="openai-key"
                    type={showKeys.openai ? "text" : "password"}
                    placeholder="sk-..."
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                    className="bg-dark-tertiary border-slate-600 text-white pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-12 top-0 h-full px-2 text-slate-400 hover:text-white"
                    onClick={() => setShowKeys(prev => ({ ...prev, openai: !prev.openai }))}
                  >
                    {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2 text-slate-400 hover:text-white"
                    onClick={() => handleSaveKey("openai")}
                    disabled={saveKeysMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {keyStatus?.openai?.configured && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestKey("openai")}
                    disabled={testKeyMutation.isPending}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              )}

              {keyStatus?.openai?.error && (
                <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded border border-red-800">
                  Error: {keyStatus.openai.error}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="gemini" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">Google Gemini Configuration</h3>
                <p className="text-sm text-slate-400">Configure your Google AI API key for Gemini analysis</p>
              </div>
              {keyStatus?.gemini && getStatusBadge(keyStatus.gemini)}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gemini-key" className="text-slate-300">API Key</Label>
                <div className="relative">
                  <Input
                    id="gemini-key"
                    type={showKeys.gemini ? "text" : "password"}
                    placeholder="AIza..."
                    value={apiKeys.gemini}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                    className="bg-dark-tertiary border-slate-600 text-white pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-12 top-0 h-full px-2 text-slate-400 hover:text-white"
                    onClick={() => setShowKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
                  >
                    {showKeys.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2 text-slate-400 hover:text-white"
                    onClick={() => handleSaveKey("gemini")}
                    disabled={saveKeysMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {keyStatus?.gemini?.configured && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestKey("gemini")}
                    disabled={testKeyMutation.isPending}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              )}

              {keyStatus?.gemini?.error && (
                <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded border border-red-800">
                  Error: {keyStatus.gemini.error}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-blue-900/20 rounded border border-blue-800">
          <h4 className="text-sm font-medium text-blue-300 mb-2">Getting API Keys</h4>
          <div className="text-xs text-blue-200 space-y-1">
            <p><strong>OpenAI:</strong> Visit platform.openai.com → API Keys → Create new key</p>
            <p><strong>Google Gemini:</strong> Visit ai.google.dev → Get API Key → Create in new project</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}