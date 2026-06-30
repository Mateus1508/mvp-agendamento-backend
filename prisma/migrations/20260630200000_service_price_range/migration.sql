-- AlterTable
ALTER TABLE "Service" ADD COLUMN "priceMin" DECIMAL(10,2);
ALTER TABLE "Service" ADD COLUMN "priceMax" DECIMAL(10,2);

UPDATE "Service" SET "priceMin" = "price", "priceMax" = "price";

ALTER TABLE "Service" ALTER COLUMN "priceMin" SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "priceMax" SET NOT NULL;

ALTER TABLE "Service" DROP COLUMN "price";
