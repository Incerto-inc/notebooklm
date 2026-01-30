-- AlterTable
ALTER TABLE "scenarios" ADD COLUMN     "loading" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "loading" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "styles" ADD COLUMN     "loading" BOOLEAN NOT NULL DEFAULT false;
