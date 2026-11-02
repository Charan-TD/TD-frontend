import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { SectionActions } from "./SectionActions";

export type StatusTabOption = { id: string; label: string; count?: number };

export function StatusTabs({
  tabs,
  value,
  onChange,
  label,
  placement = "header",
}: {
  tabs: StatusTabOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  placement?: "header" | "inline";
}) {
  const content = (
    <Paper
      className="directory-tabs status-tabs"
      variant="outlined"
      elevation={0}
      sx={{
        display: "inline-flex",
        width: "fit-content",
        maxWidth: "100%",
        minWidth: 0,
        p: 0.5,
        borderColor: "#dfe4eb",
        borderRadius: "12px",
        backgroundColor: "#f3f5f8",
        boxShadow: "0 1px 3px rgba(25, 35, 55, .04)",
        boxSizing: "border-box",
      }}
    >
      <Tabs
        className="status-tabs__tabs"
        value={value}
        onChange={(_, nextValue: string) => onChange(nextValue)}
        aria-label={label}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          width: "100%",
          minWidth: 0,
          minHeight: 44,
          "& .MuiTabs-flexContainer": { gap: 0 },
          "& .MuiTabs-indicator": {
            zIndex: 0,
            bottom: 3,
            height: 38,
            borderRadius: "9px",
            backgroundColor: "#1e293b",
            transition: "none",
          },
          "& .MuiTab-root": {
            zIndex: 1,
            minHeight: 44,
            minWidth: "auto",
            px: 1.75,
            border: 0,
            borderRadius: "9px",
            color: "#56627a",
            backgroundColor: "transparent",
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.2,
            textTransform: "none",
            opacity: 1,
            transition: "none",
            "&.Mui-selected": { color: "#fff" },
          },
          "& .MuiTabs-scrollButtons": { width: 28, color: "#56627a" },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            disableRipple
            label={(
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                {tab.label}
                {tab.count != null && <Box component="span" sx={{ color: "inherit", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{tab.count}</Box>}
              </Box>
            )}
          />
        ))}
      </Tabs>
    </Paper>
  );
  return placement === "inline" ? content : <SectionActions>{content}</SectionActions>;
}
