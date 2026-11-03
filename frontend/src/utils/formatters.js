/**
 * Formats a date into "dd-mm-yyyy"
 * Handles YYYY-MM-DD, ISO timestamps, Date instances, and existing dd-mm-yyyy
 * Example: "2026-11-03" -> "03-11-2026"
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";

  const str = String(dateValue).trim();

  // If already in dd-mm-yyyy format
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // If YYYY-MM-DD format (optionally with time)
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d}-${m}-${y}`;
  }

  // Fallback to Date object parsing
  const d = new Date(dateValue);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
};

/**
 * Formats a time into 12-hour format "hh:mm AM/PM"
 * Handles 24-hour "HH:mm", "HH:mm:ss", ISO strings, and already 12-hour strings
 * Example: "14:38" -> "02:38 PM", "09:05" -> "09:05 AM", "00:15" -> "12:15 AM"
 */
export const formatTime = (timeValue) => {
  if (!timeValue) return "N/A";

  const str = String(timeValue).trim();

  // If already contains AM or PM
  if (/(am|pm)$/i.test(str)) {
    return str.toUpperCase();
  }

  // Match 24-hour HH:mm(:ss)
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (match24) {
    let hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const strHours = String(hours).padStart(2, "0");
    return `${strHours}:${minutes} ${ampm}`;
  }

  // Try Date parsing
  const d = new Date(timeValue);
  if (!isNaN(d.getTime())) {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${strHours}:${minutes} ${ampm}`;
  }

  return str;
};

/**
 * Converts a date string to "YYYY-MM-DD" for HTML5 <input type="date">
 */
export const toInputDateFormat = (dateValue) => {
  if (!dateValue) return "";
  const str = String(dateValue).trim();

  // If dd-mm-yyyy, convert to yyyy-mm-dd
  const dmyMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m}-${d}`;
  }

  // If already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const d = new Date(dateValue);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return str;
};

/**
 * Converts a time string to 24-hour "HH:mm" for HTML5 <input type="time">
 */
export const toInputTimeFormat = (timeValue) => {
  if (!timeValue) return "";
  const str = String(timeValue).trim();

  // If 12-hour with AM/PM e.g. "02:38 PM"
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const ampm = match12[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  // If 24-hour "HH:mm"
  const match24 = str.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const hours = String(parseInt(match24[1], 10)).padStart(2, "0");
    return `${hours}:${match24[2]}`;
  }

  return str;
};
