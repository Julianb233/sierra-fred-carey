"use client";

import { useState, useMemo } from "react";
import type {
  ExperimentFilterState,
  ExperimentStatus,
  SortOption,
} from "@/components/monitoring/ExperimentFilters";
import type { UIExperiment } from "@/types/monitoring";

export interface UseExperimentFiltersReturn {
  filters: ExperimentFilterState;
  setFilters: (filters: ExperimentFilterState) => void;
  filteredExperiments: UIExperiment[];
  totalCount: number;
  filteredCount: number;
}

function matchesSearch(experiment: UIExperiment, search: string): boolean {
  if (!search) return true;

  const searchLower = search.toLowerCase();
  const nameMatch = experiment.name.toLowerCase().includes(searchLower);
  const variantMatch = experiment.variants.some((v) => v.toLowerCase().includes(searchLower));
  const winnerMatch = experiment.winner ? experiment.winner.toLowerCase().includes(searchLower) : false;

  return nameMatch || variantMatch || winnerMatch;
}

function matchesStatus(experiment: UIExperiment, status: ExperimentStatus): boolean {
  if (status === "all") {
    return true;
  }
  return experiment.status === status;
}

function sortExperiments(experiments: UIExperiment[], sortBy: SortOption): UIExperiment[] {
  const sorted = [...experiments];

  switch (sortBy) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "date":
      sorted.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      break;
    case "significance":
      sorted.sort((a, b) => (b.significance || 0) - (a.significance || 0));
      break;
    case "traffic":
      sorted.sort((a, b) => b.traffic - a.traffic);
      break;
  }

  return sorted;
}

export function useExperimentFilters(
  experiments: UIExperiment[]
): UseExperimentFiltersReturn {
  const [filters, setFilters] = useState<ExperimentFilterState>({
    search: "",
    status: "all",
    sortBy: "date",
  });

  const filteredExperiments = useMemo(() => {
    let filtered = experiments;

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter((exp) => matchesSearch(exp, filters.search));
    }

    // Apply status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((exp) => matchesStatus(exp, filters.status));
    }

    // Apply minimum significance filter
    if (filters.minSignificance !== undefined) {
      filtered = filtered.filter(
        (exp) => exp.significance !== undefined && exp.significance >= filters.minSignificance!
      );
    }

    // Apply sorting
    filtered = sortExperiments(filtered, filters.sortBy);

    return filtered;
  }, [experiments, filters]);

  return {
    filters,
    setFilters,
    filteredExperiments,
    totalCount: experiments.length,
    filteredCount: filteredExperiments.length,
  };
}
