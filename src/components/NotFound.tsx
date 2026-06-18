import { Link } from 'react-router-dom';
import { PageHeader } from './layout/PageHeader';
import { Button } from './ui/button';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
      <PageHeader
        title="Page not found"
        description="The page you're looking for doesn't exist or you don't have access."
        className="items-center text-center"
      />
      <Button asChild className="mt-6 gap-2">
        <Link to="/dashboard">
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Link>
      </Button>
    </div>
  );
}
