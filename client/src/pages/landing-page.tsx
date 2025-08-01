import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Database, Brain, BarChart3, Users, Lock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LogGuard</h1>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Sign In with Google
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            AI-Powered Security Log Analysis
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Detect threats and anomalies in your security logs using advanced AI and machine learning. 
            LogGuard combines traditional rule-based detection with cutting-edge AI analysis for comprehensive security monitoring.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
          >
            Get Started - Sign In with Google
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Multi-Method Detection
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <Database className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle className="text-blue-700 dark:text-blue-300">Traditional Detection</CardTitle>
                <CardDescription>
                  Rule-based anomaly detection for known threat patterns and suspicious activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Cryptocurrency mining detection</li>
                  <li>• Tor/Dark web access monitoring</li>
                  <li>• Blocked traffic analysis</li>
                  <li>• Pattern-based threat detection</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-purple-600 mb-2" />
                <CardTitle className="text-purple-700 dark:text-purple-300">Advanced ML</CardTitle>
                <CardDescription>
                  Multi-model ensemble with statistical analysis and behavioral profiling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Isolation forest algorithms</li>
                  <li>• User behavior profiling</li>
                  <li>• Network traffic analysis</li>
                  <li>• Time series spike detection</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <Brain className="h-10 w-10 text-green-600 mb-2" />
                <CardTitle className="text-green-700 dark:text-green-300">GenAI Analysis</CardTitle>
                <CardDescription>
                  AI-powered analysis using OpenAI GPT-4o and Google Gemini models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Context-aware threat detection</li>
                  <li>• Natural language analysis</li>
                  <li>• Advanced pattern recognition</li>
                  <li>• Risk scoring with explanations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Enterprise-Grade Security Analysis
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Lock className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Secure by Design</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Built with comprehensive security features including rate limiting, file validation, and data isolation
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="h-6 w-6 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">User-Friendly Interface</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Intuitive dashboard with clear categorization of detection methods and results
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <BarChart3 className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Comprehensive Analytics</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Real-time metrics, risk scoring, and detailed analysis results with export capabilities
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8">
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Supported Log Formats
              </h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Zscaler NSS feed format</li>
                <li>• Comma-separated values (CSV)</li>
                <li>• Tab-delimited files</li>
                <li>• Pipe-separated format</li>
                <li>• Semicolon-delimited format</li>
              </ul>
              <div className="mt-6 p-4 bg-white/80 dark:bg-gray-800/80 rounded border">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>File Limits:</strong> Up to 50MB file size, 100,000 log entries per file
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-blue-600 dark:bg-blue-800">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            Ready to Secure Your Infrastructure?
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Start analyzing your security logs today with our powerful AI-driven detection platform.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg"
          >
            Sign In with Google - Free Start
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 dark:bg-black">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-semibold text-white">LogGuard</span>
          </div>
          <p className="text-gray-400">
            AI-Powered Security Log Anomaly Detection © 2025
          </p>
        </div>
      </footer>
    </div>
  );
}