/**
 * Stub for missing createBaseAccountSDK.js in @base-org/account.
 * Ensures the bundle resolves; Base Account SDK is optional.
 */
export function createBaseAccountSDK() {
  return {
    getProvider: () => ({}),
    subAccount: {
      create: async () => null,
      get: async () => null,
      addOwner: async () => "",
      setToOwnerAccount: () => {},
    },
  };
}
