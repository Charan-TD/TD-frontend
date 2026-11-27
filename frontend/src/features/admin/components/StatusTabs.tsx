import { SectionActions } from "./SectionActions";

export type StatusTabOption = { id: string; label: string; count?: number };

/** Segmented filter: a soft track with the selected tab raised on white. */
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
    <div className="td-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} className={value === tab.id ? "is-active" : ""} onClick={() => onChange(tab.id)}>
          {tab.label}{tab.count != null && <small>{tab.count}</small>}
        </button>
      ))}
    </div>
  );
  return placement === "inline" ? content : <SectionActions>{content}</SectionActions>;
}
