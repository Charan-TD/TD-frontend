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

  const status =
    workspace === "blocked" ? "blocked" : "all";

  const query = useGetUsersQuery({
    search,
    page,
    limit: PAGE_SIZE,
    status,
  });

  const [updateStatus, updateState] =
    useUpdateUserStatusMutation();

  const users = useMemo(() => {
    const allUsers = query.data?.users ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return allUsers;

    return allUsers.filter((user) =>
      [user.full_name, user.email, user.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [query.data, search]);

  const hasNextPage = query.data?.hasMore ?? false;
  const hasPreviousPage = page > 1;

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

  const toggleBlock = async (user: CustomerUser) => {
    setErrorMessage("");

    // Backend customer statuses are ACTIVE / INACTIVE ("blocked" = INACTIVE).
    const nextStatus = isUserBlocked(user) ? "active" : "inactive";

    try {
      const updated = await updateStatus({
        id: user.id,
        status: nextStatus,
      }).unwrap();

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

    search,
    selectedUser,
    setSelectedUser,

    page,
    pageSize: PAGE_SIZE,
    hasNextPage,
    hasPreviousPage,

    onSearch,
    goToNextPage,
    goToPreviousPage,

    toggleBlock,
    errorMessage,

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isUpdating: updateState.isLoading,

    refresh: query.refetch,
  };
}