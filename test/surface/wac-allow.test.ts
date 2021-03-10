import fetch from 'node-fetch';
import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE, WEBID_BOB } from '../helpers/env';

function makeBody(accessToModes: string, defaultModes: string, publicAccessToModes: string, publicDefaultModes: string, target: string) {
  let str = [
    '@prefix acl: <http://www.w3.org/ns/auth/acl#>.',
    '@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.',
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
  if (publicAccessToModes) {
    str += [
      '<#publicAccessTo> a acl:Authorization;',
      `  acl:agentClass foaf:Agent;`,
      `  acl:accessTo <${target}>;`,
      `  acl:mode ${publicAccessToModes}.`,
      ''
    ].join('\n')
  }

  if (publicDefaultModes) {
    str += [
      '<#publicDefault> a acl:Authorization;',
      `  acl:agentClass foaf:Agent;`,
      `  acl:default <${target}>;`,
      `  acl:mode ${publicDefaultModes}.`,
      ''
    ].join('\n')
  }
  return str
}

const sortObject = obj => Object.keys(obj).sort().reduce((res, key) => (res[key] = obj[key], res), {})
function sortWac(wac: string) {
  if (!wac) {
    return {};
  }
  let sorted = {};
  let users = wac.split(","); // ['user="read"', 'public="read"']
  users.forEach(function(grant) {
    let parts = grant.split("="); // ['user', '"read append"']
    let user = parts[0]; // user
    let usergrants = parts[1].replace(/"/g, '').split(" ").sort(); // ["append", "read"]
    sorted[user] = usergrants;
  });
  return sortObject(sorted);
}

describe('From accessTo', () => {
  let solidLogicAlice: SolidLogic;
  let solidLogicBob: SolidLogic;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    solidLogicBob = await getSolidLogicInstance('BOB')
  });
  
  const { testFolderUrl } = generateTestFolder('ALICE');

  afterAll(() => {
    return solidLogicAlice.recursiveDelete(testFolderUrl);
  });

  describe('Public accessTo Read', () => {
    beforeAll(async () => {
      const containerUrl = `${testFolderUrl}1/publicRead/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, null, 'acl:Read', null, containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
    });
    it(`Shows the correct WAC-Allow header to Bob`, async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}1/publicRead/`);
      expect(sortWac(result.headers.get('WAC-Allow'))).toEqual(sortWac('user="read",public="read"'));
    });
    it(`Shows the correct WAC-Allow header to the public`, async () => {
      const result = await fetch(`${testFolderUrl}1/publicRead/`);
      expect(sortWac(result.headers.get('WAC-Allow'))).toEqual(sortWac('user="read",public="read"'));
    });
  });

  describe('Public accessTo Read+Append, Bob accessTo Write', () => {
    beforeAll(async () => {
      const containerUrl = `${testFolderUrl}2/publicReadBobWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody('acl:Write', null, 'acl:Read, acl:Append', null, containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
    });
    it(`Shows the correct WAC-Allow header to Bob`, async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}2/publicReadBobWrite/`);
      expect(sortWac(result.headers.get('WAC-Allow'))).toEqual(sortWac('user="read write append",public="read append"'));
    });
    it(`Shows the correct WAC-Allow header to the public`, async () => {
      const result = await fetch(`${testFolderUrl}2/publicReadBobWrite/`);
      expect(sortWac(result.headers.get('WAC-Allow'))).toEqual(sortWac('user="read append",public="read append"'));
    });
  });
});

describe('From default', () => {
  let solidLogicAlice: SolidLogic;
  let solidLogicBob: SolidLogic;
  beforeAll(async () => {
    solidLogicAlice = await getSolidLogicInstance('ALICE')
    solidLogicBob = await getSolidLogicInstance('BOB')
  });

  const { testFolderUrl } = generateTestFolder('ALICE');

  afterAll(() => {
    return solidLogicAlice.recursiveDelete(testFolderUrl);
  });

  describe('Public default Read+Append, Bob default Write', () => {
    beforeAll(async () => {
      const containerUrl = `${testFolderUrl}3/publicReadBobWrite/`;
      // This will do mkdir-p:
      await solidLogicAlice.fetch(`${containerUrl}test.txt`, {
        method: 'PUT',
        body: 'hello',
        headers: {
          'Content-Type': 'text/plain',
          'If-None-Match': '*'
        }
      });
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(containerUrl);
      await solidLogicAlice.fetch(aclDocUrl, {
        method: 'PUT',
        body: makeBody(null, 'acl:Write', null, 'acl:Read, acl:Append', containerUrl),
        headers: {
          'Content-Type': 'text/turtle',
          // 'If-None-Match': '*' - work around a bug in some servers that don't support If-None-Match on ACL doc URLs
        }
      });
    });
    it(`Shows the correct WAC-Allow header to Bob`, async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}3/publicReadBobWrite/test.txt`);
      expect(sortWac(result.headers.get('WAC-Allow'))).toEqual(sortWac('user="read write append",public="read append"'));
    });
    it(`Shows the correct WAC-Allow header to the public`, async () => {
      const result = await fetch(`${testFolderUrl}3/publicReadBobWrite/test.txt`);
      expect(sortWac(result.headers.get('WAC-Allow'))).toEqual(sortWac('user="read append",public="read append"'));
    });

    // DISPUTED: See https://github.com/solid/specification/pull/248
    it.skip(`Shows the Link header containing the aclDocUrl to Alice`, async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}3/publicReadBobWrite/test.txt`);
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(`${testFolderUrl}3/publicReadBobWrite/test.txt`);
      expect(result.headers.get('Link')).toContain(aclDocUrl);
    });
    // DISPUTED: See https://github.com/solid/specification/pull/248
    it.skip(`Does not show a Link header containing the aclDocUrl to the public`, async () => {
      const result = await solidLogicBob.fetch(`${testFolderUrl}3/publicReadBobWrite/test.txt`);
      const aclDocUrl = await solidLogicAlice.findAclDocUrl(`${testFolderUrl}3/publicReadBobWrite/test.txt`);
      expect(result.headers.get('Link')).toNotContain(aclDocUrl);
    });
  });
});
