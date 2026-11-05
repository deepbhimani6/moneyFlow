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
      adminIdentifiers.add(m.email.toLowerCase());
    } else {
      adminIdentifiers.add(m._id.toString());
    }
  });

  return adminIdentifiers.size;
};

module.exports = {
  getUniqueAdminCount,
};
