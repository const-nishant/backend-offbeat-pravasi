export const PERMISSIONS = {
  'users.read': ['superadmin', 'moderator', 'finance', 'support', 'analyst'],
  'users.write': ['superadmin', 'moderator', 'support'],
  'users.delete': ['superadmin'],
  'users.impersonate': ['superadmin'],
  'payments.refund': ['superadmin', 'finance'],
  'payments.read': ['superadmin', 'finance', 'analyst'],
  'bookings.override': ['superadmin', 'finance'],
  'bookings.read': ['superadmin', 'finance', 'moderator', 'support', 'analyst'],
  'content.moderate': ['superadmin', 'moderator'],
  'content.create': ['superadmin', 'moderator'],
  'settings.write': ['superadmin'],
  'settings.read': ['superadmin', 'analyst'],
  'analytics.read': ['superadmin', 'finance', 'analyst'],
  'admin.manage': ['superadmin'],
  'admin.audit': ['superadmin'],
  'safety.read': ['superadmin', 'moderator'],
  'safety.write': ['superadmin'],
  'broadcast.send': ['superadmin', 'moderator'],
  'exports.create': ['superadmin', 'moderator', 'analyst'],
  'payouts.manage': ['superadmin', 'finance'],
} as const;

export type Permission = keyof typeof PERMISSIONS;
