import { getAuthFetcher } from 'solid-auth-fetcher';
import { SolidLogic } from 'solid-logic';

export const WEBID_ALICE = process.env.WEBID_ALICE;
export const WEBID_BOB = process.env.WEBID_BOB;

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
  console.log({ envVars })
  const fetcher = await getAuthFetcher(envVars.oidcIssuer, envVars.cookie, "https://tester")
  // console.log(fetcher)
  return new SolidLogic({fetch: fetcher.fetch.bind(fetcher)}, envVars.webId)
}

export function generateTestFolder(who: string) {
  let storageRoot = getEnvVars(who).storageRoot;
  if (storageRoot.substr(-1) !== '/') {
    console.warn(`Adding slash to the end of ${who}'s storage root ->"${storageRoot}"+"/"`);
    storageRoot += '/';
  }
  const testFolder = `reproduce-issue-246`;
  return {
    testFolder,
    testFolderUrl: `${storageRoot}${testFolder}/`
  };
}