-- AlterEnum: Add ARCHIVED to OrderStatus
-- This is a safe operation for PostgreSQL enums
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
