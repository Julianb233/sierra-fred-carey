"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";

interface TestNotificationButtonProps {
  configId: string;
  channel: string;
  disabled?: boolean;
}

export function TestNotificationButton({
  configId,
  channel,
  disabled = false,
}: TestNotificationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ configId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send test notification");
      }

      toast.success("Test notification sent successfully", {
        description: `Check your ${channel} channel for the test message`,
        icon: <CheckCircledIcon className="h-4 w-4" />,
      });
    } catch (error) {
      toast.error("Failed to send test notification", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
        icon: <CrossCircledIcon className="h-4 w-4" />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleTest}
      disabled={disabled || isLoading}
    >
      {isLoading ? "Sending..." : "Test"}
    </Button>
  );
}
