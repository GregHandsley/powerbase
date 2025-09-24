-- CreateTable
CREATE TABLE "public"."LegendSync" (
    "id" TEXT NOT NULL,
    "requestInstanceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "LegendSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegendSync_requestInstanceId_key" ON "public"."LegendSync"("requestInstanceId");

-- AddForeignKey
ALTER TABLE "public"."LegendSync" ADD CONSTRAINT "LegendSync_requestInstanceId_fkey" FOREIGN KEY ("requestInstanceId") REFERENCES "public"."RequestInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
