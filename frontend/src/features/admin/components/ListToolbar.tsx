import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import { Icon } from "./Icon";
import { RefreshButton } from "./RefreshButton";

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
          color: "#38455c",
          backgroundColor: "#fff",
          fontFamily: "inherit",
          fontSize: 14,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#dfe4eb" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#c8d0dc" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#ff6b21", borderWidth: 1 },
          "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(255, 107, 33, .10)" },
          "& .MuiInputBase-input": {
            height: "100%",
            p: "0 14px 0 0",
            minWidth: 0,
            boxSizing: "border-box",
            lineHeight: 1.4,
          },
          "& .MuiInputAdornment-root": { ml: 1.75, mr: 1, color: "#56627a" },
        }}
      />
      {onRefresh && <RefreshButton refreshing={refreshing} label={label} onRefresh={onRefresh} />}
    </div>
  );
}
