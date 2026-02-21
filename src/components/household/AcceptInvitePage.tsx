import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { acceptInvitation } from "@/services/household";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !token) return;
    if (!user) {
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }

    acceptInvitation(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to accept invitation");
        setStatus("error");
      });
  }, [token, user, authLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {status === "loading" && "Processing Invitation..."}
            {status === "success" && "Welcome!"}
            {status === "error" && "Invitation Error"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we process your invitation."}
            {status === "success" && "You've been added to the household."}
            {status === "error" && error}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {status === "loading" && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          )}
          {(status === "success" || status === "error") && (
            <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
