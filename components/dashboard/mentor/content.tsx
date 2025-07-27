import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MentorContent() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Content</CardTitle>
          <CardDescription>
            Manage and share learning materials with your mentees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You don't have any content yet. Upload resources such as articles, slide decks or videos to help your mentees grow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 