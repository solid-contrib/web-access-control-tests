import { SolidLogic } from 'solid-logic';
import { generateTestFolder, getSolidLogicInstance, WEBID_ALICE, WEBID_BOB } from '../helpers/env';
test('investigate', async () => {
  const solidLogicAlice = await getSolidLogicInstance('ALICE');
  const result = await solidLogicAlice.fetch(`http://localhost:3000/.acl`);
  console.log(result.status, await result.text());
})