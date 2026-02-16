const STORAGE_PREFIX = "game-offers";

function storageKey(name) {
  return `${STORAGE_PREFIX}:${name}`;
}

function normalizeItem(item) {
  return {
    appid: String(item.appid ?? ""),
    name: item.name || "Untitled game",
    image: item.image || item.tiny_image || item.header_image || "",
    steam_link: item.steam_link || "",
  };
}

export function getList(name) {
  const key = storageKey(name);
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

export function saveList(name, items) {
  const key = storageKey(name);
  localStorage.setItem(key, JSON.stringify(items));
}

export function hasItem(name, appid) {
  const id = String(appid ?? "");
  if (!id) return false;
  return getList(name).some((item) => String(item.appid) === id);
}

export function addItem(name, item) {
  const id = String(item?.appid ?? "");
  if (!id) return { added: false, items: getList(name) };

  const items = getList(name);
  if (items.some((entry) => String(entry.appid) === id)) {
    return { added: false, items };
  }

  const next = [normalizeItem(item), ...items];
  saveList(name, next);
  return { added: true, items: next };
}

export function removeItem(name, appid) {
  const id = String(appid ?? "");
  const items = getList(name);
  const next = items.filter((entry) => String(entry.appid) !== id);
  saveList(name, next);
  return { removed: next.length !== items.length, items: next };
}

export function toggleItem(name, item) {
  const id = String(item?.appid ?? "");
  if (!id) return { added: false, items: getList(name) };

  if (hasItem(name, id)) {
    const result = removeItem(name, id);
    return { added: false, items: result.items };
  }

  const result = addItem(name, item);
  return { added: true, items: result.items };
}
