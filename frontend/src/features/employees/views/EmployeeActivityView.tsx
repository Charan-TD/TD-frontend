"use client";

import { useState } from "react";
import { Icon } from "../../admin/components/Icon";
import { InitialsAvatar } from "../../admin/components/InitialsAvatar";
import { SectionSearch } from "../../admin/components/SectionActions";
import { Skeleton } from "../../admin/components/Skeleton";
import { useGetEmployeesQuery } from "../api/adminUsersApi";
import { PORTAL_SECTIONS } from "../models/employee";
import { hasEdit, hasView, isLinkedResource, isPausedSection, sectionDisplayName } from "../models/permissions";

/**
 * Employee activity: pick an employee to see who they are and what they can
 * access. The action log itself needs audit logging in the backend, which does
 * not exist yet, so it says so instead of showing made-up activity.
 */
export function EmployeeActivityView({ onManageAccess }: { onBack?: () => void; onManageAccess?: (employeeId: string) => void }) {
  const { data, isLoading } = useGetEmployeesQuery({ all: true, includeRoleMetadata: true });
  const employees = data?.employees ?? [];
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const shown = employees.filter((employee) => !needle || `${employee.name} ${employee.empId} ${employee.email}`.toLowerCase().includes(needle));
  const selected = employees.find((employee) => employee.id === pickedId) ?? shown[0];

  const label = (resource: string) => PORTAL_SECTIONS.find((section) => section.id === resource)?.label ?? sectionDisplayName(resource);
  const access = selected
    ? Object.entries(selected.access)
        .filter(([resource, actions]) => !isLinkedResource(resource) && !isPausedSection(resource) && (actions ?? []).length > 0)
        .map(([resource, actions]) => ({ resource, label: label(resource), level: hasEdit(actions) ? "Edit" : hasView(actions) ? "View" : "" }))
    : [];

  return (
    <section className="td-activity-page">
      <SectionSearch value={query} onChange={setQuery} placeholder="Search an employee to track" />

      <aside className="td-card td-roles-list td-people">
        <header><h3>Employees</h3><p>Pick someone to see their activity</p></header>
        {isLoading ? <div style={{ display: "grid", gap: 8 }}><Skeleton height={40} /><Skeleton height={40} /><Skeleton height={40} /></div> : (
          <ul>
            {shown.map((employee) => (
              <li key={employee.id}>
                <button type="button" className={selected?.id === employee.id ? "is-selected" : ""} onClick={() => setPickedId(employee.id)}>
                  <InitialsAvatar name={employee.name} imageUrl={employee.profileImgUrl} size={30} />
                  <span className="td-person-line"><b>{employee.name}</b><small>{employee.status === "Active" ? "Active" : "Off · can’t sign in"}</small></span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="td-empty">No employees match.</li>}
          </ul>
        )}
      </aside>

      <div className="td-activity-main">
        {selected ? (
          <>
            <article className="td-card td-profile-card">
              <div className="td-profile-top">
                <InitialsAvatar name={selected.name} imageUrl={selected.profileImgUrl} size={46} />
                <div>
                  <h3>{selected.name}<span className={`td-pill td-pill--${selected.status === "Active" ? "success" : "neutral"}`}>{selected.status}</span></h3>
                  <p>{[selected.role || "No role", selected.empId, selected.email].join(" · ")}</p>
                </div>
                {onManageAccess && <button type="button" className="td-btn" onClick={() => onManageAccess(selected.id)}><Icon name="shield" size={14} />Manage access</button>}
              </div>
              <div className="td-has-access">
                <small>Has access to</small>
                <div className="td-chip-row">
                  {access.length === 0 && <span className="td-muted">No portal access</span>}
                  {access.map((item) => <span key={item.resource} className="td-access-chip">{item.label}{item.level && <em>{item.level}</em>}</span>)}
                </div>
              </div>
            </article>
            <article className="td-card td-activity-empty">
              <span className="td-activity-icon"><Icon name="clock" size={20} /></span>
              <h3>Activity log isn’t available yet</h3>
              <p>Which actions {selected.name} performed, and when, will appear here once audit logging is added to the backend.</p>
            </article>
          </>
        ) : !isLoading && <div className="api-state">No employees found.</div>}
      </div>
    </section>
  );
}
