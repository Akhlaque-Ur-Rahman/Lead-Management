import { Link } from 'react-router-dom';
import { usePageMeta } from './layout/PageMetaContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Keyboard, BookOpen, HelpCircle } from 'lucide-react';

export function HelpPage() {
  usePageMeta({
    title: 'Help & Shortcuts',
    description: 'Keyboard shortcuts, workflows, and tips for navigating EDUNEX LMS',
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4" />
            Keyboard shortcuts
          </CardTitle>
          <CardDescription>Works on Mac (⌘) and Windows/Linux (Ctrl)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b pb-2">
            <span>Open command palette</span>
            <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">⌘K</kbd>
          </div>
          <div className="flex justify-between gap-4 border-b pb-2">
            <span>Skip to main content</span>
            <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">Tab</kbd>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4" />
            Frequently asked questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">How do I import leads?</p>
            <p className="mt-1">
              Go to Lead Pool, download the Excel template, fill in your data, then use Import. Required columns
              include CIN, Company Name, and director contact fields.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">How do I assign a lead?</p>
            <p className="mt-1">
              From Lead Pool, use the assign dropdown on unassigned leads. Team leads and admins can assign to
              eligible users based on role permissions.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Where are follow-ups tracked?</p>
            <p className="mt-1">
              Open a lead&apos;s detail view to log follow-ups, or use the Follow-up Calendar to see scheduled
              callbacks by date.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Developer documentation
          </CardTitle>
          <CardDescription>Full page and API reference lives in the repository</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            See <code className="text-xs bg-muted px-1 rounded">docs/pages/README.md</code> in the project repo for
            per-page user and developer guides, routing, and permission matrices.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
