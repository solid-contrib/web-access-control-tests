import { generateTestFolder, getSolidLogicInstance } from '../helpers/env';
import { SolidLogic } from '../../solid-logic-move-me';

const WEBID_ALICE = process.env.WEBID_ALICE;
const WEBID_BOB = process.env.WEBID_BOB;

// jest.setTimeout(30000);

function makeBody(accessToModes: string, defaultModes: string, target: string) {
  let str = [
    '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
    '',
    `<#alice> a acl:Authorization;\n  acl:agent <${WEBID_ALICE}>;`,
    `  acl:accessTo <${target}>;`,
    `  acl:default <${target}>;`,
    '  acl:mode acl:Read, acl:Write, acl:Control.',
    ''
  ].join('\n')
  if (accessToModes) {
    str += [
      '<#bobAccessTo> a acl:Authorization;',
      `  acl:agent <${WEBID_BOB}>;`,
      `  acl:accessTo <${target}>;`,
      `  acl:mode ${accessToModes}.`,
      ''
    ].join('\n')
  }
  if (defaultModes) {
    str += [
      '<#bobDefault> a acl:Authorization;',
      `  acl:agent <${WEBID_BOB}>;`,
      `  acl:default <${target}>;`,
      `  acl:mode ${defaultModes}.`,
      ''
    ].join('\n')
  }
  return str
}

describe('Update', () => {
  let solidLogicAlice: SolidLogic;
  let solidLogicBob: SolidLogic;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    solidLogicBob = await getSolidLogicInstance('BOB')
  });
  
  const { testFolderUrl } = generateTestFolder('ALICE');
  beforeEach(async () => {
    // FIXME: NSS ACL cache,
    // wait for ACL cache to clear:
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  afterEach(() => {
    return solidLogicAlice.recursiveDelete(testFolderUrl);
  });

  describe('Using PUT to append', () => {
    it('Is allowed with accessTo Append access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Append', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is allowed with accessTo Write access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is disallowed with accessTo Read+Control access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Control', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is allowed with default Append access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Append', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is allowed with default Write access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Write', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is disallowed with default Read+Control access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Read, acl:Control', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello world',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(403);
    });
  });

  describe('Using PUT to overwrite', () => {
    it('Is allowed with accessTo Write access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'goodbye',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is disallowed with accessTo Read+Append+Control access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Append, acl:Control', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'goodbye',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is allowed with default Write access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Write', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'goodbye',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is disallowed with default Read+Append+Control access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Read, acl:Append, acl:Control', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: 'goodbye',
        headers: {
          'Content-Type': 'text/plain',
          'If-Match': etagInQuotes
        }
      });
      expect(result.status).toEqual(403);
    });
  });

  describe('Using PATCH to append', () => {
    it('Is allowed with accessTo Append access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Append', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT { <#how> <#are> <#you> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is allowed with accessTo Write access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT { <#how> <#are> <#you> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is disallowed with accessTo Read+Control access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Control', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT { <#how> <#are> <#you> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is allowed with default Append access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Append', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT { <#how> <#are> <#you> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is allowed with default Write access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Write', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT { <#how> <#are> <#you> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is disallowed with default Read+Control access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Read, acl:Control', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'INSERT { <#how> <#are> <#you> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(403);
    });
  });

  describe('Using PATCH to overwrite', () => {
    it('Is allowed with accessTo Write access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is disallowed with accessTo Read+Append+Control access on resource', async () => {
      const resourceUrl = `${testFolderUrl}accessToAppend/test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(resourceUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Read, acl:Append, acl:Control', null, resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is allowed with default Write access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Write', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(200);
    });
    it('Is disallowed with default Read+Append+Control access on parent', async () => {
      const containerUrl = `${testFolderUrl}accessToAppend/`;
      const resourceUrl = `${containerUrl}test.txt`;
      // This will do mkdir-p:
      const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
        method: 'PUT',
        body: '<#hello> <#linked> <#world> .',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const etagInQuotes = creationResult.headers.get('etag');
      // console.log({ etag: etagInQuotes });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Read, acl:Append, acl:Control', resourceUrl),
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*'
        }
      });
      const result = await solidLogicAlice.fetch(resourceUrl, {
        method: 'PATCH',
        body: 'DELETE { <#hello> <#linked> <#world> . }',
        headers: {
          'Content-Type': 'sparql-update'
        }
      });
      expect(result.status).toEqual(403);
    });
  });
});
