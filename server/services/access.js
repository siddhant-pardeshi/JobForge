// Access control helpers shared by the server gate and the API routes.
// The owner is the person on the machine running JobForge. Remote control of
// the access switch requires the admin code, issued once at first start.

import crypto from 'crypto';

export function gateHash(code) {
  return crypto.createHmac('sha256', String(code)).update('jobforge-gate-v1').digest('hex');
}

export function isLoopback(req) {
  return /^(::1|::ffff:127\.0\.0\.1|127\.0\.0\.1)$/.test(req.socket?.remoteAddress || '');
}

// Admin means the owner on this machine, or a caller presenting the admin
// code header. Everyone else, even unlocked visitors, is a regular guest.
export function isAdminReq(settings, req) {
  if (isLoopback(req) && !req.headers['cf-connecting-ip'] && !req.headers['x-forwarded-for']) return true;
  const header = req.headers['x-jobforge-admin'];
  return !!header && !!settings.adminCode && header === settings.adminCode;
}

function hasUnlockCookie(req, settings) {
  return String(req.headers.cookie || '').includes(`jf_gate=${gateHash(settings.accessCode)}`);
}

// The single decision used by the gate middleware.
export function gateAllowed(settings, req) {
  // Open access is the free for all mode: anyone with the link gets in.
  if (settings.openAccess) return true;
  // Any proxy header means the request arrived through the tunnel.
  const proxied = !!(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.headers['x-forwarded-proto'] || req.headers['x-real-ip']);
  if (proxied) {
    if (req.headers['x-jobforge-token'] && req.headers['x-jobforge-token'] === settings.extensionToken) return true;
    return hasUnlockCookie(req, settings);
  }
  if (isLoopback(req)) return true;
  return hasUnlockCookie(req, settings);
}
