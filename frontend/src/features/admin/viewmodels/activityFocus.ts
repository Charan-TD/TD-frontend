/** Lets "View activity" in the user panel open User Activity on that customer. */
let focusedUserId: string | null = null;
export const setActivityFocus = (id: string | null) => { focusedUserId = id; };
export const takeActivityFocus = () => { const id = focusedUserId; focusedUserId = null; return id; };
