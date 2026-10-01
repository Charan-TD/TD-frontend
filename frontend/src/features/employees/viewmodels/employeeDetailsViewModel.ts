"use client";

import { useMemo } from "react";
import { useGetEmployeesQuery } from "../api/adminUsersApi";

export function useEmployeeDetailsViewModel(employeeId: string | null) {
  const { data } = useGetEmployeesQuery({ page: 1, limit: 100 });
  const employees = data?.employees ?? [];

  return useMemo(
    () => (employeeId ? employees.find((emp) => emp.id === employeeId) ?? null : null),
    [employees, employeeId]
  );
}
