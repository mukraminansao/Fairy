-- Replace only the legacy group photos attached to the two demo products.
WITH replacements("productId", "alt", "path") AS (
  VALUES
    ('b-cream', 'Renewal Cream close-up', '/assets/skincare/renewal-cream.webp'),
    ('b-essence', 'Hydrating Essence close-up', '/assets/skincare/hydrating-essence.webp')
), legacy AS (
  SELECT image."id", image."productId", replacements."path" AS "newPath"
  FROM "ProductImage" image
  JOIN replacements ON replacements."productId" = image."productId" AND replacements."alt" = image."alt"
  JOIN "Product" product ON product."id" = image."productId" AND product."demoOnly"
  WHERE image."path" = '/assets/images/skincare_category.png'
), updated AS (
  UPDATE "ProductImage" image
  SET "path" = legacy."newPath"
  FROM legacy
  WHERE image."id" = legacy."id"
    AND NOT EXISTS (
      SELECT 1 FROM "ProductImage" dedicated
      WHERE dedicated."productId" = legacy."productId" AND dedicated."path" = legacy."newPath"
    )
)
DELETE FROM "ProductImage" image
USING legacy
WHERE image."id" = legacy."id"
  AND EXISTS (
    SELECT 1 FROM "ProductImage" dedicated
    WHERE dedicated."productId" = legacy."productId" AND dedicated."path" = legacy."newPath"
  );
