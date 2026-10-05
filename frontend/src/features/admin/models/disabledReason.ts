/**
 * Returns the message for the first condition that blocks an action,
 * or undefined when nothing blocks it.
 *
 * Use the result for both `disabled` and `data-tooltip` so a disabled
 * button always tells the admin why it can't be clicked:
 *
 *   const blocked = disabledReason([isSaving, "Saving…"], [!name, "Enter a name"]);
 *   <button disabled={Boolean(blocked)} data-tooltip={blocked}>Save</button>
 */
export function disabledReason(
  ...checks: Array<[blocked: boolean, reason: string]>
): string | undefined {
  return checks.find(([blocked]) => blocked)?.[1];
}

/**
 * Plain-language message for an action the signed-in person's role
 * doesn't allow. `task` finishes the sentence "You can't …".
 * Pair with data-tooltip-kind="access" so the tooltip shows a lock.
 */
export function noAccess(task: string): string {
  return `You can't ${task} with your current role. Ask your admin if you need this.`;
}
