"use client";

import { UserButton as ClerkUserButton } from "@clerk/nextjs";
import { User } from "lucide-react";

export function UserButton() {
  return (
    <ClerkUserButton
      appearance={{
        elements: {
          avatarBox: "w-9 h-9",
          userButtonPopoverCard: "shadow-xl border border-gray-200",
          userButtonPopoverActionButton: "hover:bg-gray-100",
          userButtonPopoverActionButtonText: "text-gray-700",
          userButtonPopoverActionButtonIcon: "text-gray-500",
        },
      }}
      afterSignOutUrl="/"
    >
      <ClerkUserButton.UserProfilePage label="Dashboard" url="/dashboard" labelIcon={<User className="w-4 h-4" />} />
    </ClerkUserButton>
  );
}
