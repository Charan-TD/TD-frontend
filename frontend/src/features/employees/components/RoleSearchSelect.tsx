"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "../../admin/components/Icon";

type RoleOption = { id: string; name: string; description?: string };

type Props = {
    roles: RoleOption[];
    value: string;
    onChange: (roleName: string) => void;
    disabled?: boolean;
    placeholder?: string;
};

/**
 * Dropdown for picking an existing role, with a search field pinned to
 * the top of the option list so admins can filter long role lists.
 */
export function RoleSearchSelect({ roles, value, onChange, disabled = false, placeholder = "Select role" }: Props) {
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState("");
    const wrapRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const filteredRoles = useMemo(() => {
        const needle = term.trim().toLowerCase();
        if (!needle) return roles;
        return roles.filter((role) => role.name.toLowerCase().includes(needle));
    }, [roles, term]);

    const selectRole = (roleName: string) => {
        onChange(roleName);
        setOpen(false);
        setTerm("");
    };

    return (
        <div className={`role-select ${open ? "is-open" : ""}`} ref={wrapRef}>
            <button
                type="button"
                className="role-select-trigger"
                onClick={() => setOpen((current) => !current)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={value ? "" : "role-select-placeholder"}>{value || placeholder}</span>
                <Icon name="chevron-down" size={14} />
            </button>

            {open && !disabled && (
                <div className="role-select-panel" role="listbox">
                    <div className="role-select-search">
                        <Icon name="search" size={13} />
                        <input
                            autoFocus
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                            placeholder="Search roles…"
                            aria-label="Search roles"
                        />
                    </div>

                    <div className="role-select-list">
                        {filteredRoles.length === 0 && <div className="role-select-empty">No roles found.</div>}

                        {filteredRoles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                className={`role-select-option ${value === role.name ? "is-selected" : ""}`}
                                onClick={() => selectRole(role.name)}
                                role="option"
                                aria-selected={value === role.name}
                            >
                                <span>{role.name}</span>
                                {value === role.name && <Icon name="check" size={13} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
