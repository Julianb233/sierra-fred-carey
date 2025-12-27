import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-sm normal-case",
            card: "shadow-xl",
            headerTitle: "text-2xl font-bold",
            headerSubtitle: "text-gray-600",
            socialButtonsBlockButton:
              "border-gray-300 hover:bg-gray-50",
            formFieldInput:
              "border-gray-300 focus:ring-violet-500 focus:border-violet-500",
            footerActionLink:
              "text-violet-600 hover:text-violet-700 font-medium",
          },
        }}
        routing="hash"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
        redirectUrl="/dashboard"
      />
    </div>
  );
}
