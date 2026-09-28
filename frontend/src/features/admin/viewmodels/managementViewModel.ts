import type { Module, UserActivity } from "../models/portal";

export function useManagementViewModel(
  modules: Module[],
  userActivities: UserActivity[],
  selectedServiceId: string,
  onSelectService: (id: string) => void,
) {
  const activeService = modules.find((module) => module.id === selectedServiceId) ?? modules[0] ?? {
    id: "none",
    title: "Management",
    description: "No management services configured",
    count: "0",
    icon: "chart" as const,
    tone: "slate" as const,
  };

  const selectService = (id: string) => onSelectService(id);

  return {
    modules,
    userActivities,
    selectedServiceId,
    activeService,
    selectService,
  };
}
