-- WhatsApp (Evolution GO) integration tables

-- CreateEnum
CREATE TYPE "WaDirection" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "wa_contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wa_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_messages" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "direction" "WaDirection" NOT NULL,
    "content" TEXT NOT NULL,
    "msgType" TEXT NOT NULL DEFAULT 'text',
    "transcription" TEXT,
    "mediaPath" TEXT,
    "waMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_lid_map" (
    "lid" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "wa_lid_map_pkey" PRIMARY KEY ("lid")
);

-- CreateTable
CREATE TABLE "wa_blocklist" (
    "phone" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "wa_blocklist_pkey" PRIMARY KEY ("phone")
);

-- CreateIndex
CREATE UNIQUE INDEX "wa_contacts_userId_phone_key" ON "wa_contacts"("userId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "wa_messages_waMessageId_key" ON "wa_messages"("waMessageId");

-- AddForeignKey
ALTER TABLE "wa_contacts" ADD CONSTRAINT "wa_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_messages" ADD CONSTRAINT "wa_messages_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "wa_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
