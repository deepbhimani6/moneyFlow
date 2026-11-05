const Member = require('../models/Member');
const Profile = require('../models/Profile');

/**
 * Counts total unique admins in the system across Profile and Members collections
 */
const getUniqueAdminCount = async () => {
  const profile = await Profile.findOne();
  const adminMembers = await Member.find({ role: 'Admin' }).lean();

  const adminIdentifiers = new Set();
  if (profile && profile.role === 'Admin' && profile.email) {
    adminIdentifiers.add(profile.email.toLowerCase());
  } else if (profile && profile.role === 'Admin') {
    adminIdentifiers.add('profile_admin');
  }

  adminMembers.forEach((m) => {
    if (m.email) {
      adminIdentifiers.add(m.email.toLowerCase().trim());
    } else if (m.username) {
      adminIdentifiers.add(m.username.toLowerCase().trim());
    } else {
      adminIdentifiers.add(m._id.toString());
    }
  });

  return adminIdentifiers.size;
};

/**
 * Checks if a member document/object matches the current logged-in profile (Admin)
 */
const isMemberCurrentAdmin = (member, profile) => {
  if (!member || !profile) return false;

  const profileEmail = (profile.email || '').toLowerCase().trim();
  const memberEmail = (member.email || '').toLowerCase().trim();
  if (profileEmail && memberEmail && profileEmail === memberEmail) return true;

  const profileUsername = (profile.username || '').toLowerCase().trim();
  const memberUsername = (member.username || '').toLowerCase().trim();
  if (profileUsername && memberUsername && profileUsername === memberUsername) return true;

  const profileName = (profile.fullName || '').toLowerCase().trim();
  const memberName = (member.fullName || '').toLowerCase().trim();
  if (profileName && memberName && profileName === memberName && (member.role === 'Admin' || profile.role === 'Admin')) return true;

  return false;
};

module.exports = {
  getUniqueAdminCount,
  isMemberCurrentAdmin,
};
