/*
  Warnings:

  - A unique constraint covering the columns `[requestInstanceId]` on the table `Allocation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Allocation_requestInstanceId_key" ON "public"."Allocation"("requestInstanceId");
