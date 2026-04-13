-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "shopifyCustomerGid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerContactId" TEXT NOT NULL,
    "plateRaw" TEXT NOT NULL,
    "plateNormalized" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'ES',
    "vin" TEXT,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "fuelType" TEXT,
    "engine" TEXT,
    "firstRegistrationDate" DATETIME,
    "year" INTEGER,
    "family" TEXT,
    "size" TEXT,
    "sourceSnapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "CustomerContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleLookupLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "plateRaw" TEXT NOT NULL,
    "plateNormalized" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'ES',
    "provider" TEXT NOT NULL,
    "requestPayload" TEXT,
    "responsePayload" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "resolvedFamily" TEXT,
    "resolvedSize" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleId" TEXT,
    CONSTRAINT "VehicleLookupLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServicePrecheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productGid" TEXT NOT NULL,
    "productHandle" TEXT,
    "purchaseFlow" TEXT,
    "customerContactId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "lookupLogId" TEXT,
    "plateNormalized" TEXT NOT NULL,
    "family" TEXT,
    "size" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "isCompatible" BOOLEAN NOT NULL DEFAULT false,
    "compatibilityReason" TEXT,
    "compatibleVariantGid" TEXT,
    "compatibleVariantTitle" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServicePrecheck_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "CustomerContact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServicePrecheck_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServicePrecheck_lookupLogId_fkey" FOREIGN KEY ("lookupLogId") REFERENCES "VehicleLookupLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderVehicleLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopifyOrderGid" TEXT NOT NULL,
    "shopifyOrderName" TEXT,
    "shopifyLineItemGid" TEXT,
    "servicePrecheckId" TEXT NOT NULL,
    "customerContactId" TEXT,
    "vehicleId" TEXT,
    "linkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderVehicleLink_servicePrecheckId_fkey" FOREIGN KEY ("servicePrecheckId") REFERENCES "ServicePrecheck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderVehicleLink_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "CustomerContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderVehicleLink_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomerContact_shop_email_idx" ON "CustomerContact"("shop", "email");

-- CreateIndex
CREATE INDEX "Vehicle_shop_customerContactId_idx" ON "Vehicle"("shop", "customerContactId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_shop_plateNormalized_key" ON "Vehicle"("shop", "plateNormalized");

-- CreateIndex
CREATE INDEX "VehicleLookupLog_shop_plateNormalized_createdAt_idx" ON "VehicleLookupLog"("shop", "plateNormalized", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePrecheck_lookupLogId_key" ON "ServicePrecheck"("lookupLogId");

-- CreateIndex
CREATE INDEX "ServicePrecheck_shop_productGid_status_idx" ON "ServicePrecheck"("shop", "productGid", "status");

-- CreateIndex
CREATE INDEX "ServicePrecheck_shop_requestedAt_idx" ON "ServicePrecheck"("shop", "requestedAt");

-- CreateIndex
CREATE INDEX "OrderVehicleLink_shop_linkedAt_idx" ON "OrderVehicleLink"("shop", "linkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderVehicleLink_shop_shopifyOrderGid_servicePrecheckId_key" ON "OrderVehicleLink"("shop", "shopifyOrderGid", "servicePrecheckId");
