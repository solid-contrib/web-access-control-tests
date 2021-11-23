import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE, WEBID_BOB } from '../helpers/env';
import { responseCodeGroup } from '../helpers/util';

jest.setTimeout(10000);

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

describe('Delete', () => {
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

  it.only('Is allowed with Write on parent and on resource', async () => {
    const parentUrl = `${testFolderUrl}x/testDeleteOK/`;
    const resourceUrl = `${parentUrl}test.txt`;
    // This will do mkdir-p:
    const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
      method: 'PUT',
      body: '<#hello> <#linked> <#world> .',
      headers: {
        'Content-Type': 'text/turtle',
        'If-None-Match': '*'
      }
    });
    const aclDocUrl = await solidLogicAlice.findAclDocUrl(parentUrl);
    await solidLogicAlice.fetch(aclDocUrl, {
      method: 'PUT',
      body: makeBody('acl:Write', 'acl:Write', resourceUrl),
      headers: {
        'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
    });
    const result = await solidLogicBob.fetch(resourceUrl, {
      method: 'DELETE'
    });
    expect(responseCodeGroup(result.status)).toEqual("2xx");
  });

  it('Is disallowed without Write resource', async () => {
    const parentUrl = `${testFolderUrl}testDeleteWithoutResourceWrite/`;
    const resourceUrl = `${parentUrl}test.txt`;
    // This will do mkdir-p:
    const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
      method: 'PUT',
      body: '<#hello> <#linked> <#world> .',
      headers: {
        'Content-Type': 'text/turtle',
        'If-None-Match': '*'
      }
    });
    const aclDocUrl = await solidLogicAlice.findAclDocUrl(parentUrl);
    await solidLogicAlice.fetch(aclDocUrl, {
      method: 'PUT',
      body: makeBody('acl:Write', null, resourceUrl),
      headers: {
        'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
    });
    const result = await solidLogicBob.fetch(resourceUrl, {
      method: 'DELETE'
    });
    expect(result.status).toEqual(403);
  });

  it('Is disallowed without Write on parent', async () => {
    const parentUrl = `${testFolderUrl}testDeleteWithoutParentWrite/`;
    const resourceUrl = `${parentUrl}test.txt`;
    // This will do mkdir-p:
    const creationResult =  await solidLogicAlice.fetch(resourceUrl, {
      method: 'PUT',
      body: '<#hello> <#linked> <#world> .',
      headers: {
        'Content-Type': 'text/turtle',
        'If-None-Match': '*'
      }
    });
    const aclDocUrl = await solidLogicAlice.findAclDocUrl(parentUrl);
    await solidLogicAlice.fetch(aclDocUrl, {
      method: 'PUT',
      body: makeBody(null, 'acl:Write', resourceUrl),
      headers: {
        'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
    });
    const result = await solidLogicBob.fetch(resourceUrl, {
      method: 'DELETE'
    });
    expect(result.status).toEqual(403);
  });
});
