-- AlterTable
ALTER TABLE "Client" RENAME CONSTRAINT "User_pkey" TO "Client_pkey";

-- RenameIndex
ALTER INDEX "User_email_key" RENAME TO "Client_email_key";

-- RenameIndex
ALTER INDEX "User_googleId_key" RENAME TO "Client_googleId_key";
