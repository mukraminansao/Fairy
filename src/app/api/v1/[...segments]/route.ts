import * as admin from "@/server/admin";
import { ApiError, data, failure, identifier, jsonBody, notFound, pagination, sameOrigin } from "@/server/api";
import { currentUser } from "@/server/auth";
import * as catalog from "@/server/catalog";
import * as commerce from "@/server/commerce";
import { databaseConfigured } from "@/server/database";

type Context = { params: Promise<{ segments: string[] }> };

async function handle(request: Request, context: Context) {
  try {
    const parts = (await context.params).segments.map((part) => identifier.parse(part));
    const [resource, id, action, target] = parts;
    const query = new URL(request.url).searchParams;
    const get = (key: string) => query.get(key) ?? undefined;
    const paging = () => pagination.parse({ limit: get("limit"), cursor: get("cursor") });
    const method = request.method;
    const body = () => jsonBody(request);
    if (method === "GET" && parts.length <= 2 && ["products", "categories", "scenes"].includes(resource)) {
      if (!databaseConfigured()) throw new ApiError(503, "CATALOG_UNAVAILABLE", "The server catalog has not been configured.");
      if (resource === "products") return await (id ? catalog.readProduct(id) : catalog.listProducts(catalog.productQuery.parse({
        ...paging(), category: get("category")?.toUpperCase(), q: get("q"), sort: get("sort"),
      })));
      if (resource === "categories" && !id) return await catalog.listCategories();
      if (resource === "scenes") return await (id ? catalog.readScene(id) : catalog.listScenes(catalog.sceneQuery.parse({
        ...paging(), kind: get("kind")?.toUpperCase(),
      })));
    }
    if (resource === "session-summary" && !id && method === "GET") {
      const viewer = await currentUser();
      if (!viewer) return data(null);
      const [cart, wishlist] = await Promise.all([commerce.readCart(viewer.id), commerce.readWishlist(viewer.id)]);
      return data({ name: viewer.name, cart, wishlist: wishlist.map(({ id, slug, name }) => ({ id, slug, name })) });
    }
    if (!["me", "cart", "wishlist", "looks", "admin"].includes(resource) || parts.length > 4) return notFound();
    const user = await currentUser();
    if (!user) throw new ApiError(401, "SIGN_IN_REQUIRED", "Sign in to access your FAIRY account.");
    if (method !== "GET") sameOrigin(request);
    if (resource === "me" && !id && method === "GET") return data(user);
    if (resource === "cart") {
      if (!id && method === "GET") return data(await commerce.readCart(user.id));
      if (id === "restore" && !action && method === "POST") {
        const { quantity, variantId } = commerce.restoreCartOption.parse(await body());
        return data(await commerce.putCartItem(user.id, variantId, quantity, true));
      }
      if (id === "look" && !action && method === "GET") return data(await commerce.quoteLook(user.id, commerce.reviewKeys.parse(new URL(request.url).searchParams.getAll("option"))));
      if (id === "look" && !action && method === "POST") return data(await commerce.addReviewedLook(user.id, commerce.reviewSelection.parse(await body()).keys), 201);
      if (id === "items" && action && !target) {
        if (method === "PUT") return data(await commerce.putCartItem(user.id, action, commerce.cartQuantity.parse(await body()).quantity));
        if (method === "POST") return data(await commerce.putCartItem(user.id, action, 1, true), 201);
        if (method === "PATCH") return data(await commerce.changeCartOption(user.id, action, commerce.replaceOption.parse(await body()).variantId));
        if (method === "DELETE") { await commerce.deleteCartItem(user.id, action); return new Response(null, { status: 204 }); }
      }
    }
    if (resource === "wishlist" && !target) {
      if (!id && method === "GET") return data(await commerce.readWishlist(user.id));
      const productId = id === "items" ? action : action ? undefined : id;
      if (productId && method === "PUT") return data(await commerce.putWishlistItem(user.id, productId));
      if (productId && method === "DELETE") { await commerce.deleteWishlistItem(user.id, productId); return new Response(null, { status: 204 }); }
    }
    if (resource === "looks" && !action) {
      if (!id && method === "GET") { const { limit, cursor } = paging(); return await commerce.looksResponse(user.id, limit, cursor); }
      if (!id && method === "POST") return data(await commerce.createLook(user.id, commerce.newLook.parse(await body())), 201);
      if (id && method === "GET") return data(await commerce.readLook(user.id, id));
      if (id && method === "PATCH") return data(await commerce.updateLook(user.id, id, commerce.editLook.parse(await body())));
      if (id && method === "DELETE") { await commerce.deleteLook(user.id, id); return new Response(null, { status: 204 }); }
    }
    if (resource === "admin") {
      if (user.role === "CUSTOMER" || (method !== "GET" || id === "audit") && user.role !== "ADMIN") {
        throw new ApiError(403, "FORBIDDEN", "Your account does not have access to this action.");
      }
      if (id === "products") {
        if (!action && method === "GET") {
          const { limit, cursor } = paging();
          const { results, nextCursor } = await admin.adminProducts(limit, cursor);
          return data(results, 200, { nextCursor });
        }
        if (!action && method === "POST") return data(await admin.createProduct(user.id, admin.newProduct.parse(await body())), 201);
        if (action && !target && method === "PATCH") return data(await admin.updateProduct(user.id, action, admin.productPatch.parse(await body())));
        if (action && target === "variants" && method === "POST") return data(await admin.createVariant(user.id, action, admin.newVariant.parse(await body())), 201);
      }
      if (id === "variants" && action && !target && method === "PATCH") return data(await admin.updateVariant(user.id, action, admin.variantPatch.parse(await body())));
      if (id === "inventory" && action && !target && method === "PATCH") return data(await admin.updateStock(user.id, action, admin.stockPatch.parse(await body())));
      if (id === "scenes" && action && !target && method === "PATCH") return data(await admin.updateScene(user.id, action, admin.scenePatch.parse(await body())));
      if (id === "audit" && !action && method === "GET") {
        const { limit, cursor } = paging();
        const { results, nextCursor } = await admin.listAudit(limit, cursor);
        return data(results, 200, { nextCursor });
      }
    }
    return notFound();
  } catch (error) { return failure(error); }
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };

