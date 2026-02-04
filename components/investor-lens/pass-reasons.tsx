"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { XCircle, ArrowRight, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

export interface PassReason {
  id: string;
  reason: string;
  severity: "primary" | "secondary" | "tertiary";
  evidenceNeeded: string[];
  likelihood: number;
}

interface PassReasonsProps {
  reasons: PassReason[];
}

const severityConfig = {
  primary: {
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "Primary",
  },
  secondary: {
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    label: "Secondary",
  },
  tertiary: {
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    label: "Tertiary",
  },
};

export function PassReasons({ reasons }: PassReasonsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const primaryReasons = reasons.filter((r) => r.severity === "primary");
  const secondaryReasons = reasons.filter((r) => r.severity === "secondary");
  const tertiaryReasons = reasons.filter((r) => r.severity === "tertiary");

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-500" />
          <CardTitle className="text-lg">Top Pass Reasons</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Most likely reasons investors would pass, with evidence needed to flip each
        </p>
      </CardHeader>
      <CardContent>
        {reasons.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              No significant pass reasons identified. Strong profile.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Primary Pass Reasons */}
            {primaryReasons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-3">
                  Primary Concerns ({primaryReasons.length})
                </h4>
                <div className="space-y-2">
                  {primaryReasons.map((reason, index) => (
                    <PassReasonItem
                      key={reason.id}
                      reason={reason}
                      index={index}
                      isExpanded={expandedId === reason.id}
                      onToggle={() => setExpandedId(expandedId === reason.id ? null : reason.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Secondary Pass Reasons */}
            {secondaryReasons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-orange-600 mb-3">
                  Secondary Concerns ({secondaryReasons.length})
                </h4>
                <div className="space-y-2">
                  {secondaryReasons.map((reason, index) => (
                    <PassReasonItem
                      key={reason.id}
                      reason={reason}
                      index={index}
                      isExpanded={expandedId === reason.id}
                      onToggle={() => setExpandedId(expandedId === reason.id ? null : reason.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tertiary Pass Reasons */}
            {tertiaryReasons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-600 mb-3">
                  Minor Concerns ({tertiaryReasons.length})
                </h4>
                <div className="space-y-2">
                  {tertiaryReasons.map((reason, index) => (
                    <PassReasonItem
                      key={reason.id}
                      reason={reason}
                      index={index}
                      isExpanded={expandedId === reason.id}
                      onToggle={() => setExpandedId(expandedId === reason.id ? null : reason.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PassReasonItem({
  reason,
  index,
  isExpanded,
  onToggle,
}: {
  reason: PassReason;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = severityConfig[reason.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-lg border overflow-hidden transition-all",
        config.borderColor
      )}
    >
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-between p-4 h-auto hover:bg-transparent",
          config.bgColor
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 text-left">
          <span className={cn("font-medium text-sm", config.color)}>
            {reason.likelihood}%
          </span>
          <span className="text-sm">{reason.reason}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 border-t">
              <p className="text-xs text-muted-foreground mt-3 mb-2">
                Evidence needed to flip this concern:
              </p>
              <div className="space-y-2">
                {reason.evidenceNeeded.map((evidence, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <ArrowRight className="h-3 w-3 text-[#ff6a1a] shrink-0" />
                    <span>{evidence}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
