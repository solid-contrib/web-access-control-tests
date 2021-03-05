import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE } from '../helpers/env';
import { responseCodeGroup } from '../helpers/util';

function getAclBody(aliceWebId: string, bobWebId: string, target: string, bobAccessTo: string[], bobDefault: string[]) {
  let turtle = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n\
\n\
<#alice> a acl:Authorization;\n\
  acl:agent <${aliceWebId}>;\n\
  acl:accessTo <${target}>;\n
  acl:default <${target}>;\n
  acl:mode acl:Read, acl:Write, acl:Control.\n\
`
  if (bobAccessTo.length) {
    turtle += `\
<#bobAccessTo> a acl:Authorization;\n\
acl:agent <${bobWebId}>;\n\
acl:accessTo <${target}>;\n
acl:mode ${bobAccessTo.join(', ')}.\n\
`
  }
  if (bobDefault.length) {
    turtle += `\
<#bobAccessTo> a acl:Authorization;\n\
acl:agent <${bobWebId}>;\n\
acl:default <${target}>;\n
acl:mode ${bobDefault.join(' ')}.\n\
`
  }
  return turtle;
}

describe('ACL doc application', () => {
  let solidLogicAlice: SolidLogic;
  let solidLogicBob: SolidLogic;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    solidLogicBob = await getSolidLogicInstance('BOB')
  });

  describe('No access on container', () => {
    const { testFolderUrl } = generateTestFolder('ALICE');
    const containerUrl = `${testFolderUrl}denied/`;

    beforeAll(async () => {
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${testFolderUrl}denied/noAclDoc/noAclDoc.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(`${testFolderUrl}denied/`);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: getAclBody(solidLogicAlice.me, solidLogicBob.me, containerUrl, [], []),
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

    it('does not allow GET denied/', async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}denied/`);
      expect(result.status).toEqual(403);
    });

    it('does not allow GET denied/noAclDoc/', async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}denied/noAclDoc/`);
      expect(result.status).toEqual(403);
    });

    it('does not allow GET denied/noAclDoc/noAclDoc.txt', async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}denied/noAclDoc/noAclDoc.txt`);
      expect(result.status).toEqual(403);
    });
  });

  describe('ACL doc with acl:accessTo on container', () => {
    const { testFolderUrl } = generateTestFolder('ALICE');
    const containerUrl = `${testFolderUrl}accessTo/`;

    beforeAll(async () => {
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: getAclBody(solidLogicAlice.me, solidLogicBob.me, containerUrl, ['acl:Read'], []),
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
      const result = await solidLogicBob.fetch(containerUrl);
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });

    it('does not allow GET accessTo/noAclDoc/', async () => {
      const result = await solidLogicBob.fetch(`${containerUrl}noAclDoc/`);
      expect(result.status).toEqual(403);
    });

    it('does not allow GET accessTo/noAclDoc/noAclDoc.txt', async () => {
      const result = await solidLogicBob.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`);
      expect(result.status).toEqual(403);
    });
  });

  describe('ACL doc with acl:default on container', () => {
    const { testFolderUrl } = generateTestFolder('ALICE');
    const containerUrl = `${testFolderUrl}default/`;

    beforeAll(async () => {
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`, {
        method: 'PUT',
        body: 'hello'
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: getAclBody(solidLogicAlice.me, solidLogicBob.me, containerUrl, [], ['acl:Read']),
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
      const result = await solidLogicBob.fetch(containerUrl);
      expect(result.status).toEqual(403);
    });

    it('allows GET accessTo/noAclDoc/', async () => {
      const result = await solidLogicBob.fetch(`${containerUrl}noAclDoc/`);
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });

    it('allows GET accessTo/noAclDoc/noAclDoc.txt', async () => {
      const result = await solidLogicBob.fetch(`${containerUrl}noAclDoc/noAclDoc.txt`);
      expect(responseCodeGroup(result.status)).toEqual("2xx");
    });
  });

});
