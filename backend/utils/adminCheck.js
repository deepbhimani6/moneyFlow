/**
 * Checks if a member document/object matches the current logged-in user profile
 */
const isMemberCurrentAdmin = (member, profile) => {
  if (!member || !profile) return false;

  if (member._id && profile._id && String(member._id) === String(profile._id)) return true;

  const profileEmail = (profile.email || '').toLowerCase().trim();
  const memberEmail = (member.email || '').toLowerCase().trim();
  if (profileEmail && memberEmail && profileEmail === memberEmail) return true;

  const profileUsername = (profile.username || '').toLowerCase().trim();
  const memberUsername = (member.username || '').toLowerCase().trim();
  if (profileUsername && memberUsername && profileUsername === memberUsername) return true;

  const profileName = (profile.fullName || '').toLowerCase().trim();
  const memberName = (member.fullName || '').toLowerCase().trim();
  if (profileName && memberName && profileName === memberName) return true;

  return false;
};

const getUniqueAdminCount = async () => 999;

module.exports = {
  getUniqueAdminCount,
  isMemberCurrentAdmin,
};
