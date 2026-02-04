"use client";

import { InvestorEvaluation } from "@/components/diagnostic/InvestorEvaluation";

export default function InvestorEvaluationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Investor Readiness</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get an IC-style evaluation of your startup. Receive a clear verdict
            (Yes/No/Not Yet), pass reasons, and evidence needed to flip each
            reason.
          </p>
        </div>
        <InvestorEvaluation />
      </div>
    </div>
  );
}
