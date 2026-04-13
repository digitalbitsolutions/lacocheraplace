export type VehicleFamilyKey = "moto" | "coche" | "suv" | "furgon";
export type VehicleSizeKey = "S" | "M" | "L";

export interface LookupByPlateInput {
  plate: string;
  countryCode?: string;
}

export interface LookupVehicleSnapshot {
  plateNormalized: string;
  countryCode: string;
  make?: string;
  model?: string;
  trim?: string;
  year?: number;
  fuelType?: string;
  engine?: string;
  family?: VehicleFamilyKey;
  size?: VehicleSizeKey;
  raw: Record<string, unknown>;
}

export type LookupByPlateResult =
  | {
      status: "verified";
      provider: string;
      vehicle: LookupVehicleSnapshot;
    }
  | {
      status: "not_found";
      provider: string;
      reason: string;
      raw?: Record<string, unknown>;
    }
  | {
      status: "error";
      provider: string;
      errorCode: string;
      message: string;
      raw?: Record<string, unknown>;
    };

export interface PlateLookupAdapter {
  provider: string;
  lookupByPlate(input: LookupByPlateInput): Promise<LookupByPlateResult>;
}

const DEFAULT_COUNTRY_CODE = "ES";

function normalizePlate(value: string) {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}

class NoopPlateLookupAdapter implements PlateLookupAdapter {
  provider = "noop";

  async lookupByPlate(input: LookupByPlateInput): Promise<LookupByPlateResult> {
    const plateNormalized = normalizePlate(input.plate);

    if (!plateNormalized) {
      return {
        status: "error",
        provider: this.provider,
        errorCode: "PLATE_REQUIRED",
        message: "La matricula es obligatoria para ejecutar el precheck.",
      };
    }

    return {
      status: "not_found",
      provider: this.provider,
      reason:
        "No hay proveedor de lookup configurado todavia. Sustituye el adaptador noop en lote 2.",
      raw: {
        plateNormalized,
        countryCode: input.countryCode || DEFAULT_COUNTRY_CODE,
      },
    };
  }
}

let singletonAdapter: PlateLookupAdapter | null = null;

export function getPlateLookupAdapter() {
  if (!singletonAdapter) {
    singletonAdapter = new NoopPlateLookupAdapter();
  }

  return singletonAdapter;
}

export function setPlateLookupAdapter(adapter: PlateLookupAdapter) {
  singletonAdapter = adapter;
}

export async function lookupByPlate(input: LookupByPlateInput) {
  const adapter = getPlateLookupAdapter();
  return adapter.lookupByPlate({
    plate: input.plate,
    countryCode: input.countryCode || DEFAULT_COUNTRY_CODE,
  });
}
