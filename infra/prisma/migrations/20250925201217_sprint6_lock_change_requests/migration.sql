-- CreateTable
CREATE TABLE "public"."LockPeriod" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "LockPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChangeRequest" (
    "id" TEXT NOT NULL,
    "requestInstanceId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "channel" TEXT NOT NULL DEFAULT 'inapp',
    "deliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LockPeriod_weekStart_key" ON "public"."LockPeriod"("weekStart");

-- CreateIndex
CREATE INDEX "ChangeRequest_requestInstanceId_status_idx" ON "public"."ChangeRequest"("requestInstanceId", "status");

-- AddForeignKey
ALTER TABLE "public"."ChangeRequest" ADD CONSTRAINT "ChangeRequest_requestInstanceId_fkey" FOREIGN KEY ("requestInstanceId") REFERENCES "public"."RequestInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
