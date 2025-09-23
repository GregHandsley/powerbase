-- CreateEnum
CREATE TYPE "RackType" AS ENUM ('FULL', 'HALF', 'STAND');

-- CreateTable
CREATE TABLE "Side" (
    "id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "Side_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rack" (
    "id" TEXT NOT NULL,
    "sideId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "RackType" NOT NULL,
    "zone" INTEGER,

    CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HOST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Side_key_key" ON "Side"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Rack_sideId_number_key" ON "Rack"("sideId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
