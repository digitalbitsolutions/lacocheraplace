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
const DEFAULT_TIMEOUT_MS = 10000;

type HttpLookupResponse = {
  status?: string;
  found?: boolean;
  reason?: string;
  error?: string;
  errorCode?: string;
  message?: string;
  vehicle?: Record<string, unknown>;
  make?: string;
  model?: string;
  trim?: string;
  year?: number | string;
  fuelType?: string;
  engine?: string;
  family?: string;
  size?: string;
  [key: string]: unknown;
};

function normalizePlate(value: string) {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}

function normalizeFamily(value: unknown): VehicleFamilyKey | undefined {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!normalized) return undefined;
  if (["moto", "motocicleta"].includes(normalized)) return "moto";
  if (["coche", "auto", "car", "turismo"].includes(normalized)) return "coche";
  if (["suv", "todoterreno", "4x4"].includes(normalized)) return "suv";
  if (["furgon", "furgoneta", "van"].includes(normalized)) return "furgon";
  return undefined;
}

function normalizeSize(value: unknown): VehicleSizeKey | undefined {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "S" || normalized === "M" || normalized === "L") {
    return normalized;
  }
  return undefined;
}

function parseYear(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function parseTimeout(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.trunc(parsed);
}

function getEnv(name: string) {
  return (process.env[name] || "").trim();
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

class HttpJsonPlateLookupAdapter implements PlateLookupAdapter {
  provider: string;
  private endpoint: string;
  private method: "GET" | "POST";
  private timeoutMs: number;
  private apiKey: string;
  private apiKeyHeader: string;
  private bearerToken: string;
  private staticTokenHeader: string;
  private staticToken: string;

  constructor(params: {
    provider: string;
    endpoint: string;
    method?: "GET" | "POST";
    timeoutMs?: number;
    apiKey?: string;
    apiKeyHeader?: string;
    bearerToken?: string;
    staticTokenHeader?: string;
    staticToken?: string;
  }) {
    this.provider = params.provider;
    this.endpoint = params.endpoint;
    this.method = params.method || "POST";
    this.timeoutMs = params.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.apiKey = params.apiKey || "";
    this.apiKeyHeader = params.apiKeyHeader || "x-api-key";
    this.bearerToken = params.bearerToken || "";
    this.staticTokenHeader = params.staticTokenHeader || "";
    this.staticToken = params.staticToken || "";
  }

  private buildHeaders() {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers[this.apiKeyHeader] = this.apiKey;
    }

    if (this.bearerToken) {
      headers.Authorization = `Bearer ${this.bearerToken}`;
    }

    if (this.staticTokenHeader && this.staticToken) {
      headers[this.staticTokenHeader] = this.staticToken;
    }

    return headers;
  }

  private buildUrl(plate: string, countryCode: string) {
    if (this.method === "POST") return this.endpoint;
    const url = new URL(this.endpoint);
    url.searchParams.set("plate", plate);
    url.searchParams.set("countryCode", countryCode);
    return url.toString();
  }

  private mapVerifiedVehicle(
    plateNormalized: string,
    countryCode: string,
    payload: HttpLookupResponse,
  ): LookupVehicleSnapshot {
    const vehiclePayload = (payload.vehicle || payload) as Record<string, unknown>;

    const family =
      normalizeFamily(vehiclePayload.family) || normalizeFamily(payload.family);
    const size = normalizeSize(vehiclePayload.size) || normalizeSize(payload.size);

    return {
      plateNormalized,
      countryCode,
      make: String(vehiclePayload.make || payload.make || "").trim() || undefined,
      model:
        String(vehiclePayload.model || payload.model || "").trim() || undefined,
      trim: String(vehiclePayload.trim || payload.trim || "").trim() || undefined,
      year: parseYear(vehiclePayload.year ?? payload.year),
      fuelType:
        String(vehiclePayload.fuelType || payload.fuelType || "").trim() ||
        undefined,
      engine:
        String(vehiclePayload.engine || payload.engine || "").trim() || undefined,
      family,
      size,
      raw: payload as Record<string, unknown>,
    };
  }

  async lookupByPlate(input: LookupByPlateInput): Promise<LookupByPlateResult> {
    const plateNormalized = normalizePlate(input.plate);
    const countryCode = (input.countryCode || DEFAULT_COUNTRY_CODE).toUpperCase();

    if (!plateNormalized) {
      return {
        status: "error",
        provider: this.provider,
        errorCode: "PLATE_REQUIRED",
        message: "La matricula es obligatoria para ejecutar el precheck.",
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(plateNormalized, countryCode), {
        method: this.method,
        headers: this.buildHeaders(),
        signal: controller.signal,
        body:
          this.method === "POST"
            ? JSON.stringify({
                plate: plateNormalized,
                countryCode,
              })
            : undefined,
      });

      const payload = ((await response.json()) || {}) as HttpLookupResponse;
      const raw = payload as Record<string, unknown>;

      if (!response.ok) {
        return {
          status: "error",
          provider: this.provider,
          errorCode: payload.errorCode || `HTTP_${response.status}`,
          message:
            payload.message ||
            payload.error ||
            "El proveedor de lookup devolvio un error.",
          raw,
        };
      }

      const declaredStatus = String(payload.status || "").trim().toLowerCase();
      if (declaredStatus === "not_found" || payload.found === false) {
        return {
          status: "not_found",
          provider: this.provider,
          reason:
            payload.reason ||
            payload.message ||
            "No se encontro vehiculo para la matricula indicada.",
          raw,
        };
      }

      if (declaredStatus === "error") {
        return {
          status: "error",
          provider: this.provider,
          errorCode: payload.errorCode || "LOOKUP_ERROR",
          message:
            payload.message ||
            payload.error ||
            "Error de proveedor en consulta de matricula.",
          raw,
        };
      }

      const verifiedByStatus = declaredStatus === "verified";
      const hasVehicleObject =
        typeof payload.vehicle === "object" && payload.vehicle !== null;
      const hasAnyVehicleFields =
        Boolean(payload.make) || Boolean(payload.model) || hasVehicleObject;

      if (!verifiedByStatus && !hasAnyVehicleFields) {
        return {
          status: "not_found",
          provider: this.provider,
          reason:
            payload.reason ||
            payload.message ||
            "No se obtuvo informacion suficiente del vehiculo.",
          raw,
        };
      }

      return {
        status: "verified",
        provider: this.provider,
        vehicle: this.mapVerifiedVehicle(plateNormalized, countryCode, payload),
      };
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      return {
        status: "error",
        provider: this.provider,
        errorCode: isAbort ? "LOOKUP_TIMEOUT" : "LOOKUP_NETWORK_ERROR",
        message: isAbort
          ? "Timeout consultando el proveedor de matriculas."
          : "Fallo de red consultando el proveedor de matriculas.",
        raw:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
              }
            : undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

let singletonAdapter: PlateLookupAdapter | null = null;

export function getPlateLookupAdapter() {
  if (!singletonAdapter) {
    const provider = getEnv("VEHICLE_LOOKUP_PROVIDER") || "noop";
    const endpoint = getEnv("VEHICLE_LOOKUP_ENDPOINT");

    if (provider !== "noop" && !endpoint) {
      console.warn(
        `[vehicle-lookup] VEHICLE_LOOKUP_PROVIDER="${provider}" sin VEHICLE_LOOKUP_ENDPOINT. Usando noop.`,
      );
      singletonAdapter = new NoopPlateLookupAdapter();
      return singletonAdapter;
    }

    if (endpoint) {
      singletonAdapter = new HttpJsonPlateLookupAdapter({
        provider,
        endpoint,
        method:
          getEnv("VEHICLE_LOOKUP_METHOD").toUpperCase() === "GET"
            ? "GET"
            : "POST",
        timeoutMs: parseTimeout(getEnv("VEHICLE_LOOKUP_TIMEOUT_MS")),
        apiKey: getEnv("VEHICLE_LOOKUP_API_KEY"),
        apiKeyHeader: getEnv("VEHICLE_LOOKUP_API_KEY_HEADER") || "x-api-key",
        bearerToken: getEnv("VEHICLE_LOOKUP_BEARER_TOKEN"),
        staticTokenHeader: getEnv("VEHICLE_LOOKUP_STATIC_TOKEN_HEADER"),
        staticToken: getEnv("VEHICLE_LOOKUP_STATIC_TOKEN"),
      });
    } else {
      singletonAdapter = new NoopPlateLookupAdapter();
    }
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
