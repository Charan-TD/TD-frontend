const IST_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const parseTime = (value) => {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const hasOpenSlotAt = (schedule, currentMinute) => {
  if (!schedule?.is_open) return false;
  if (schedule.is_24_hours) return true;
  if (!Array.isArray(schedule.slots)) return false;

  return schedule.slots.some((slot) => {
    const opening = parseTime(slot?.opening_time);
    const closing = parseTime(slot?.closing_time);
    if (opening === null || closing === null || opening === closing) {
      return false;
    }

    return opening < closing
      ? currentMinute >= opening && currentMinute < closing
      : currentMinute >= opening;
  });
};

export const getRestaurantOnlineStatus = (
  operatingHours,
  now = new Date()
) => {
  if (
    !operatingHours ||
    typeof operatingHours !== "object" ||
    Array.isArray(operatingHours)
  ) {
    return "CLOSED";
  }

  const parts = Object.fromEntries(
    IST_FORMATTER.formatToParts(now).map(({ type, value }) => [
      type,
      value
    ])
  );
  const dayIndex = DAY_KEYS.findIndex(
    (day) => day.slice(0, 3) === parts.weekday.toLowerCase()
  );
  const currentDay = DAY_KEYS[dayIndex];
  const currentMinute = Number(parts.hour) * 60 + Number(parts.minute);

  if (hasOpenSlotAt(operatingHours[currentDay], currentMinute)) {
    return "OPEN";
  }

  const previousDay = DAY_KEYS[(dayIndex + DAY_KEYS.length - 1) % DAY_KEYS.length];
  const previousSchedule = operatingHours[previousDay];
  if (
    previousSchedule?.is_open &&
    !previousSchedule.is_24_hours &&
    Array.isArray(previousSchedule.slots)
  ) {
    const stillWithinOvernightSlot = previousSchedule.slots.some((slot) => {
      const opening = parseTime(slot?.opening_time);
      const closing = parseTime(slot?.closing_time);
      return (
        opening !== null &&
        closing !== null &&
        opening > closing &&
        currentMinute < closing
      );
    });

    if (stillWithinOvernightSlot) return "OPEN";
  }

  return "CLOSED";
};
