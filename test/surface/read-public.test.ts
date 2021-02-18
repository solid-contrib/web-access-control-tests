import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE, WEBID_BOB } from '../helpers/env';
import { responseCodeGroup } from '../helpers/util';
import fetch from 'node-fetch'

function makeBody(accessToModes: string, defaultModes: string, target: string) {
  let str = [
    '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
    '@prefix foaf: <http://xmlns.com/foaf/0.1/>.',
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
      '  acl:agentClass foaf:Agent;',
      `  acl:accessTo <${target}>;`,
      `  acl:mode ${accessToModes}.`,
      ''
    ].join('\n')
  }
  if (defaultModes) {
    str += [
      '<#bobDefault> a acl:Authorization;',
      '  acl:agentClass foaf:Agent;',
      `  acl:default <${target}>;`,
      `  acl:mode ${defaultModes}.`,
      ''
    ].join('\n')
  }
  return str
}

describe('Read-Public', () => {
  let solidLogicAlice: SolidLogic;
  let solidLogicBob
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    solidLogicBob = { fetch }
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
  it('Is allowed with accessTo Read access on non-container resource', async () => {
    const resourceUrl = `${testFolderUrl}1/accessToAppend/test.txt`;
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
      body: makeBody('acl:Read', null, resourceUrl),
      headers: {
        'Content-Type': 'text/turtle',
        // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
      }
    });
    const result = await solidLogicBob.fetch(resourceUrl);
    expect(responseCodeGroup(result.status)).toEqual("2xx");
  });
  it('Is disallowed with accessTo Append+Write+Control access on non-container resource', async () => {
    const resourceUrl = `${testFolderUrl}2/accessToAppend/test.txt`;
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
      body: makeBody('acl:Append, acl:Write, acl:Control', null, resourceUrl),
      headers: {
        'Content-Type': 'text/turtle',
        // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
      }
    });
    const result = await solidLogicBob.fetch(resourceUrl);
    expect(responseCodeGroup(result.status)).toEqual("4xx"); // use to be 403
  });
  it('Is allowed with default Read access on parent of non-container', async () => {
    const containerUrl = `${testFolderUrl}3/accessToAppend/`;
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
    const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
    await solidLogicAlice.fetch(aclDocUrl, {
      method: 'PUT',
      body: makeBody(null, 'acl:Read', containerUrl),
      headers: {
        'Content-Type': 'text/turtle',
        // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
      }
    });
    const result = await solidLogicBob.fetch(resourceUrl);
    expect(responseCodeGroup(result.status)).toEqual("2xx");
  });
  it('Is disallowed with default Append+Write+Control access on parent of non-container', async () => {
    const containerUrl = `${testFolderUrl}4/accessToAppend/`;
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
    const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
    await solidLogicAlice.fetch(aclDocUrl, {
      method: 'PUT',
      body: makeBody(null, 'acl:Append, acl:Write, acl:Control', containerUrl),
      headers: {
        'Content-Type': 'text/turtle',
        // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
      }
    });
    const result = await solidLogicBob.fetch(resourceUrl);
    expect(responseCodeGroup(result.status)).toEqual("4xx"); // use to be 403
  });

  it('Is allowed with accessTo Read access on container resource', async () => {
    const resourceUrl = `${testFolderUrl}5/accessToAppend/test/`;
    // This will do mkdir-p:
    const creationResult =  await solidLogicAlice.fetch(`${resourceUrl}.dummy`, {
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
      body: makeBody('acl:Read', null, resourceUrl),
      headers: {
        'Content-Type': 'text/turtle',
        // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
      }
    });
    const result = await solidLogicBob.fetch(resourceUrl);
    expect(responseCodeGroup(result.status)).toEqual("2xx");
  });

  it('Is disallowed with accessTo Append+Write+Control access on non-container resource', async () => {
    const resourceUrl = `${testFolderUrl}6/accessToAppend/test/`;
    // This will do mkdir-p:
    const creationResult =  await solidLogicAlice.fetch(`${resourceUrl}.dummy`, {
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
      body: makeBody('acl:Append, acl:Write, acl:Control', null, resourceUrl),
      headers: {
        'Content-Type': 'text/turtle',
        // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
      }
    });
    const result = await solidLogicBob.fetch(resourceUrl);
    expect(responseCodeGroup(result.status)).toEqual("4xx"); // use to be 403
  });

  it('Is allowed with default Read access on parent of container', async () => {
    const containerUrl = `${testFolderUrl}7/accessToAppend/`;
    const resourceUrl = `${containerUrl}test/`;
    // This will do mkdir-p:
    const creationResult =  await solidLogicAlice.fetch(`${resourceUrl}.dummy`, {
      method: 'PUT',
      body: '<#hello> <#linked> <#world> .',
      headers: {
        'Content-Type': 'text/turtle',
        'If-None-Match': '*'
      }
    });
    const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
    await solidLogicAlice.fetch(aclDocUrl, {
      method: 'PUT',
      body: makeBody(null, 'acl:Read', containerUrl),
      headers: {
        'Content-Type': 'text/turtle',
        // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
      }
    });
    const result = await solidLogicBob.fetch(resourceUrl);
    expect(responseCodeGroup(result.status)).toEqual("2xx");
  });

  it('Is disallowed with default Append+Write+Control access on parent of non-container', async () => {
    const containerUrl = `${testFolderUrl}8/accessToAppend/`;
    const resourceUrl = `${containerUrl}test/`;
    // This will do mkdir-p:
    const creationResult =  await solidLogicAlice.fetch(`${resourceUrl}.dummy`, {
      method: 'PUT',
      body: '<#hello> <#linked> <#world> .',
      headers: {
        'Content-Type': 'text/turtle',
        'If-None-Match': '*'
      }
    });
    const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
    await solidLogicAlice.fetch(aclDocUrl, {
      method: 'PUT',
      body: makeBody(null, 'acl:Append, acl:Write, acl:Control', containerUrl),
      headers: {
        'Content-Type': 'text/turtle',
        // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
      }
    });
    const result = await solidLogicBob.fetch(resourceUrl);
    expect(responseCodeGroup(result.status)).toEqual("4xx"); // use to be 403
  });

});
