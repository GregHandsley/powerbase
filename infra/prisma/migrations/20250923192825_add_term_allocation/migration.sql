-- CreateEnum
CREATE TYPE "public"."SideProfile" AS ENUM ('term', 'vacation');

-- CreateEnum
CREATE TYPE "public"."SlotMode" AS ENUM ('PERFORMANCE_ONLY', 'HYBRID', 'GENERAL_ONLY', 'SSEHS');

-- CreateTable
CREATE TABLE "public"."TermPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "profile" "public"."SideProfile" NOT NULL,

    CONSTRAINT "TermPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AllocationMatrix" (
    "id" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "sideId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "slotStart" TEXT NOT NULL,
    "slotEnd" TEXT NOT NULL,
    "mode" "public"."SlotMode" NOT NULL,
    "perfCap" INTEGER,
    "generalCap" INTEGER,

    CONSTRAINT "AllocationMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AllocationMatrix_termId_sideId_dayOfWeek_idx" ON "public"."AllocationMatrix"("termId", "sideId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "public"."AllocationMatrix" ADD CONSTRAINT "AllocationMatrix_termId_fkey" FOREIGN KEY ("termId") REFERENCES "public"."TermPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AllocationMatrix" ADD CONSTRAINT "AllocationMatrix_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "public"."Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
