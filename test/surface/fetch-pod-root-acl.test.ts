import { space } from "rdf-namespaces";
import { getStore , findAclDoc } from "../helpers/util";
import { getAuthFetcher } from "../helpers/obtain-auth-headers";

const ALICE_WEBID = process.env.ALICE_WEBID;

describe("Alice's storage root", () => {
  let podRoots;
  let authFetcher;

  beforeAll(async () => {
    authFetcher = await getAuthFetcher();
    const store = getStore(authFetcher);
    await store.fetcher.load(store.sym(ALICE_WEBID).doc());
    podRoots = store.statementsMatching(store.sym(ALICE_WEBID), store.sym(space.storage)).map(st => st.object.value);
  });

  test("has an ACL", async () => {
    expect(podRoots.length).toEqual(1);
    const store = getStore(authFetcher);
    await store.fetcher.load(store.sym(podRoots[0]));
    const aclDoc = findAclDoc(store.sym(podRoots[0]), store)
    await store.fetcher.load(aclDoc);
    expect(store.statementsMatching(undefined, undefined, undefined, aclDoc).length).toBeGreaterThan(0);
  });

});
