import Pagination from "@mui/material/Pagination";

export function ListPagination({
  page,
  count,
  onChange,
  disabled = false,
}: {
  page: number;
  count: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (count < 1) return null;

  return (
    <Pagination
      className="list-pagination"
      count={count}
      page={page}
      onChange={(_, nextPage) => onChange(nextPage)}
      disabled={disabled}
      boundaryCount={1}
      siblingCount={1}
      shape="rounded"
      color="primary"
      aria-label="List pages"
      sx={{
        margin: "14px 0 0",
        display: "flex",
        justifyContent: "flex-end",
        "& .MuiPagination-ul": { gap: 0.5 },
        "& .MuiPaginationItem-root": {
          minWidth: 40,
          height: 40,
          borderRadius: "9px",
          color: "#38455c",
          fontFamily: "inherit",
          fontSize: 14,
        },
        "& .MuiPaginationItem-root.Mui-selected": {
          border: "1px solid #1e293b",
          color: "#fff",
          backgroundColor: "#1e293b",
        },
        "& .MuiPaginationItem-root.Mui-selected:hover": { backgroundColor: "#29364a" },
        "& .MuiPaginationItem-root.Mui-disabled": { opacity: 0.45 },
      }}
    />
  );
}
