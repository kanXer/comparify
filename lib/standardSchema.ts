import { RideOption, StandardSchemaRow } from './types';

export const STANDARD_COLUMNS = [
  'Pickup Location',
  'Drop Location',
  'App Name',
  'Motorcycle',
  'Auto',
  'Cab Eco',
  'Cab Premium',
  'Cab XL',
] as const;

/**
 * Builds standard 8-column schema rows according to comparative pricing rules:
 * - Rapido Mapping:
 *   - Motorcycle: Standard Bike Fare (Ignore 'Bike Lite' if present).
 *   - Auto: Auto fare.
 *   - Cab Eco: Economy/Mini cab.
 *   - Cab Premium: Premium/Sedan cab.
 *   - Cab XL: XL/6-Seater cab.
 * - Bharat Taxi Mapping:
 *   - Motorcycle: Two-wheeler fare.
 *   - Auto: Auto fare.
 *   - Cab Eco: Hatchback fare.
 *   - Cab Premium: Sedan price (Ignore 'Priority' cab).
 *   - Cab XL: SUV/6-Seater fare.
 * - Values contain clean raw numbers only (no '₹' currency symbols or text suffix).
 */
export function buildStandardSchemaRows(data: {
  pickup: { address: string; displayName?: string };
  drop: { address: string; displayName?: string };
  rides: RideOption[];
}): {
  rapidoRow: StandardSchemaRow;
  bharatTaxiRow: StandardSchemaRow;
  rows: StandardSchemaRow[];
} {
  const pickupLocation = data.pickup.address || data.pickup.displayName || 'Pickup Location';
  const dropLocation = data.drop.address || data.drop.displayName || 'Drop Location';

  // 1. Rapido Mapping
  const rapidoBike = data.rides.find(
    (r) =>
      r.provider === 'rapido' &&
      r.vehicleCategory === 'bike' &&
      !r.vehicleName.toLowerCase().includes('lite')
  );

  const rapidoAuto = data.rides.find(
    (r) => r.provider === 'rapido' && r.vehicleCategory === 'auto'
  );

  const rapidoCabEco = data.rides.find(
    (r) => r.provider === 'rapido' && r.vehicleCategory === 'cab'
  );

  const rapidoCabPremium = data.rides.find(
    (r) => r.provider === 'rapido' && r.vehicleCategory === 'cab_premium'
  );

  const rapidoCabXL = data.rides.find(
    (r) => r.provider === 'rapido' && r.vehicleCategory === 'cab_xl'
  );

  // 2. Bharat Taxi Mapping
  const bharatBike = data.rides.find(
    (r) => r.provider === 'bharat_taxi' && r.vehicleCategory === 'bike'
  );

  const bharatAuto = data.rides.find(
    (r) => r.provider === 'bharat_taxi' && r.vehicleCategory === 'auto'
  );

  const bharatCabEco = data.rides.find(
    (r) => r.provider === 'bharat_taxi' && r.vehicleCategory === 'cab'
  );

  const bharatSedan = data.rides.find(
    (r) =>
      r.provider === 'bharat_taxi' &&
      r.vehicleCategory === 'cab_premium' &&
      !r.vehicleName.toLowerCase().includes('priority')
  );

  const bharatCabXL = data.rides.find(
    (r) => r.provider === 'bharat_taxi' && r.vehicleCategory === 'cab_xl'
  );

  const rapidoRow: StandardSchemaRow = {
    pickupLocation,
    dropLocation,
    appName: 'Rapido',
    motorcycle: rapidoBike ? Number(rapidoBike.price) : null,
    auto: rapidoAuto ? Number(rapidoAuto.price) : null,
    cabEco: rapidoCabEco ? Number(rapidoCabEco.price) : null,
    cabPremium: rapidoCabPremium ? Number(rapidoCabPremium.price) : null,
    cabXL: rapidoCabXL ? Number(rapidoCabXL.price) : null,
  };

  const bharatTaxiRow: StandardSchemaRow = {
    pickupLocation,
    dropLocation,
    appName: 'Bharat Taxi',
    motorcycle: bharatBike ? Number(bharatBike.price) : null,
    auto: bharatAuto ? Number(bharatAuto.price) : null,
    cabEco: bharatCabEco ? Number(bharatCabEco.price) : null,
    cabPremium: bharatSedan ? Number(bharatSedan.price) : null,
    cabXL: bharatCabXL ? Number(bharatCabXL.price) : null,
  };

  return {
    rapidoRow,
    bharatTaxiRow,
    rows: [rapidoRow, bharatTaxiRow],
  };
}
