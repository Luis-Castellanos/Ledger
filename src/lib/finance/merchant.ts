export function merchantPrefix(raw: string) {
  const tokens = raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);

  if (tokens.length === 0) {
    return "";
  }

  const meaningful = tokens.filter((token) => /[a-z]/i.test(token) && !/^[#*\d-]+$/.test(token));
  const source = meaningful.length > 0 ? meaningful : tokens;

  return source.slice(0, Math.min(2, source.length)).join(" ");
}
