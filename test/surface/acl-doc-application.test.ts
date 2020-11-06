import { generateTestFolder, getSolidLogicInstance } from '../helpers/env';
import { SolidLogic } from 'solid-logic';

const ALICE_WEBID = process.env.ALICE_WEBID;

// jest.setTimeout(30000);

describe('ACL doc application', () => {
  let solidLogicAlice;
  let solidLogicBob;
  beforeAll(async () => {
    const solidLogicAlice = getSolidLogicInstance('ALICE')
    const solidLogicBob = getSolidLogicInstance('BOB')
  });

  describe('empty ACL doc on container', () => {
    const { testFolderUrl } = generateTestFolder('ALICE');
    const containerUrl = `${testFolderUrl}empty/`;

    beforeAll(async () => {
      // This will do mkdir-p:
      await solidLogicAlice.store.fetcher.fetch(`${testFolderUrl}empty/noAclDoc/noAclDoc.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(`${testFolderUrl}empty/`);
      await solidLogicAlice.store.fetcher.fetch(aclDocUrl, {
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
      return solidLogicAlice.recursiveDelete(testFolderUrl);
    });

    it('does not allow GET empty/', async () => {
      const result = await solidLogicAlice.store.fetcher.fetch(`${testFolderUrl}empty/`);
      expect(result.status).toEqual(403);
    });

    it('does not allow GET empty/noAclDoc/', async () => {
      const result = await solidLogicAlice.store.fetcher.fetch(`${testFolderUrl}empty/noAclDoc/`);
      expect(result.status).toEqual(403);
    });

    it('does not allow GET empty/noAclDoc/noAclDoc.txt', async () => {
      const result = await solidLogicAlice.store.fetcher.fetch(`${testFolderUrl}empty/noAclDoc/noAclDoc.txt`);
      expect(result.status).toEqual(403);
    });
  });

  describe('ACL doc with acl:accessTo on container', () => {
    const { testFolderUrl } = generateTestFolder('ALICE');
    const containerUrl = `${testFolderUrl}accessTo/`;

    beforeAll(async () => {
      // This will do mkdir-p:
      await solidLogicAlice.store.fetcher.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.store.fetcher.fetch(aclDocUrl, {
        method: 'PUT',
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n acl:agent <${solidLogicAlice.me}>;\n acl:accessTo <${containerUrl}>;\n acl:mode acl:Read.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      // FIXME: NSS ACL cache,
      // wait for ACL cache to clear:
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterAll(() => {
      return solidLogicAlice.recursiveDelete(testFolderUrl);
    });

    it('allows GET accessTo/', async () => {
      const result = await solidLogicAlice.store.fetcher.fetch(containerUrl);
      expect(result.status).toEqual(200);
    });

    it('does not allow GET accessTo/noAclDoc/', async () => {
      const result = await solidLogicAlice.store.fetcher.fetch(`${containerUrl}noAclDoc/`);
      expect(result.status).toEqual(403);
    });

    it('does not allow GET accessTo/noAclDoc/noAclDoc.txt', async () => {
      const result = await solidLogicAlice.store.fetcher.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`);
      expect(result.status).toEqual(403);
    });
  });

  describe('ACL doc with acl:default on container', () => {
    const { testFolderUrl } = generateTestFolder('ALICE');
    const containerUrl = `${testFolderUrl}default/`;

    beforeAll(async () => {
      // This will do mkdir-p:
      await solidLogicAlice.store.fetcher.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.store.fetcher.fetch(aclDocUrl, {
        method: 'PUT',
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\n<#this> a acl:Authorization;\n acl:agent <${solidLogicAlice.me}>;\n acl:default <${containerUrl}>;\n acl:mode acl:Read.\n`,
        headers: {
          'Content-Type': 'text/turtle'
        }
      });
      // FIXME: NSS ACL cache,
      // wait for ACL cache to clear:
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    afterAll(() => {
      return solidLogicAlice.recursiveDelete(testFolderUrl);
    });

    it('does not allow GET accessTo/', async () => {
      const result = await solidLogicAlice.store.fetcher.fetch(containerUrl);
      expect(result.status).toEqual(403);
    });

    it('does allow GET accessTo/noAclDoc/', async () => {
      const result = await solidLogicAlice.store.fetcher.fetch(`${containerUrl}noAclDoc/`);
      expect(result.status).toEqual(200);
    });

    it('does allow GET accessTo/noAclDoc/noAclDoc.txt', async () => {
      const result = await solidLogicAlice.store.fetcher.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`);
      expect(result.status).toEqual(200);
    });
  });

});
