# WAC tests
Branch specifically to reproduce https://github.com/solid/specification/issues/246

If you don't have it yet, install Node.js, preferably using nvm https://github.com/nvm-sh/nvm
Then, in a terminal window (tested this with bash):
```sh
git clone https://github.com/solid/web-access-control-tests
cd web-access-control-tests
git checkout reproduce-246-ess
npm ci
bash ./run-against-ess.sh
```

You'll see something like:
```
[...]
 FAIL  test/surface/create.test.ts (13.518 s)
  ● Create › Using PUT in existing container › is disallowed without default Write

    expect(received).toEqual(expected) // deep equality

    Expected: 403
    Received: 201
[...]
```
Just above the 'FAIL' line you'll see the PUT request that Bob did to create new.txt.

Have a look through the console output to see which test container it used. For instance if it was `web-access-control-tests-1614931894635` then you can now do:
```sh
node fetch.js "https://pod-compat.inrupt.com/solidtestsuite/solidtestsuite/web-access-control-tests-1614931894635/6/allOtherModes/new.txt"
[...]
200 hello
[...]
```

To see that the resource was indeed created. To see what the ACL was, you can do (using the same test container URL from your own console output):

```sh
node fetch.js "https://pod-compat.inrupt.com/solidtestsuite/solidtestsuite/web-access-control-tests-1614931894635/6/allOtherModes/?ext=acl"
```
And you'll see something like:
```turtle
[...]
<https://pod-compat.inrupt.com/solidtestsuite/solidtestsuite/web-access-control-tests-1614931894635/6/allOtherModes/?ext=acl#bobAccessTo>
        acl:mode        acl:Write ;
        acl:accessTo    <https://pod-compat.inrupt.com/solidtestsuite/solidtestsuite/web-access-control-tests-1614931894635/6/allOtherModes/> ;
        acl:agent       <https://solid-crud-tests-example-2.solidcommunity.net/profile/card#me> ;
        rdf:type        acl:Authorization .

<https://pod-compat.inrupt.com/solidtestsuite/solidtestsuite/web-access-control-tests-1614931894635/6/allOtherModes/?ext=acl#alice>
        acl:mode      acl:Control ;
        acl:mode      acl:Write ;
        acl:mode      acl:Read ;
        acl:default   <https://pod-compat.inrupt.com/solidtestsuite/solidtestsuite/web-access-control-tests-1614931894635/6/allOtherModes/> ;
        acl:accessTo  <https://pod-compat.inrupt.com/solidtestsuite/solidtestsuite/web-access-control-tests-1614931894635/6/allOtherModes/> ;
        acl:agent     <https://solidtestsuite.solidcommunity.net/profile/card#me> ;
        rdf:type      acl:Authorization .
[...]
```

You can also do:
```sh
```
