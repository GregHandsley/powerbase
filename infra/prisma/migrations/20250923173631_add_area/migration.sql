-- CreateTable
CREATE TABLE "public"."Area" (
    "id" TEXT NOT NULL,
    "sideId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxHeads" INTEGER,
    "unitsCount" INTEGER,
    "bookable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_sideId_key_key" ON "public"."Area"("sideId", "key");

-- AddForeignKey
ALTER TABLE "public"."Area" ADD CONSTRAINT "Area_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "public"."Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
