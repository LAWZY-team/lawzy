/**
 * Mock Supabase client for LPMS compatibility.
 * Since Lawzy uses standard Next.js authentication cookies,
 * this client provides mock/stub session and MFA functions.
 * It is typed as any to allow property/field accesses without compilation errors.
 */

export const supabase: any = {
  auth: {
    async getSession() {
      return {
        data: { session: null },
        error: null,
      };
    },
    mfa: {
      async getAuthenticatorAssuranceLevel() {
        return {
          data: {
            currentLevel: "aal1",
            nextLevel: "aal1",
          },
          error: null,
        };
      },
      async listFactors() {
        return {
          data: { totp: [] },
          error: null,
        };
      },
      async challengeAndVerify(args: { factorId: string; code: string }) {
        return {
          data: null,
          error: null,
        };
      },
    },
  },
};
