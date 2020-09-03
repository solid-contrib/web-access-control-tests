export const SERVER_ROOT = process.env.SERVER_ROOT || "https://localhost:8443";
export const USERNAME_ALICE = process.env.USERNAME_ALICE || "alice";
export const PASSWORD_ALICE = process.env.PASSWORD_ALICE || "123";
export const USERNAME_BOB = process.env.USERNAME_BOB || "alice"; // FIXME: use a second user here
export const PASSWORD_BOB = process.env.PASSWORD_BOB || "123";

export function generateTestFolder() {
  const testFolder = `web-access-control-tests-${new Date().getTime()}`;
  return {
    testFolder,
    testFolderUrl: `${SERVER_ROOT}/${testFolder}/`
  };
}