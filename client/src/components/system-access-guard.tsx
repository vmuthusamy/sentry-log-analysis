import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Shield } from "lucide-react";

interface SystemAccessGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

export function SystemAccessGuard({ 
  children, 
  requiredRole = "system", 
  requiredPermission 
}: SystemAccessGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Check user's system access level
  const { data: systemAccess, isLoading: accessLoading } = useQuery({
    queryKey: ["/api/auth/system-access"],
    retry: false,
    enabled: isAuthenticated && !!user,
  });

  if (isLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to access this area.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if user has system-level access
  const hasSystemAccess = systemAccess?.hasAccess || 
                         (user as any)?.role === 'system' || 
                         (user as any)?.role === 'admin' ||
                         (user as any)?.isSystemUser;

  if (!hasSystemAccess) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>System Access Required</AlertTitle>
          <AlertDescription>
            This area requires system-level access. Your current role: {(user as any)?.role || 'user'}
            <br />
            <br />
            Contact your administrator to request system access permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}