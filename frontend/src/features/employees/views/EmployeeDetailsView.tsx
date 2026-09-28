"use client";

import { Icon } from "../../admin/components/Icon";
import { PORTAL_SECTIONS } from "../models/employee";
import { OPERATION_LABELS, countGrants, grantedSections } from "../models/permissions";
import { useEmployeeDetailsViewModel } from "../viewmodels/employeeDetailsViewModel";

export function EmployeeDetailsView({
  employeeId,
  onBack,
  onAssignRole,
}: {
  employeeId: string;
  onBack: () => void;
  onAssignRole: () => void;
}) {
  const employee = useEmployeeDetailsViewModel(employeeId);

  if (!employee) {
    return (
      <section className="employee-workspace">
        <p>Employee not found.</p>
        <button className="secondary-button" onClick={onBack}>
          Back
        </button>
      </section>
    );
  }

  return (
    <section className="employee-workspace employee-details">
      <button className="back-link" type="button" onClick={onBack}>
        <Icon name="arrow-left" size={15} /> Back to staff list
      </button>
      <header className="employee-profile-header">
        <div>
          <span className="employee-avatar employee-avatar--large">
            {employee.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <span className="eyebrow">ACCOUNT OVERVIEW</span>
            <h2>{employee.name}</h2>
            <p>{employee.email}</p>
          </div>
        </div>
        <button className="secondary-button" type="button" onClick={onAssignRole}>
          Assign role
        </button>
      </header>
      <div className="employee-detail-grid">
        <article>
          <span>Role</span>
          <strong>{employee.role}</strong>
        </article>
        <article>
          <span>Status</span>
          <strong>{employee.status}</strong>
        </article>
        <article>
          <span>Staff ID</span>
          <strong>{employee.id}</strong>
        </article>
        <article>
          <span>Joined</span>
          <strong>{employee.createdAt}</strong>
        </article>
      </div>
      <div className="employee-permissions">
        <h3>Access scope</h3>
        <p className="permission-caption">
          {countGrants(employee.access)} grant(s) across {grantedSections(employee.access).length} section(s).
        </p>
        <div className="permission-matrix-readout">
          {grantedSections(employee.access).map((section) => (
            <div className="permission-matrix-row" key={section}>
              <strong>{PORTAL_SECTIONS.find((item) => item.id === section)?.label ?? section}</strong>
              <div className="permission-list">
                {(employee.access[section] ?? []).map((operation) => (
                  <span key={`${section}-${operation}`}>
                    <Icon name="check" size={12} /> {OPERATION_LABELS[operation]}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {grantedSections(employee.access).length === 0 && (
            <div className="api-state">No sections granted yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}
