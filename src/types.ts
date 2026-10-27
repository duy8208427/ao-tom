export type AlertStatus = "OK" | "HIGH" | "LOW" | "NONE";

export type AssetKind = "sensor" | "camera" | "aerator" | "feeder" | "pump";
export type AssetStatus = "running" | "idle" | "offline" | "fault";
export type TripStatus = "waiting" | "enroute" | "late" | "received";

export type AppRole = "resident" | "farmer" | "admin";

export type Pond = {
  id: string;
  pond_code: string;
  pond_name: string;
  area: string;
  volume: string;
  location: string;
  description: string;
  created_at: string;
  sample?: boolean;
  farm_id?: string;
  resident_name?: string;
};

export type Device = {
  id: string;
  device_code: string;
  device_name: string;
  pond_code: string | null;
  pond_name: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
};

export type Asset = {
  id: string;
  pond_id: string;
  kind: AssetKind;
  name: string;
  location_label: string;
  status: AssetStatus;
  device_code?: string;
  last_seen?: string;
};

export type CropCycle = {
  pond_id: string;
  species: string;
  stocked_at: string;
  days_old: number;
  density: string;
  shrimp_size: string;
  survival_pct: number;
  harvest_eta: string;
  feed_ration_kg: number;
  leftover_feed_kg: number;
  water_change_today: number;
  siphon_today: number;
};

export type InventoryItem = {
  name: string;
  kind: string;
  quantity: number;
  unit: string;
  week_cost: number;
};

export type Farm = {
  id: string;
  code: string;
  name: string;
  region_id: string;
  location: string;
  latitude: number;
  longitude: number;
  pond_ids: string[];
  staff_shift: string;
  inlet_source: string;
  settling_pond: string;
  inventory: InventoryItem[];
};

export type Plant = {
  id: string;
  name: string;
  region_id: string;
  location: string;
  latitude: number;
  longitude: number;
  daily_capacity_kg: number;
  waiting_kg: number;
  receiving_hours: string;
  cutoff_time: string;
  size_spec: string;
  grade: string;
  max_bin_temp: number;
  price_per_kg: number;
  phone: string;
  dock: string;
};

export type MapLayers = {
  ponds: boolean;
  farms: boolean;
  routes: boolean;
  plants: boolean;
};

export type Route = {
  id: string;
  name: string;
  region_id: string;
  plant_id: string;
  path: [number, number][];
};

export type Vehicle = {
  id: string;
  plate: string;
  driver: string;
  region_id: string;
  latitude: number;
  longitude: number;
};

export type Trip = {
  id: string;
  pond_id: string;
  vehicle_id: string;
  route_id: string;
  plant_id: string;
  weight_kg: number;
  bin_temp: number;
  departed_at: string;
  eta: string;
  status: TripStatus;
};

export type Region = {
  id: string;
  name: string;
  location: string;
};

export type Parameter = {
  param_code: string;
  param_name: string;
  unit: string;
  ref_min: number | null;
  ref_max: number | null;
  description: string;
};

export type Measurement = {
  param_code: string;
  measured_value: number;
  unit: string;
  measured_at: string;
  status: AlertStatus;
};

export type HistoryPoint = {
  device_code: string;
  alert_time: string;
  measured_value: string | number;
  alert_level?: string;
};

export type AlertRow = {
  id: string;
  device_code: string;
  param_code: string;
  measured_value: string;
  alert_level: string;
  message: string;
  alert_time: string;
};

export type TaskRow = {
  id: string;
  pond_id: string;
  pond_name?: string;
  user_fullname: string;
  task_type_name: string;
  quantity: string;
  unit: string;
  notes: string;
  image_url: string | null;
  performed_at: string;
};

export type MaterialRow = {
  kind: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
};

export type WaterQualityRow = {
  param_code: string;
  param_name: string;
  avg: number;
  unit: string;
  range: string;
  verdict: string;
};

export type PondReport = {
  pond_id: string;
  pond_code: string;
  pond_name: string;
  area: number;
  volume: number;
  location: string;
  description: string;
  feed_count_this_week: number;
  water_change_this_week: number;
  materials: MaterialRow[];
  total_cost: number;
  water_quality: WaterQualityRow[];
  tasks?: TaskRow[];
};

export type PondPin = {
  pond: Pond;
  lng: number;
  lat: number;
  estimated: boolean;
  devices: Device[];
  measurements: Measurement[];
  byDevice: Record<string, Measurement[]>;
  assets: Asset[];
  crop?: CropCycle;
  farm_id?: string;
  farm_name?: string;
  status: AlertStatus;
  latestAt: string | null;
};

export type FarmView = Farm & {
  status: AlertStatus;
  pins: PondPin[];
  dangerCount: number;
  warnCount: number;
  okCount: number;
  idleCount: number;
};

export type VehicleView = Vehicle & {
  trip?: Trip;
  pond_name?: string;
  plant_name?: string;
  route_name?: string;
  path: [number, number][];
  origin?: { lng: number; lat: number; name: string };
  dest?: { lng: number; lat: number; name: string };
  progress: number;
  remaining_min: number | null;
};

export type PlantView = Plant & {
  received_today_kg: number;
  remaining_kg: number;
  inbound_count: number;
  received_count: number;
  waiting_count: number;
  inbound: VehicleView[];
};

export type WarningKind = "pond" | "asset" | "trip";

export type WarningItem = {
  id: string;
  kind: WarningKind;
  level: "HIGH" | "LOW";
  title: string;
  detail: string;
  lng: number;
  lat: number;
  pond_id?: string;
  farm_id?: string;
  vehicle_id?: string;
};

export type HoverInfo = {
  pin: PondPin;
  x: number;
  y: number;
  /** Bề rộng của thẻ ghim đang hiện, để hover card đặt sang bên cạnh thay vì đè lên. */
  w?: number;
};
