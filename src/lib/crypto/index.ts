// =============================================================================
// BLACKLINE FITNESS — Crypto barrel
// Owner: backend-api.
//
// Re-exports the public surface of the crypto sub-modules.
// Internal helpers (key loading, wire format assembly) stay private to each file.
// =============================================================================

export {
  encrypt,
  decrypt,
  encryptBuffer,
  decryptBuffer,
  rotateEncrypted,
  isEncrypted,
} from "./aes-gcm";

export {
  generateOpaqueToken,
  generateInvitationToken,
  generateSecureRandomString,
  hashToken,
  verifyTokenHash,
  signDownloadToken,
  verifyDownloadToken,
  type DownloadTokenPayload,
} from "./tokens";
