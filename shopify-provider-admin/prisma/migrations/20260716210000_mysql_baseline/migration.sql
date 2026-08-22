-- MySQL production baseline for the administrative app.
-- The previous SQLite migrations are retained in prisma/migrations-sqlite-legacy.

CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` VARCHAR(191) NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` VARCHAR(191) NOT NULL,
    `userId` BIGINT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(191) NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,
    `refreshToken` VARCHAR(191) NULL,
    `refreshTokenExpires` DATETIME(3) NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CustomerContact` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `shopifyCustomerGid` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `CustomerContact_shop_email_idx`(`shop`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `customerContactId` VARCHAR(191) NOT NULL,
    `plateRaw` VARCHAR(191) NOT NULL,
    `plateNormalized` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT 'ES',
    `vin` VARCHAR(191) NULL,
    `make` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `trim` VARCHAR(191) NULL,
    `fuelType` VARCHAR(191) NULL,
    `engine` VARCHAR(191) NULL,
    `firstRegistrationDate` DATETIME(3) NULL,
    `year` INTEGER NULL,
    `family` ENUM('MOTO', 'COCHE', 'SUV', 'FURGON') NULL,
    `size` ENUM('S', 'M', 'L') NULL,
    `sourceSnapshot` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Vehicle_shop_customerContactId_idx`(`shop`, `customerContactId`),
    UNIQUE INDEX `Vehicle_shop_plateNormalized_key`(`shop`, `plateNormalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `VehicleLookupLog` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `plateRaw` VARCHAR(191) NOT NULL,
    `plateNormalized` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT 'ES',
    `provider` VARCHAR(191) NOT NULL,
    `requestPayload` VARCHAR(191) NULL,
    `responsePayload` VARCHAR(191) NULL,
    `status` ENUM('SUCCESS', 'NOT_FOUND', 'ERROR') NOT NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `resolvedFamily` ENUM('MOTO', 'COCHE', 'SUV', 'FURGON') NULL,
    `resolvedSize` ENUM('S', 'M', 'L') NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `vehicleId` VARCHAR(191) NULL,
    INDEX `VehicleLookupLog_shop_plateNormalized_createdAt_idx`(`shop`, `plateNormalized`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ServicePrecheck` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `productGid` VARCHAR(191) NOT NULL,
    `productHandle` VARCHAR(191) NULL,
    `purchaseFlow` VARCHAR(191) NULL,
    `customerContactId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `lookupLogId` VARCHAR(191) NULL,
    `plateNormalized` VARCHAR(191) NOT NULL,
    `family` ENUM('MOTO', 'COCHE', 'SUV', 'FURGON') NULL,
    `size` ENUM('S', 'M', 'L') NULL,
    `status` ENUM('OK', 'INCOMPATIBLE', 'UNVERIFIED') NOT NULL DEFAULT 'UNVERIFIED',
    `isCompatible` BOOLEAN NOT NULL DEFAULT false,
    `compatibilityReason` VARCHAR(191) NULL,
    `compatibleVariantGid` VARCHAR(191) NULL,
    `compatibleVariantTitle` VARCHAR(191) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ServicePrecheck_lookupLogId_key`(`lookupLogId`),
    INDEX `ServicePrecheck_shop_productGid_status_idx`(`shop`, `productGid`, `status`),
    INDEX `ServicePrecheck_shop_requestedAt_idx`(`shop`, `requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrderVehicleLink` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `shopifyOrderGid` VARCHAR(191) NOT NULL,
    `shopifyOrderName` VARCHAR(191) NULL,
    `shopifyLineItemGid` VARCHAR(191) NULL,
    `servicePrecheckId` VARCHAR(191) NOT NULL,
    `customerContactId` VARCHAR(191) NULL,
    `vehicleId` VARCHAR(191) NULL,
    `linkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `OrderVehicleLink_shop_linkedAt_idx`(`shop`, `linkedAt`),
    UNIQUE INDEX `OrderVehicleLink_shop_shopifyOrderGid_servicePrecheckId_key`(`shop`, `shopifyOrderGid`, `servicePrecheckId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_customerContactId_fkey` FOREIGN KEY (`customerContactId`) REFERENCES `CustomerContact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `VehicleLookupLog` ADD CONSTRAINT `VehicleLookupLog_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ServicePrecheck` ADD CONSTRAINT `ServicePrecheck_customerContactId_fkey` FOREIGN KEY (`customerContactId`) REFERENCES `CustomerContact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ServicePrecheck` ADD CONSTRAINT `ServicePrecheck_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ServicePrecheck` ADD CONSTRAINT `ServicePrecheck_lookupLogId_fkey` FOREIGN KEY (`lookupLogId`) REFERENCES `VehicleLookupLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `OrderVehicleLink` ADD CONSTRAINT `OrderVehicleLink_servicePrecheckId_fkey` FOREIGN KEY (`servicePrecheckId`) REFERENCES `ServicePrecheck`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `OrderVehicleLink` ADD CONSTRAINT `OrderVehicleLink_customerContactId_fkey` FOREIGN KEY (`customerContactId`) REFERENCES `CustomerContact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `OrderVehicleLink` ADD CONSTRAINT `OrderVehicleLink_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
