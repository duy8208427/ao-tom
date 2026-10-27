export type Role = "resident" | "farmer" | "admin";

export const ROLES: { value: Role; label: string }[] = [
  { value: "resident", label: "Người dân" },
  { value: "farmer", label: "Chủ trại" },
  { value: "admin", label: "Admin" },
];

export const DEMO_RESIDENT = "Trần Quốc Huy";
export const DEMO_FARM_ID = "farm-vc";

export type Camera = { id: string; name: string; lost?: boolean };
export type AlertItem = { id: string; title: string; detail: string };

export type Pond = {
  id: string;
  name: string;
  code: string;
  farmId: string;
  resident?: string;
  status: "Nguy hiểm" | "Cảnh báo" | "Ổn";
  worst: string;
  photo: "st01" | "tvhtx" | "bt03" | "pt01" | "ninhhoa" | "tuyphuoc" | "nghiloc" | "phanthiet";
  cameras: Camera[];
  alerts: AlertItem[];
};

export type LateTruck = { id: string; plate: string; pond: string };

export const FARMS = [
  { id: "farm-vc", name: "Trại Vĩnh Châu" },
  { id: "farm-mx", name: "Trại Mỹ Xuyên" },
];

export const PONDS: Pond[] = [
  {
    id: "vc1",
    name: "Ao Vĩnh Châu 1",
    code: "VC01",
    farmId: "farm-vc",
    resident: "Trần Quốc Huy",
    status: "Nguy hiểm",
    worst: "DO 2,1 mg/L",
    photo: "st01",
    cameras: [
      { id: "vc1-south", name: "Camera bờ nam" },
      { id: "vc1-north", name: "Camera bờ bắc" },
    ],
    alerts: [
      { id: "vc1-do", title: "DO 2,1 mg/L", detail: "Oxy hòa tan vượt ngưỡng" },
      { id: "vc1-nh3", title: "NH3 0,18 mg/L", detail: "Amoniac vượt ngưỡng" },
    ],
  },
  {
    id: "vc2",
    name: "Ao Vĩnh Châu 2",
    code: "VC02",
    farmId: "farm-vc",
    status: "Cảnh báo",
    worst: "Camera mất hình",
    photo: "tvhtx",
    cameras: [{ id: "vc2-east", name: "Camera bờ đông", lost: true }],
    alerts: [{ id: "vc2-cam", title: "Camera bờ đông", detail: "Mất tín hiệu từ 06:41" }],
  },
  {
    id: "vc3",
    name: "Ao Vĩnh Châu 3",
    code: "VC03",
    farmId: "farm-vc",
    resident: "Phạm Thị Lan",
    status: "Nguy hiểm",
    worst: "DO 4,6 mg/L",
    photo: "bt03",
    cameras: [{ id: "vc3-west", name: "Camera bờ tây" }],
    alerts: [
      { id: "vc3-do", title: "DO 4,6 mg/L", detail: "Oxy hòa tan thấp" },
      { id: "vc3-fan", title: "Quạt nước 1", detail: "Lỗi từ 07:02" },
    ],
  },
  {
    id: "vc4",
    name: "Ao Vĩnh Châu 4",
    code: "VC04",
    farmId: "farm-vc",
    status: "Ổn",
    worst: "Các chỉ số đang ổn",
    photo: "pt01",
    cameras: [{ id: "vc4-gate", name: "Camera cổng" }],
    alerts: [],
  },
  {
    id: "s1",
    name: "Ao Sóc Trăng 1",
    code: "ST01",
    farmId: "farm-vc",
    status: "Cảnh báo",
    worst: "Camera cổng mất hình",
    photo: "st01",
    cameras: [
      { id: "s1-west", name: "Camera bờ tây" },
      { id: "s1-east", name: "Camera bờ đông" },
      { id: "s1-gate", name: "Camera cổng", lost: true },
    ],
    alerts: [{ id: "s1-cam", title: "Camera cổng", detail: "Mất tín hiệu từ 05:12" }],
  },
  {
    id: "mx1",
    name: "Ao Mỹ Xuyên 1",
    code: "MX01",
    farmId: "farm-mx",
    resident: "Võ Minh Đức",
    status: "Nguy hiểm",
    worst: "NH3 0,28 mg/L",
    photo: "ninhhoa",
    cameras: [{ id: "mx1-harvest", name: "Camera bờ thu" }],
    alerts: [{ id: "mx1-nh3", title: "NH3 0,28 mg/L", detail: "Amoniac vượt ngưỡng" }],
  },
  {
    id: "mx2",
    name: "Ao Mỹ Xuyên 2",
    code: "MX02",
    farmId: "farm-mx",
    status: "Cảnh báo",
    worst: "Máy cho ăn mất tín hiệu",
    photo: "tuyphuoc",
    cameras: [{ id: "mx2-north", name: "Camera bờ bắc" }],
    alerts: [{ id: "mx2-feed", title: "Máy cho ăn", detail: "Mất tín hiệu từ tối qua" }],
  },
  {
    id: "mx3",
    name: "Ao Mỹ Xuyên 3",
    code: "MX03",
    farmId: "farm-mx",
    status: "Ổn",
    worst: "Các chỉ số đang ổn",
    photo: "nghiloc",
    cameras: [{ id: "mx3-west", name: "Camera bờ tây" }],
    alerts: [],
  },
  {
    id: "mx4",
    name: "Ao Mỹ Xuyên 4",
    code: "MX04",
    farmId: "farm-mx",
    status: "Cảnh báo",
    worst: "PH 7,2",
    photo: "phanthiet",
    cameras: [{ id: "mx4-east", name: "Camera bờ đông" }],
    alerts: [{ id: "mx4-ph", title: "PH 7,2", detail: "pH thấp hơn ngưỡng" }],
  },
];

export const LATE_TRUCKS: LateTruck[] = [
  { id: "veh-2", plate: "51C-678.90", pond: "Ao Mỹ Xuyên 1" },
  { id: "veh-7", plate: "51C-774.02", pond: "Ao Trà Vinh HTX" },
];

export function pondsFor(role: Role): Pond[] {
  if (role === "resident") return PONDS.filter((pond) => pond.resident === DEMO_RESIDENT);
  if (role === "farmer") return PONDS.filter((pond) => pond.farmId === DEMO_FARM_ID);
  return PONDS;
}

export function sessionName(role: Role, account: string | null): string {
  if (account) return account;
  if (role === "resident") return DEMO_RESIDENT;
  if (role === "farmer") return "Trại Vĩnh Châu";
  return "Dữ liệu đã lưu";
}
