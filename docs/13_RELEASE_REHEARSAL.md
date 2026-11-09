# Local release rehearsal

The release rehearsal runs FAIRY as a production build on this machine. It uses demo catalog data and is the review stage after the local try-on prototype. It does not deploy a website or connect a payment or sign-in provider.

## Run again

From the build kit, with Node.js 24, Chrome, and the workspace's `fairy-dev-postgres` Docker container running:

```powershell
npm.cmd ci
npm.cmd run release:rehearse
```

The command uses the loopback PostgreSQL connection from `.env.local` to create a randomly named disposable database inside that container. It applies migrations, loads demo fixtures twice, builds to `.next-release`, and serves the production build at `http://127.0.0.1:3116` while Chrome runs. It stops the rehearsal server and removes the temporary database at the end. The development database and port 3000 preview are separate. Browser captures and any failure traces are under `.release-test-results/`.

## Review checks

- The migration applies to a fresh database, and the second seed preserves the counts: 110 products, nine scenes (three fashion and six beauty), and 108 hotspots. The production app serves the scenes and individual product photos.
- A guest can select a finish, add the pendant, and review the demo checkout. The selected finish and subtotal survive a reload, and the rehearsal creates zero orders and zero payments.
- The sample model and its comparison slider are available at mobile width. The experimental camera and selfie tools and local password sign-in are off in the production build. Signed-out requests to account bag and admin APIs are rejected.
- The demo emits crawler directives asking search engines not to index it. A hosted review should also have access protection; crawler directives do not make a site private.

## Before a hosted review or launch

1. Confirm the hosting and access method for a private review with demo data. Use a separate database and separate secrets.
2. For a public storefront, confirm approved imagery and real catalog data, stock, selling regions and currency, shipping, tax and returns, hosted sign-in, and a payment provider. Confirm the published policies and test a full order, refund, and database recovery before enabling real checkout.
3. Keep camera and selfie try-on limited to local development until real-device testing and privacy review are complete. The approved 2D fitting room remains the fashion experience; a 3D version would need suitable rigged assets.

See the [open decisions](08_OPEN_DECISIONS.md) and the [auth and admin security guide](12_AUTH_ADMIN_SECURITY.md).
