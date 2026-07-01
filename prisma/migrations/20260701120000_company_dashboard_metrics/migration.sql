-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN "companyId" TEXT;

-- AlterTable Appointment
ALTER TABLE "Appointment" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "amount" DECIMAL(10,2);
ALTER TABLE "Appointment" ADD COLUMN "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED';

-- CreateIndex
CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");
CREATE INDEX "Appointment_companyId_idx" ON "Appointment"("companyId");
CREATE INDEX "Appointment_companyId_date_idx" ON "Appointment"("companyId", "date");
CREATE INDEX "Appointment_companyId_status_idx" ON "Appointment"("companyId", "status");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
