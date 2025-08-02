import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ChartLine, AlertTriangle, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-dark-primary via-dark-secondary to-slate-900">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-dark-secondary/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-blue/10 rounded-full mx-auto mb-4">
              <Shield className="h-8 w-8 text-accent-blue" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Sentry</CardTitle>
            <CardDescription className="text-slate-400">
              AI-Powered Security Log Analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-slate-400">
                Sign in with your Google account to access Sentry
              </p>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-accent-blue hover:bg-blue-600"
              >
                Sign In with Google
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Advanced Security Analytics
          </h2>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-accent-blue/10 rounded-lg flex items-center justify-center">
                <ChartLine className="h-6 w-6 text-accent-blue" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-semibold">Real-time Monitoring</h3>
                <p className="text-slate-400 text-sm">Monitor log anomalies as they happen</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-accent-green/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-accent-green" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-semibold">AI-Powered Detection</h3>
                <p className="text-slate-400 text-sm">Advanced ML models identify threats</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-accent-amber/10 rounded-lg flex items-center justify-center">
                <Lock className="h-6 w-6 text-accent-amber" />
              </div>
              <div className="text-left">
                <h3 className="text-white font-semibold">Enterprise Security</h3>
                <p className="text-slate-400 text-sm">Bank-level security and compliance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
