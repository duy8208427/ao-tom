// Bộ đọc bảng HTML tối giản cho các trang PCTomCa (React Native không có DOMParser).

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Bỏ thẻ, script/style và gom khoảng trắng — tương đương textContent đã chuẩn hóa. */
export function textOf(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function cellText(html: string): string {
  return textOf(html).replace(/\s+/g, " ").trim();
}

/** Các dòng trong <tbody> (hoặc mọi <tr> nếu bảng không có tbody), mỗi dòng là mảng chữ của các <td>. */
export function tableRows(html: string): string[][] {
  const bodies = [...html.matchAll(/<tbody[^>]*>([\s\S]*?)<\/tbody>/gi)].map((m) => m[1]);
  const source = bodies.length ? bodies.join("\n") : html;
  return [...source.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) => [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cellText(cell[1])))
    .filter((cells) => cells.length > 0);
}

/** Trang trả về là màn đăng nhập (phiên đã hết hạn). */
export function isLoginWall(html: string): boolean {
  return /name=["']username["']/i.test(html) && /type=["']password["']/i.test(html) && !/name=["']fullname["']/i.test(html);
}
