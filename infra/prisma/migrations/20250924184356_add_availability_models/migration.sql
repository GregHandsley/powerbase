-- CreateTable
CREATE TABLE "public"."ExceptionBlock" (
    "id" TEXT NOT NULL,
    "sideId" INTEGER NOT NULL,
    "areaKey" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ExceptionBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Allocation" (
    "id" TEXT NOT NULL,
    "requestInstanceId" TEXT NOT NULL,
    "sideId" INTEGER NOT NULL,
    "racksJson" JSONB NOT NULL,
    "trackThirdsJson" JSONB,
    "areasUsageJson" JSONB,
    "status" TEXT NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExceptionBlock_sideId_start_end_idx" ON "public"."ExceptionBlock"("sideId", "start", "end");

-- CreateIndex
CREATE INDEX "Allocation_sideId_idx" ON "public"."Allocation"("sideId");

-- CreateIndex
CREATE INDEX "Allocation_requestInstanceId_idx" ON "public"."Allocation"("requestInstanceId");

-- AddForeignKey
ALTER TABLE "public"."ExceptionBlock" ADD CONSTRAINT "ExceptionBlock_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "public"."Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Allocation" ADD CONSTRAINT "Allocation_requestInstanceId_fkey" FOREIGN KEY ("requestInstanceId") REFERENCES "public"."RequestInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Allocation" ADD CONSTRAINT "Allocation_sideId_fkey" FOREIGN KEY ("sideId") REFERENCES "public"."Side"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
