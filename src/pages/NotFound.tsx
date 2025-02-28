
import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 animate-fade-in">
      <div className="space-y-6 max-w-md">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-xl text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link to="/" className="flex items-center">
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
