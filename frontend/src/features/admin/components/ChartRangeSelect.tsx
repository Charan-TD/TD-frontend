"use client";

import { Icon } from "./Icon";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

export type ChartRange = "7d" | "30d" | "6m";

const ranges: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "6m", label: "Last 6 months" },
];

export function ChartRangeSelect({ value, onChange }: { value: ChartRange; onChange: (range: ChartRange) => void }) {
  return (
    <Select
      className="chart-range-control"
      value={value}
      onChange={(event) => onChange(event.target.value as ChartRange)}
      SelectDisplayProps={{ "aria-label": "Chart time range" }}
      IconComponent={({ className }) => <span className={className}><Icon name="chevron-down" size={16} /></span>}
      renderValue={(selected) => (
        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Icon name="calendar" size={18} />
          <span>{ranges.find((range) => range.value === selected)?.label}</span>
        </Box>
      )}
      sx={{
        minWidth: 180,
        maxWidth: "100%",
        height: 42,
        borderRadius: "9px",
        backgroundColor: "#fff",
        color: "#38455c",
        fontFamily: "inherit",
        fontSize: 14,
        "& .MuiSelect-select": { py: 1, pl: 1.5, pr: "36px !important" },
        "& .MuiOutlinedInput-notchedOutline": { borderColor: "#dfe4eb" },
        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#b9c2d0" },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#ee5b00", borderWidth: 1 },
        "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(238, 91, 0, .08)" },
        "& .MuiSelect-icon": { display: "flex", alignItems: "center", right: 12, top: "calc(50% - 8px)", color: "#647089", pointerEvents: "none" },
      }}
      MenuProps={{
        anchorOrigin: { vertical: "bottom", horizontal: "right" },
        transformOrigin: { vertical: "top", horizontal: "right" },
        slotProps: { paper: { sx: { mt: 0.75, p: 0.5, border: "1px solid #e5e9ef", borderRadius: "10px", boxShadow: "0 8px 28px rgba(32, 43, 61, .12)", "& .MuiList-root": { p: 0 } } } },
      }}
    >
      {ranges.map((range) => (
        <MenuItem key={range.value} value={range.value} sx={{
          display: "flex", justifyContent: "space-between", gap: 3, minHeight: 42,
          px: 1.5, my: 0.25, borderRadius: "7px", fontFamily: "inherit", fontSize: 14, color: "#38455c",
          "&:hover": { backgroundColor: "#f5f7fa" },
          "&.Mui-selected, &.Mui-selected:hover": { color: "#c94c00", backgroundColor: "#fff0e6", fontWeight: 600 },
        }}>
          {range.label}
          {range.value === value && <Icon name="check" size={16} />}
        </MenuItem>
      ))}
    </Select>
  );
}
