import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
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
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-dark-primary via-dark-secondary to-slate-900">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-dark-secondary/80 backdrop-blur-sm border-slate-700">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-blue/10 rounded-full mx-auto mb-4">
              <Shield className="h-8 w-8 text-accent-blue" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">LogGuard</CardTitle>
            <CardDescription className="text-slate-400">
              AI-Powered Anomaly Detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLogin ? (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    className="mt-2 bg-dark-tertiary border-slate-600 text-white placeholder-slate-400"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password" className="text-slate-300">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="mt-2 bg-dark-tertiary border-slate-600 text-white placeholder-slate-400"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-accent-blue hover:bg-blue-600"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-6">
                <div>
                  <Label htmlFor="username" className="text-slate-300">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    className="mt-2 bg-dark-tertiary border-slate-600 text-white placeholder-slate-400"
                    {...registerForm.register("username")}
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-red-400 text-sm mt-1">{registerForm.formState.errors.username.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="register-email" className="text-slate-300">Email Address</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="john@company.com"
                    className="mt-2 bg-dark-tertiary border-slate-600 text-white placeholder-slate-400"
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="register-password" className="text-slate-300">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    className="mt-2 bg-dark-tertiary border-slate-600 text-white placeholder-slate-400"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-accent-blue hover:bg-blue-600"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-accent-blue hover:text-blue-400 font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
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
