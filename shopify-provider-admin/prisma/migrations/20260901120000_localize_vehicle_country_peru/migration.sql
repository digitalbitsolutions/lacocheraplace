-- Defaults apply only to new rows. Existing ES records are preserved so that
-- historical data is not silently relabeled as Peruvian.
ALTER TABLE `Vehicle`
  MODIFY `countryCode` VARCHAR(191) NOT NULL DEFAULT 'PE';

ALTER TABLE `VehicleLookupLog`
  MODIFY `countryCode` VARCHAR(191) NOT NULL DEFAULT 'PE';
