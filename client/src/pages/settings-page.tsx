import { APIKeySettings } from "@/components/dashboard/api-key-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, User, Shield, Bell, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-dark-primary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="bg-dark-secondary border-b border-slate-700 px-6 py-4 -mx-4 -mt-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sentry
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-slate-400 mt-1">Manage your Sentry configuration and preferences</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-300">System Configuration</p>
                <p className="text-xs text-accent-green">All settings synced</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* API Configuration */}
            <APIKeySettings />

            {/* Account Settings */}
            <Card className="bg-dark-secondary border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="h-5 w-5" />
                  Account Settings
                </CardTitle>
                <p className="text-sm text-slate-400">
                  Manage your account preferences and security settings
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-slate-300">
                    <p className="font-medium">Account Information</p>
                    <p className="text-slate-400 mt-1">Account and profile settings will be available in future updates</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="bg-dark-secondary border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="h-5 w-5" />
                  Security & Privacy
                </CardTitle>
                <p className="text-sm text-slate-400">
                  Configure security and privacy preferences
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-slate-300">
                    <p className="font-medium">Data Protection</p>
                    <p className="text-slate-400 mt-1">Your log data is processed locally and never shared with third parties</p>
                  </div>
                  <div className="text-sm text-slate-300">
                    <p className="font-medium">API Key Security</p>
                    <p className="text-slate-400 mt-1">API keys are encrypted and stored securely in your user session</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-dark-secondary border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="text-slate-300 font-medium">Detection Methods</p>
                    <p className="text-slate-400 text-xs mt-1">Configure your preferred analysis approach</p>
                  </div>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Traditional ML - Rule-based detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Advanced ML - Multi-model ensemble</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>AI-Powered - GPT-4o & Gemini analysis</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card className="bg-dark-secondary border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bell className="h-5 w-5" />
                  Help & Documentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-300 font-medium">Getting Started</p>
                    <p className="text-slate-400 text-xs mt-1">Learn how to use Sentry effectively</p>
                  </div>
                  <div>
                    <p className="text-slate-300 font-medium">API Key Setup</p>
                    <p className="text-slate-400 text-xs mt-1">Step-by-step guide for configuring AI services</p>
                  </div>
                  <div>
                    <p className="text-slate-300 font-medium">Detection Methods</p>
                    <p className="text-slate-400 text-xs mt-1">Compare different analysis approaches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}