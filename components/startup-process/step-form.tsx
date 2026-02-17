"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, X } from "lucide-react";
import type {
  StepFormProps,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  Step7Data,
  Step8Data,
  Step9Data,
  StepNumber,
} from "@/types/startup-process";

// Step 1: Define the Problem
function Step1Form({
  data,
  onChange,
  disabled,
}: {
  data: Step1Data | null;
  onChange: (data: Step1Data) => void;
  disabled?: boolean;
}) {
  const formData = data || {
    problemStatement: "",
    who: "",
    frequency: "",
    urgency: "",
  };

  const handleChange = (field: keyof Step1Data, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="problemStatement">
          Problem Statement <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="problemStatement"
          placeholder="Describe the specific problem you're solving in 2-3 sentences..."
          value={formData.problemStatement}
          onChange={(e) => handleChange("problemStatement", e.target.value)}
          disabled={disabled}
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Be specific. Avoid vague statements like &quot;improve productivity.&quot;
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="who">
          Who experiences this problem? <span className="text-destructive">*</span>
        </Label>
        <Input
          id="who"
          placeholder="e.g., Early-stage founders with technical backgrounds"
          value={formData.who}
          onChange={(e) => handleChange("who", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="frequency">
            How often do they encounter this? <span className="text-destructive">*</span>
          </Label>
          <Input
            id="frequency"
            placeholder="e.g., Daily, Weekly, Monthly"
            value={formData.frequency}
            onChange={(e) => handleChange("frequency", e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="urgency">
            How urgent is the need? <span className="text-destructive">*</span>
          </Label>
          <Input
            id="urgency"
            placeholder="e.g., Critical, High, Medium"
            value={formData.urgency}
            onChange={(e) => handleChange("urgency", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

// Step 2: Identify Your Customer
function Step2Form({
  data,
  onChange,
  disabled,
}: {
  data: Step2Data | null;
  onChange: (data: Step2Data) => void;
  disabled?: boolean;
}) {
  const formData = data || {
    economicBuyer: "",
    user: "",
    environment: "",
  };

  const handleChange = (field: keyof Step2Data, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="economicBuyer">
          Economic Buyer (Who pays?) <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="economicBuyer"
          placeholder="Describe who makes the purchasing decision and controls the budget..."
          value={formData.economicBuyer}
          onChange={(e) => handleChange("economicBuyer", e.target.value)}
          disabled={disabled}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user">
          End User (Who uses it?) <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="user"
          placeholder="Describe the actual user of your product. May be different from the buyer..."
          value={formData.user}
          onChange={(e) => handleChange("user", e.target.value)}
          disabled={disabled}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="environment">
          Environment <span className="text-destructive">*</span>
        </Label>
        <Input
          id="environment"
          placeholder="e.g., B2B SaaS, B2C Mobile, Enterprise, SMB"
          value={formData.environment}
          onChange={(e) => handleChange("environment", e.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Where does your solution operate? What&apos;s the context?
        </p>
      </div>
    </div>
  );
}

// Step 3: Your Founder Edge
function Step3Form({
  data,
  onChange,
  disabled,
}: {
  data: Step3Data | null;
  onChange: (data: Step3Data) => void;
  disabled?: boolean;
}) {
  const formData = data || {
    founderEdge: "",
    uniqueInsight: "",
    unfairAdvantage: "",
  };

  const handleChange = (field: keyof Step3Data, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="founderEdge">
          Founder Edge <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="founderEdge"
          placeholder="Why are YOU uniquely positioned to solve this problem? What experience, skills, or background do you bring?"
          value={formData.founderEdge}
          onChange={(e) => handleChange("founderEdge", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="uniqueInsight">
          Unique Insight <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="uniqueInsight"
          placeholder="What do you understand about this problem that others don't? What have you learned that isn't obvious?"
          value={formData.uniqueInsight}
          onChange={(e) => handleChange("uniqueInsight", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="unfairAdvantage">
          Unfair Advantage <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="unfairAdvantage"
          placeholder="What advantage do you have that will be hard for competitors to replicate? (Network, IP, data, team, etc.)"
          value={formData.unfairAdvantage}
          onChange={(e) => handleChange("unfairAdvantage", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      </div>
    </div>
  );
}

// Step 4: Simplest Solution
function Step4Form({
  data,
  onChange,
  disabled,
}: {
  data: Step4Data | null;
  onChange: (data: Step4Data) => void;
  disabled?: boolean;
}) {
  const formData = data || {
    simplestSolution: "",
    explicitlyExcluded: "",
  };

  const handleChange = (field: keyof Step4Data, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="simplestSolution">
          Simplest Solution <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="simplestSolution"
          placeholder="What is the absolute minimum you need to build to solve the core problem? Think MVP, not feature-complete product."
          value={formData.simplestSolution}
          onChange={(e) => handleChange("simplestSolution", e.target.value)}
          disabled={disabled}
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          Focus on the 20% that delivers 80% of the value.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="explicitlyExcluded">
          Explicitly NOT Building <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="explicitlyExcluded"
          placeholder="List features or capabilities you are explicitly choosing NOT to build right now. This is just as important as what you will build."
          value={formData.explicitlyExcluded}
          onChange={(e) => handleChange("explicitlyExcluded", e.target.value)}
          disabled={disabled}
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          Being clear about what you won&apos;t do prevents scope creep.
        </p>
      </div>
    </div>
  );
}

// Step 5: Validate Demand
function Step5Form({
  data,
  onChange,
  disabled,
}: {
  data: Step5Data | null;
  onChange: (data: Step5Data) => void;
  disabled?: boolean;
}) {
  const formData = data || {
    validationMethod: "",
    evidence: "",
    customerQuotes: "",
  };

  const handleChange = (field: keyof Step5Data, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="validationMethod">
          Validation Method <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="validationMethod"
          placeholder="How will you validate that people will pay for this BEFORE you build it? (Pre-orders, landing page, interviews, LOIs, etc.)"
          value={formData.validationMethod}
          onChange={(e) => handleChange("validationMethod", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="evidence">
          Evidence Required <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="evidence"
          placeholder="What specific evidence will convince you to proceed? Be quantitative. (e.g., '10 pre-orders', '50 signups', '3 signed LOIs')"
          value={formData.evidence}
          onChange={(e) => handleChange("evidence", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerQuotes">
          Customer Quotes (Optional)
        </Label>
        <Textarea
          id="customerQuotes"
          placeholder="Include direct quotes from potential customers that demonstrate their pain and willingness to pay..."
          value={formData.customerQuotes || ""}
          onChange={(e) => handleChange("customerQuotes", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      </div>
    </div>
  );
}

// Step 6: Go-to-Market Strategy
function Step6Form({
  data,
  onChange,
  disabled,
}: {
  data: Step6Data | null;
  onChange: (data: Step6Data) => void;
  disabled?: boolean;
}) {
  const formData = data || {
    gtmChannel: "",
    approach: "",
    initialTarget: "",
  };

  const handleChange = (field: keyof Step6Data, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="gtmChannel">
          Primary GTM Channel <span className="text-destructive">*</span>
        </Label>
        <Input
          id="gtmChannel"
          placeholder="e.g., Content marketing, Cold outreach, Paid ads, Community, Partnerships"
          value={formData.gtmChannel}
          onChange={(e) => handleChange("gtmChannel", e.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Pick ONE primary channel to focus on initially.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="approach">
          Acquisition Approach <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="approach"
          placeholder="Describe your step-by-step approach to acquiring your first 10-100 customers through this channel..."
          value={formData.approach}
          onChange={(e) => handleChange("approach", e.target.value)}
          disabled={disabled}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="initialTarget">
          Initial Target (Optional)
        </Label>
        <Input
          id="initialTarget"
          placeholder="e.g., 100 signups in 30 days, 10 paying customers in 60 days"
          value={formData.initialTarget || ""}
          onChange={(e) => handleChange("initialTarget", e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// Step 7: Weekly Execution
function Step7Form({
  data,
  onChange,
  disabled,
}: {
  data: Step7Data | null;
  onChange: (data: Step7Data) => void;
  disabled?: boolean;
}) {
  const formData = data || {
    weeklyPriorities: ["", "", ""],
    ownershipStructure: "",
    decisionMaker: "",
  };

  const handlePriorityChange = (index: number, value: string) => {
    const newPriorities = [...formData.weeklyPriorities];
    newPriorities[index] = value;
    onChange({ ...formData, weeklyPriorities: newPriorities });
  };

  const addPriority = () => {
    if (formData.weeklyPriorities.length < 7) {
      onChange({
        ...formData,
        weeklyPriorities: [...formData.weeklyPriorities, ""],
      });
    }
  };

  const removePriority = (index: number) => {
    if (formData.weeklyPriorities.length > 1) {
      const newPriorities = formData.weeklyPriorities.filter((_, i) => i !== index);
      onChange({ ...formData, weeklyPriorities: newPriorities });
    }
  };

  const handleChange = (field: keyof Omit<Step7Data, "weeklyPriorities">, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>
          Weekly Priorities <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          List your top priorities for this week. Keep it focused.
        </p>
        <div className="space-y-2">
          {formData.weeklyPriorities.map((priority, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground w-6">
                {index + 1}.
              </span>
              <Input
                placeholder={`Priority ${index + 1}`}
                value={priority}
                onChange={(e) => handlePriorityChange(index, e.target.value)}
                disabled={disabled}
                className="flex-1"
              />
              {formData.weeklyPriorities.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePriority(index)}
                  disabled={disabled}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {formData.weeklyPriorities.length < 7 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPriority}
            disabled={disabled}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Priority
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownershipStructure">
          Ownership Structure <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="ownershipStructure"
          placeholder="Who owns what? Define clear ownership for product, technology, business development, operations, etc."
          value={formData.ownershipStructure}
          onChange={(e) => handleChange("ownershipStructure", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="decisionMaker">
          Decision Maker (Optional)
        </Label>
        <Input
          id="decisionMaker"
          placeholder="Who has final say on key decisions?"
          value={formData.decisionMaker || ""}
          onChange={(e) => handleChange("decisionMaker", e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// Step 8: Pilot Program
function Step8Form({
  data,
  onChange,
  disabled,
}: {
  data: Step8Data | null;
  onChange: (data: Step8Data) => void;
  disabled?: boolean;
}) {
  const formData = data || {
    pilotDefinition: "",
    successCriteria: "",
    timeline: "",
  };

  const handleChange = (field: keyof Step8Data, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="pilotDefinition">
          Pilot Definition <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="pilotDefinition"
          placeholder="Describe your pilot program. Who are your pilot users? What will they test? How long will it run? What support will you provide?"
          value={formData.pilotDefinition}
          onChange={(e) => handleChange("pilotDefinition", e.target.value)}
          disabled={disabled}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="successCriteria">
          Success Criteria <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="successCriteria"
          placeholder="What specific, measurable outcomes will define success? (e.g., 80% user retention, NPS > 50, 3+ referrals per user)"
          value={formData.successCriteria}
          onChange={(e) => handleChange("successCriteria", e.target.value)}
          disabled={disabled}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Be specific and quantitative. Avoid vague goals.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeline">
          Timeline (Optional)
        </Label>
        <Input
          id="timeline"
          placeholder="e.g., 4 weeks, 30 days, Q1 2024"
          value={formData.timeline || ""}
          onChange={(e) => handleChange("timeline", e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// Step 9: Scale Decision
function Step9Form({
  data,
  onChange,
  disabled,
}: {
  data: Step9Data | null;
  onChange: (data: Step9Data) => void;
  disabled?: boolean;
}) {
  const formData = data || {
    whatWorked: "",
    whatDidntWork: "",
    scaleDecision: "iterate" as const,
    nextSteps: "",
  };

  const handleChange = (field: keyof Step9Data, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="whatWorked">
          What Worked <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="whatWorked"
          placeholder="What aspects of your pilot succeeded? What got positive feedback? What exceeded expectations?"
          value={formData.whatWorked}
          onChange={(e) => handleChange("whatWorked", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatDidntWork">
          What Didn&apos;t Work <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="whatDidntWork"
          placeholder="What failed or underperformed? What feedback was negative? What assumptions were wrong?"
          value={formData.whatDidntWork}
          onChange={(e) => handleChange("whatDidntWork", e.target.value)}
          disabled={disabled}
          rows={4}
        />
      </div>

      <div className="space-y-3">
        <Label>
          Scale Decision <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={formData.scaleDecision}
          onValueChange={(value) =>
            handleChange("scaleDecision", value as Step9Data["scaleDecision"])
          }
          disabled={disabled}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
            <RadioGroupItem value="scale" id="scale" />
            <Label htmlFor="scale" className="flex-1 cursor-pointer">
              <span className="font-medium text-green-600">Scale</span>
              <p className="text-sm text-muted-foreground">
                Results are strong. Time to grow aggressively.
              </p>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
            <RadioGroupItem value="iterate" id="iterate" />
            <Label htmlFor="iterate" className="flex-1 cursor-pointer">
              <span className="font-medium text-blue-600">Iterate</span>
              <p className="text-sm text-muted-foreground">
                Promising but needs refinement. Continue improving.
              </p>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
            <RadioGroupItem value="pivot" id="pivot" />
            <Label htmlFor="pivot" className="flex-1 cursor-pointer">
              <span className="font-medium text-amber-600">Pivot</span>
              <p className="text-sm text-muted-foreground">
                Core idea has merit but needs significant change.
              </p>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
            <RadioGroupItem value="kill" id="kill" />
            <Label htmlFor="kill" className="flex-1 cursor-pointer">
              <span className="font-medium text-red-600">Kill</span>
              <p className="text-sm text-muted-foreground">
                This isn&apos;t working. Time to move on.
              </p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nextSteps">
          Next Steps (Optional)
        </Label>
        <Textarea
          id="nextSteps"
          placeholder="Based on your decision, what are the immediate next steps?"
          value={formData.nextSteps || ""}
          onChange={(e) => handleChange("nextSteps", e.target.value)}
          disabled={disabled}
          rows={3}
        />
      </div>
    </div>
  );
}

// Main StepForm component that routes to the correct form
export function StepForm({ stepNumber, data, onChange, disabled }: StepFormProps) {
  const formComponents: Record<StepNumber, React.ReactNode> = {
    1: <Step1Form data={data as Step1Data | null} onChange={onChange as (data: Step1Data) => void} disabled={disabled} />,
    2: <Step2Form data={data as Step2Data | null} onChange={onChange as (data: Step2Data) => void} disabled={disabled} />,
    3: <Step3Form data={data as Step3Data | null} onChange={onChange as (data: Step3Data) => void} disabled={disabled} />,
    4: <Step4Form data={data as Step4Data | null} onChange={onChange as (data: Step4Data) => void} disabled={disabled} />,
    5: <Step5Form data={data as Step5Data | null} onChange={onChange as (data: Step5Data) => void} disabled={disabled} />,
    6: <Step6Form data={data as Step6Data | null} onChange={onChange as (data: Step6Data) => void} disabled={disabled} />,
    7: <Step7Form data={data as Step7Data | null} onChange={onChange as (data: Step7Data) => void} disabled={disabled} />,
    8: <Step8Form data={data as Step8Data | null} onChange={onChange as (data: Step8Data) => void} disabled={disabled} />,
    9: <Step9Form data={data as Step9Data | null} onChange={onChange as (data: Step9Data) => void} disabled={disabled} />,
  };

  return (
    <div className="py-2">
      {formComponents[stepNumber]}
    </div>
  );
}

export {
  Step1Form,
  Step2Form,
  Step3Form,
  Step4Form,
  Step5Form,
  Step6Form,
  Step7Form,
  Step8Form,
  Step9Form,
};
