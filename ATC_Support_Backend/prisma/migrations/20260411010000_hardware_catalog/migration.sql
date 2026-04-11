-- CreateTable
CREATE TABLE "HardwareBrand" (
    "id" SERIAL NOT NULL,
    "category" "HardwareCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "vendorSupportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareModel" (
    "id" SERIAL NOT NULL,
    "hardwareBrandId" INTEGER NOT NULL,
    "category" "HardwareCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "vendorSupportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareModel_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "HardwareAsset" ADD COLUMN "hardwareModelId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "HardwareBrand_category_name_key" ON "HardwareBrand"("category", "name");

-- CreateIndex
CREATE INDEX "HardwareBrand_category_idx" ON "HardwareBrand"("category");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareModel_hardwareBrandId_name_key" ON "HardwareModel"("hardwareBrandId", "name");

-- CreateIndex
CREATE INDEX "HardwareModel_hardwareBrandId_idx" ON "HardwareModel"("hardwareBrandId");

-- CreateIndex
CREATE INDEX "HardwareModel_category_idx" ON "HardwareModel"("category");

-- CreateIndex
CREATE INDEX "HardwareAsset_hardwareModelId_idx" ON "HardwareAsset"("hardwareModelId");

-- AddForeignKey
ALTER TABLE "HardwareModel" ADD CONSTRAINT "HardwareModel_hardwareBrandId_fkey" FOREIGN KEY ("hardwareBrandId") REFERENCES "HardwareBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareAsset" ADD CONSTRAINT "HardwareAsset_hardwareModelId_fkey" FOREIGN KEY ("hardwareModelId") REFERENCES "HardwareModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
