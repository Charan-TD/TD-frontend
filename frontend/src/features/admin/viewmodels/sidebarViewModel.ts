"use client";

import { useMemo, useState } from "react";
import type { NavigationSectionId } from "../models/navigation";
import { navigationSections, navigationSubsections } from "../models/navigation";

export function useSidebarViewModel(initialSection: NavigationSectionId = "dashboard") {
  const [selectedSection, setSelectedSection] = useState<NavigationSectionId>(initialSection);
  const [selectedSubsection, setSelectedSubsection] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<NavigationSectionId | null>(initialSection === "dashboard" ? null : initialSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const submenu = useMemo(() => navigationSubsections[selectedSection], [selectedSection]);

  const selectSection = (section: NavigationSectionId) => {
    setSelectedSection(section);
    setSelectedSubsection(navigationSubsections[section][0]?.id ?? null);
    setExpandedSection(section === "dashboard" ? null : section);
  };

  const toggleSection = (section: NavigationSectionId) => {
    if (section === "dashboard") {
      setExpandedSection(null);
      setSelectedSection(section);
      setSelectedSubsection(null);
      return;
    }

    setExpandedSection((current) => current === section ? null : section);
  };

  const selectSubsection = (id: string) => setSelectedSubsection(id);

  return {
    sections: navigationSections,
    selectedSection,
    selectedSubsection,
    expandedSection,
    submenu,
    mobileMenuOpen,
    setMobileMenuOpen,
    selectSection,
    toggleSection,
    selectSubsection,
  };
}
