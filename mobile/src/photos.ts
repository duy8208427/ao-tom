// Ảnh ao dùng chung với bản web (public/ponds), cùng bảng mã ao như POND_IMAGES trong src/geo.ts.
import type { ImageSourcePropType } from "react-native";

const IMG = {
  ao001: require("../../public/ponds/ao001.jpg"),
  aoahung01: require("../../public/ponds/aoahung01.jpg"),
  bt03: require("../../public/ponds/bt03.jpg"),
  doson: require("../../public/ponds/doson.jpg"),
  nghiloc: require("../../public/ponds/nghiloc.jpg"),
  ninhhoa: require("../../public/ponds/ninhhoa.jpg"),
  p0009: require("../../public/ponds/p0009.jpg"),
  phanthiet: require("../../public/ponds/phanthiet.jpg"),
  pond0002: require("../../public/ponds/pond0002.jpg"),
  pond0003: require("../../public/ponds/pond0003.jpg"),
  pt01: require("../../public/ponds/pt01.jpg"),
  st01: require("../../public/ponds/st01.jpg"),
  tuyphuoc: require("../../public/ponds/tuyphuoc.jpg"),
  tvhtx: require("../../public/ponds/tvhtx.jpg"),
} satisfies Record<string, ImageSourcePropType>;

const BY_CODE: Record<string, keyof typeof IMG> = {
  AOAHUNG01: "aoahung01",
  ao001: "ao001",
  POND0002: "pond0002",
  POND0003: "pond0003",
  p0009: "p0009",
  ST01: "st01",
  BT03: "bt03",
  PT01: "pt01",
  TVHTX: "tvhtx",
  DS01: "doson",
  NL01: "nghiloc",
  TP01: "tuyphuoc",
  NH01: "ninhhoa",
  PTH01: "phanthiet",
  VC01: "st01",
  VC02: "tvhtx",
  VC03: "bt03",
  VC04: "pt01",
  MX01: "ninhhoa",
  MX02: "tuyphuoc",
  MX03: "nghiloc",
  MX04: "phanthiet",
};

export function pondPhoto(code: string): ImageSourcePropType {
  return IMG[BY_CODE[code] ?? "aoahung01"];
}
