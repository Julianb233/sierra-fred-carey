"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Building2, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { StartupInfo } from "@/lib/hooks/use-onboarding";
import { STARTUP_STAGES, FOUNDER_CHALLENGES } from "@/lib/constants";

interface StartupInfoStepProps {
  startupInfo: StartupInfo;
  onUpdate: (info: Partial<StartupInfo>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StartupInfoStep({
  startupInfo,
  onUpdate,
  onNext,
  onBack,
}: StartupInfoStepProps) {
  const [step, setStep] = useState<"name" | "stage" | "challenge">("name");

  const canProceed = () => {
    switch (step) {
      case "name":
        return (startupInfo.name?.trim().length ?? 0) > 0;
      case "stage":
        return !!startupInfo.stage;
      case "challenge":
        return !!startupInfo.mainChallenge;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === "name") setStep("stage");
    else if (step === "stage") setStep("challenge");
    else onNext();
  };

  const handleBack = () => {
    if (step === "challenge") setStep("stage");
    else if (step === "stage") setStep("name");
    else onBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ff6a1a]/10 flex items-center justify-center">
          {step === "name" && <Building2 className="h-8 w-8 text-[#ff6a1a]" />}
          {step === "stage" && <Target className="h-8 w-8 text-[#ff6a1a]" />}
          {step === "challenge" && <Lightbulb className="h-8 w-8 text-[#ff6a1a]" />}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {step === "name" && "What's your startup called?"}
          {step === "stage" && "What stage are you at?"}
          {step === "challenge" && "What's your biggest challenge?"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {step === "name" && "This helps me personalize our conversations."}
          {step === "stage" && "Different stages need different advice."}
          {step === "challenge" && "Let's focus on what matters most to you."}
        </p>
      </div>

      {/* Form content */}
      <div className="space-y-6">
        {step === "name" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Label htmlFor="startup-name" className="text-sm font-medium">
              Startup Name
            </Label>
            <Input
              id="startup-name"
              value={startupInfo.name || ""}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="e.g., Acme Inc."
              className="mt-1.5"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Or your project name if you don't have one yet
            </p>

            <div className="mt-4">
              <Label htmlFor="description" className="text-sm font-medium">
                Brief Description (optional)
              </Label>
              <Textarea
                id="description"
                value={startupInfo.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="What does your startup do in one sentence?"
                className="mt-1.5 h-20"
              />
            </div>
          </motion.div>
        )}

        {step === "stage" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            {STARTUP_STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => onUpdate({ stage: stage.id as StartupInfo["stage"] })}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all",
                  startupInfo.stage === stage.id
                    ? "border-[#ff6a1a] bg-[#ff6a1a]/5"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {stage.label}
                    </p>
                    <p className="text-sm text-gray-500">{stage.description}</p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2",
                      startupInfo.stage === stage.id
                        ? "border-[#ff6a1a] bg-[#ff6a1a]"
                        : "border-gray-300 dark:border-gray-600"
                    )}
                  >
                    {startupInfo.stage === stage.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-full h-full flex items-center justify-center"
                      >
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}

        {step === "challenge" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-2 gap-3"
          >
            {FOUNDER_CHALLENGES.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => onUpdate({ mainChallenge: challenge.id })}
                className={cn(
                  "p-4 rounded-xl border-2 text-center transition-all",
                  startupInfo.mainChallenge === challenge.id
                    ? "border-[#ff6a1a] bg-[#ff6a1a]/5"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {challenge.label}
                </p>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
        >
          {step === "challenge" ? "Continue" : "Next"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
