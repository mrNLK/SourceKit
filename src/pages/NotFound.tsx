import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SourceKitMark } from "@/components/brand/SourceKitMark";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <SourceKitMark className="w-10 h-10 text-primary mx-auto mb-6" />
        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-sm text-muted-foreground">This page does not exist.</p>
        <Link
          to="/"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Back to SourceKit
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
