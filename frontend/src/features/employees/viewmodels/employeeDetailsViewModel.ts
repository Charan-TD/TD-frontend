"use client";

import { useMemo } from "react";
import { useGetEmployeesQuery } from "../api/adminUsersApi";

export function useEmployeeDetailsViewModel(employeeId: string | null) {
  const { data: employees = [] } = useGetEmployeesQuery();

  return useMemo(
    () => (employeeId ? employees.find((emp) => emp.id === employeeId) ?? null : null),
    [employees, employeeId]
  );
}
