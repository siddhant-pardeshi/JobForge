import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateAllowed, isAdminReq, gateHash } from '../server/services/access.js';

const SETTINGS = {
  accessCode: '123456',
  adminCode: 'adm_test',
  extensionToken: 'jf_pair',
  openAccess: false,
  publicMode: true
};

const req = (headers = {}, remoteAddress = '127.0.0.1') => ({ headers, socket: { remoteAddress } });

test('open access lets everyone through, including strangers from the tunnel', () => {
  assert.equal(gateAllowed({ ...SETTINGS, openAccess: true }, req({ 'cf-connecting-ip': '1.2.3.4' }, '::ffff:5.6.7.8')), true);
});

test('private mode blocks tunnel strangers without a valid cookie or token', () => {
  assert.equal(gateAllowed(SETTINGS, req({ 'cf-connecting-ip': '1.2.3.4' }, '::ffff:5.6.7.8')), false);
});

test('private mode accepts the unlock cookie and the helper pairing token', () => {
  const cookie = `other=1; jf_gate=${gateHash('123456')}`;
  assert.equal(gateAllowed(SETTINGS, req({ 'cf-connecting-ip': '1.2.3.4', cookie }, '::ffff:5.6.7.8')), true);
  assert.equal(gateAllowed(SETTINGS, req({ 'cf-connecting-ip': '1.2.3.4', 'x-jobforge-token': 'jf_pair' }, '::ffff:5.6.7.8')), true);
});

test('the owner on the host machine is always exempt', () => {
  assert.equal(gateAllowed(SETTINGS, req({}, '127.0.0.1')), true);
  assert.equal(gateAllowed(SETTINGS, req({}, '::1')), true);
});

test('admin means loopback owner or the admin code, never a plain visitor', () => {
  assert.equal(isAdminReq(SETTINGS, req({}, '127.0.0.1')), true);
  assert.equal(isAdminReq(SETTINGS, req({ 'x-jobforge-admin': 'adm_test' }, '8.8.8.8')), true);
  assert.equal(isAdminReq(SETTINGS, req({ 'x-jobforge-admin': 'wrong' }, '8.8.8.8')), false);
  assert.equal(isAdminReq(SETTINGS, req({}, '8.8.8.8')), false);
  // Tunnel forwarding makes even a loopback socket a remote request.
  assert.equal(isAdminReq(SETTINGS, req({ 'cf-connecting-ip': '1.2.3.4' }, '127.0.0.1')), false);
});
