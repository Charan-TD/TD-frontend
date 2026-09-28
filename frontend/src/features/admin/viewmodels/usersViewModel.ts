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

  const offset = (page - 1) * PAGE_SIZE;

  const query = useGetUsersQuery({
    search,
    limit: PAGE_SIZE,
    offset,
    status,
  });

  const [updateStatus, updateState] =
    useUpdateUserStatusMutation();

  const users = useMemo(() => {
    return query.data?.users ?? [];
  }, [query.data]);

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