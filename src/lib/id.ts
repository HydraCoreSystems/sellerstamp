/** A short unique id for a photo or a design. Nothing leaves the phone, so this only has to be unique here. */
export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
