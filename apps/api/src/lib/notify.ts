import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function notify(userId: string, type: string, payload: any, channel: 'inapp'|'email'='inapp') {
  const row = await prisma.notification.create({
    data: { userId, type, payload, channel, deliveryAt: new Date() }
  });
  // DEV email: log to console; later swap to nodemailer/sendgrid
  if (channel === 'email') {
    console.log(`[EMAIL to ${userId}] ${type}`, payload);
  }
  return row.id;
}