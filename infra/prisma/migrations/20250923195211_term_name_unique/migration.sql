/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `TermPeriod` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TermPeriod_name_key" ON "public"."TermPeriod"("name");
