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

  const toggleBlock = async (user: CustomerUser) => {
    const nextStatus =
      String(user.status).toLowerCase() === "blocked"
        ? "active"
        : "blocked";

    await updateStatus({
      id: user.id,
      status: nextStatus,
    }).unwrap();
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

    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isUpdating: updateState.isLoading,

    refresh: query.refetch,
  };
}