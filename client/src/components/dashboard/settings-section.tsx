import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function SettingsSection() {
  const [aiModel, setAiModel] = useState("gpt-4o");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [realTimeNotifications, setRealTimeNotifications] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [logRetention, setLogRetention] = useState("90");
  const [resultRetention, setResultRetention] = useState("1year");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiRateLimit, setApiRateLimit] = useState("500");
  
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleReset = () => {
    setAiModel("gpt-4o");
    setConfidenceThreshold(0.7);
    setEmailAlerts(true);
    setRealTimeNotifications(false);
    setWeeklySummary(true);
    setLogRetention("90");
    setResultRetention("1year");
    setWebhookUrl("");
    setApiRateLimit("500");
    
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults.",
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-dark-secondary border-b border-slate-700 px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            <p className="text-slate-400 mt-1">Configure detection preferences and notifications</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* AI Model Configuration */}
        <Card className="bg-dark-secondary border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">AI Model Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-slate-300">Default Detection Model</Label>
                <select 
                  className="w-full mt-2 bg-dark-tertiary border border-slate-600 rounded-lg px-3 py-2 text-white"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                >
                  <option value="gpt-4o">GPT-4o (Recommended)</option>
                  <option value="claude-3-opus">Claude-3 Opus</option>
                  <option value="custom">Custom Fine-tuned Model</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Choose the LLM for anomaly detection analysis</p>
              </div>
              <div>
                <Label className="text-slate-300">Confidence Threshold</Label>
                <Input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full mt-2"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>0.1</span>
                  <span className="text-accent-blue">{confidenceThreshold.toFixed(1)}</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-dark-secondary border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300 font-medium">Email Alerts</Label>
                  <p className="text-sm text-slate-400">Receive email notifications for high-risk anomalies</p>
                </div>
                <Switch
                  checked={emailAlerts}
                  onCheckedChange={setEmailAlerts}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300 font-medium">Real-time Notifications</Label>
                  <p className="text-sm text-slate-400">Browser notifications for critical alerts</p>
                </div>
                <Switch
                  checked={realTimeNotifications}
                  onCheckedChange={setRealTimeNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300 font-medium">Weekly Summary</Label>
                  <p className="text-sm text-slate-400">Weekly report of anomaly trends</p>
                </div>
                <Switch
                  checked={weeklySummary}
                  onCheckedChange={setWeeklySummary}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card className="bg-dark-secondary border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Data Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-slate-300">Log Storage Period</Label>
                <select 
                  className="w-full mt-2 bg-dark-tertiary border border-slate-600 rounded-lg px-3 py-2 text-white"
                  value={logRetention}
                  onChange={(e) => setLogRetention(e.target.value)}
                >
                  <option value="30">30 days</option>
                  <option value="90">90 days (Recommended)</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-300">Result Storage</Label>
                <select 
                  className="w-full mt-2 bg-dark-tertiary border border-slate-600 rounded-lg px-3 py-2 text-white"
                  value={resultRetention}
                  onChange={(e) => setResultRetention(e.target.value)}
                >
                  <option value="6months">6 months</option>
                  <option value="1year">1 year (Recommended)</option>
                  <option value="2years">2 years</option>
                  <option value="indefinite">Indefinite</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card className="bg-dark-secondary border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">API Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Webhook URL</Label>
                <Input
                  type="url"
                  placeholder="https://your-app.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="mt-2 bg-dark-tertiary border-slate-600 text-white placeholder-slate-400"
                />
                <p className="text-xs text-slate-500 mt-1">Receive real-time anomaly alerts via webhook</p>
              </div>
              <div>
                <Label className="text-slate-300">API Rate Limit</Label>
                <select 
                  className="w-full mt-2 bg-dark-tertiary border border-slate-600 rounded-lg px-3 py-2 text-white"
                  value={apiRateLimit}
                  onChange={(e) => setApiRateLimit(e.target.value)}
                >
                  <option value="100">100 requests/hour</option>
                  <option value="500">500 requests/hour</option>
                  <option value="1000">1000 requests/hour (Premium)</option>
                  <option value="unlimited">Unlimited (Enterprise)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
          >
            Reset to Defaults
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-accent-blue hover:bg-blue-600"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
