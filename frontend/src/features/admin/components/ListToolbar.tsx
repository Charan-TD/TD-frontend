import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import { Icon } from "./Icon";
import { RefreshButton } from "./RefreshButton";
import { colors, legacyOranges } from "@/app/theme/tokens";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function ListToolbar({ value, onChange, placeholder, label, refreshing = false, onRefresh }: Props) {
  return (
    <div className="list-toolbar">
      <OutlinedInput
        fullWidth
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputProps={{ "aria-label": placeholder }}
        startAdornment={(
          <InputAdornment position="start">
            <Icon name="search" size={17} />
          </InputAdornment>
        )}
        sx={{
          flex: "1 1 auto",
          minWidth: 0,
          height: 44,
          p: 0,
          borderRadius: "9px",
          color: colors.inkSoft,
          backgroundColor: colors.surface,
          fontFamily: "inherit",
          fontSize: 14,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.line },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.lineHover },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: legacyOranges.focusSearch, borderWidth: 1 },
          "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(255, 107, 33, .10)" },
          "& .MuiInputBase-input": {
            height: "100%",
            p: "0 14px 0 0",
            minWidth: 0,
            boxSizing: "border-box",
            lineHeight: 1.4,
          },
          "& .MuiInputAdornment-root": { ml: 1.75, mr: 1, color: colors.mutedStrong },
        }}
      />
      {onRefresh && <RefreshButton refreshing={refreshing} label={label} onRefresh={onRefresh} />}
    </div>
  );
}
