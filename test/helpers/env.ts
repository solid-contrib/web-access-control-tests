import { getAuthFetcher } from 'solid-auth-fetcher';
import { SolidLogic } from '../../solid-logic-move-me';

function getEnvVars(who: string) {
  return {
    oidcIssuer: process.env[`OIDC_ISSUER_${who}`],
    cookie: process.env[`COOKIE_${who}`],
    webId: process.env[`WEBID_${who}`],
    storageRoot: process.env[`STORAGE_ROOT_${who}`]
  }
}

export async function getSolidLogicInstance(who: string) {
  const envVars: any = getEnvVars(who)
  const fetcher = await getAuthFetcher(envVars.oidcIssuer, envVars.cookie, "https://tester")
  return new SolidLogic(fetcher as { fetch: () => any }, envVars.webId)
}

export function generateTestFolder(who: string) {
  const storageRoot = getEnvVars(who).storageRoot;
  const testFolder = `web-access-control-tests-${new Date().getTime()}`;
  return {
    testFolder,
    testFolderUrl: `${storageRoot}/${testFolder}/`
  };
}