"use client";

import { useMemo, useState } from "react";

import {
  useGetUsersQuery,
  useUpdateUserStatusMutation,
} from "../api/usersApi";

import type { CustomerUser } from "../models/customerUser";

export type UserWorkspace =
  | "all"
  | "blocked"
  | "active"
  | "complaints"
  | "activity";

const PAGE_SIZE = 10;

export function isUserBlocked(user: CustomerUser): boolean {
  const status = String(user.status).toLowerCase();
  return status === "inactive" || status === "blocked";
}

export function useUsersViewModel(
  workspace: UserWorkspace = "all"
) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedUser, setSelectedUser] =
    useState<CustomerUser | null>(null);

  const status = workspace === "blocked" || workspace === "active" ? workspace : "all";

  const query = useGetUsersQuery({
    search,
    page,
    limit: PAGE_SIZE,
    status,
  });

  const allCountQuery = useGetUsersQuery({ page: 1, limit: 1, status: "all" });
  const activeCountQuery = useGetUsersQuery({ page: 1, limit: 1, status: "active" });
  const blockedCountQuery = useGetUsersQuery({ page: 1, limit: 1, status: "blocked" });

  const [updateStatus, updateState] =
    useUpdateUserStatusMutation();

  const userCounts = {
    all: allCountQuery.currentData?.pagination.total ?? 0,
    active: activeCountQuery.currentData?.pagination.total ?? 0,
    blocked: blockedCountQuery.currentData?.pagination.total ?? 0,
  };

  const users = useMemo(() => {
    const allUsers = query.currentData?.users ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return allUsers;

    return allUsers.filter((user) =>
      [user.full_name, user.email, user.phone, user.customer_id, user.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [query.currentData, search]);

  const hasNextPage = query.currentData?.hasMore ?? false;
  const hasPreviousPage = page > 1;
  const totalPages = Math.max(1, Math.ceil((search.trim() ? query.currentData?.pagination.total ?? 0 : userCounts[status === "all" ? "all" : status] ?? 0) / PAGE_SIZE));

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const goToNextPage = () => {
    if (hasNextPage && !query.isFetching) {
      setPage((current) => current + 1);
    }
  };

  const goToPreviousPage = () => {
    if (hasPreviousPage && !query.isFetching) {
      setPage((current) => current - 1);
    }
  };

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const toggleBlock = async (user: CustomerUser) => {
    setErrorMessage("");
    setSuccessMessage("");

    // Backend customer statuses are ACTIVE / INACTIVE ("blocked" = INACTIVE).
    const nextStatus = isUserBlocked(user) ? "active" : "inactive";

    try {
      const updated = await updateStatus({
        id: user.id,
        status: nextStatus,
      }).unwrap();

      const action = nextStatus === "inactive" ? "blocked" : "unblocked";
      setSuccessMessage(`${user.full_name || "User"} was ${action} successfully.`);

      setSelectedUser((current) =>
        current?.id === user.id
          ? { ...current, ...updated, status: updated?.status ?? nextStatus.toUpperCase() }
          : current
      );
    } catch (error) {
      const data = (error as { data?: { message?: unknown } })?.data;
      setErrorMessage(
        typeof data?.message === "string"
          ? data.message
          : "Unable to update user status. Please try again."
      );
    }
  };

  return {
    users,
    totalUsers: query.currentData?.pagination.total ?? 0,
    userCounts,

    search,
    selectedUser,
    setSelectedUser,

    page,
    pageSize: PAGE_SIZE,
    totalPages,
    hasNextPage,
    hasPreviousPage,

    onSearch,
    goToNextPage,
    goToPreviousPage,
    setPage: (nextPage: number) => {
      if (!query.isFetching && nextPage >= 1 && nextPage <= totalPages) setPage(nextPage);
    },

    toggleBlock,
    errorMessage,
    successMessage,

    isLoading: query.isLoading || (query.isFetching && !query.currentData),
    isFetching: query.isFetching,
    isError: query.isError,
    isUpdating: updateState.isLoading,

    refresh: query.refetch,
  };
}
