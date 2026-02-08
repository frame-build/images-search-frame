import { ImageUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Login = () => {
  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageUpIcon className="size-4" />
            <CardTitle>ACC Image Search</CardTitle>
          </div>
          <CardDescription>
            Sign in with Autodesk Construction Cloud (ACC) to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <a href="/api/auth/login">Log in with ACC</a>
          </Button>
          <p className="text-muted-foreground text-xs">
            You&apos;ll be redirected to Autodesk to authorize access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
