import { generateTestFolder } from '../helpers/global';
import { getAuthFetcher } from '../helpers/obtain-auth-headers';
import { recursiveDelete, findAclDocUrl } from '../helpers/util';

const ALICE_WEBID = process.env.ALICE_WEBID;

// jest.setTimeout(30000);

describe('ACL doc application', () => {
  let authFetcher;
  beforeAll(async () => {
    authFetcher = await getAuthFetcher();
  });

  describe('empty ACL doc on container', () => {
    const { testFolderUrl } = generateTestFolder();
    const containerUrl = `${testFolderUrl}empty/`;

    beforeAll(async () => {
      // This will do mkdir-p:
      await authFetcher.fetch(`${testFolderUrl}empty/noAclDoc/noAclDoc.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await findAclDocUrl(`${testFolderUrl}empty/`, authFetcher);
      await authFetcher.fetch(aclDocUrl, {
        method: 'PUT',
        body: '',
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      // FIXME: NSS ACL cache,
      // wait for ACL cache to clear:
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    afterAll(() => {
      return recursiveDelete(testFolderUrl, authFetcher);
    });

    it('does not allow GET empty/', async () => {
      const result = await authFetcher.fetch(`${testFolderUrl}empty/`);
      expect(result.status).toEqual(403);
    });

    it('does not allow GET empty/noAclDoc/', async () => {
      const result = await authFetcher.fetch(`${testFolderUrl}empty/noAclDoc/`);
      expect(result.status).toEqual(403);
    });

    it('does not allow GET empty/noAclDoc/noAclDoc.txt', async () => {
      const result = await authFetcher.fetch(`${testFolderUrl}empty/noAclDoc/noAclDoc.txt`);
      expect(result.status).toEqual(403);
    });
  });

  describe('ACL doc with acl:accessTo on container', () => {
    const { testFolderUrl } = generateTestFolder();
    const containerUrl = `${testFolderUrl}accessTo/`;

    beforeAll(async () => {
      // This will do mkdir-p:
      await authFetcher.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await findAclDocUrl(containerUrl, authFetcher);
      await authFetcher.fetch(aclDocUrl, {
        method: 'PUT',
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n acl:agent <${ALICE_WEBID}>;\n acl:accessTo <${containerUrl}>;\n acl:mode acl:Read.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      // FIXME: NSS ACL cache,
      // wait for ACL cache to clear:
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterAll(() => {
      // return recursiveDelete(testFolderUrl, authFetcher);
    });

    it('allows GET accessTo/', async () => {
      const result = await authFetcher.fetch(containerUrl);
      expect(result.status).toEqual(200);
    });

    it('does not allow GET accessTo/noAclDoc/', async () => {
      const result = await authFetcher.fetch(`${containerUrl}noAclDoc/`);
      expect(result.status).toEqual(403);
    });

    it('does not allow GET accessTo/noAclDoc/noAclDoc.txt', async () => {
      const result = await authFetcher.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`);
      expect(result.status).toEqual(403);
    });
  });

  describe('ACL doc with acl:default on container', () => {
    const { testFolderUrl } = generateTestFolder();
    const containerUrl = `${testFolderUrl}default/`;

    beforeAll(async () => {
      // This will do mkdir-p:
      await authFetcher.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await findAclDocUrl(containerUrl, authFetcher);
      await authFetcher.fetch(aclDocUrl, {
        method: 'PUT',
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n acl:agent <${ALICE_WEBID}>;\n acl:default <${containerUrl}>;\n acl:mode acl:Read.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      // FIXME: NSS ACL cache,
      // wait for ACL cache to clear:
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterAll(() => {
      // return recursiveDelete(testFolderUrl, authFetcher);
    });

    it('does not allow GET accessTo/', async () => {
      const result = await authFetcher.fetch(containerUrl);
      expect(result.status).toEqual(403);
    });

    it('does allow GET accessTo/noAclDoc/', async () => {
      const result = await authFetcher.fetch(`${containerUrl}noAclDoc/`);
      expect(result.status).toEqual(200);
    });

    it('does allow GET accessTo/noAclDoc/noAclDoc.txt', async () => {
      const result = await authFetcher.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`);
      expect(result.status).toEqual(200);
    });
  });

});
