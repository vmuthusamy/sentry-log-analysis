import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen bg-dark-primary">
          <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
        </div>
      </Route>
    );
  }

  if (!isAuthenticated) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Component />;
}
