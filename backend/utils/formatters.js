/**
 * Capitalizes each word in a name (Title Case)
 * Example: "ronak virja" -> "Ronak Virja", "DEEP BHIMANI" -> "Deep Bhimani"
 */
const capitalizeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w+/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
};

module.exports = {
  capitalizeName,
};
