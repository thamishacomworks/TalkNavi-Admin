function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

// "Tablet-XXXXXX" is derived from ANDROID_ID the same way in every app build,
// so it identifies a physical tablet even in rooms written by older builds.
function isTabletName(name) {
  return typeof name === "string" && name.startsWith("Tablet-");
}

function mainKey(room) {
  const name = room.deviceName || room.ownerName;
  if (isTabletName(name)) return name;
  return room.mainDeviceId || `room:${room.id}`;
}

function isBetter(a, b) {
  if (a.online !== b.online) return a.online;
  if (a.rank !== b.rank) return a.rank > b.rank;
  return a.time > b.time;
}

/**
 * Builds one Main/Guest pair per Main tablet from `rooms` docs.
 * Each physical tablet is shown in one place only.
 * Rooms that cannot be tied to a tablet (very old builds, not in a session)
 * are reported as legacy instead of being shown.
 */
export function buildTabletPairs(docs) {
  const all = docs.map((d) => ({ id: d.id, ...d.data() }));

  const isKnown = (r) =>
    Boolean(r.mainDeviceId) ||
    isTabletName(r.deviceName || r.ownerName) ||
    r.active === true;

  const rooms = all.filter(isKnown);
  const legacyRooms = all.filter((r) => !isKnown(r));

  let pairs = rooms
    .filter((r) => r.mainInGuestMode !== true)
    .map((r) => ({
      roomId: r.id,
      active: r.active === true,
      key: mainKey(r),
      rank: r.mainDeviceId ? 1 : 0,
      time: toMillis(r.guestConnectedAt),
      main: {
        name: r.deviceName || r.ownerName || "Main tablet",
        online: r.isOnline === true,
      },
      guest:
        r.guestDeviceName || r.guestDeviceId
          ? {
              key: r.guestDeviceName || r.guestDeviceId,
              name: r.guestDeviceName || "Guest tablet",
              online: r.guestOnline === true,
              connectedAt: toMillis(r.guestConnectedAt),
            }
          : null,
    }));

  // One card per Main tablet (e.g. old UUID room + new room for the same tablet)
  const bestMain = new Map();
  pairs.forEach((p) => {
    const current = bestMain.get(p.key);
    if (
      !current ||
      isBetter(
        { online: p.main.online, rank: p.rank, time: p.time },
        { online: current.main.online, rank: current.rank, time: current.time }
      )
    ) {
      bestMain.set(p.key, p);
    }
  });
  pairs = [...bestMain.values()];

  const onlineGuestKeys = new Set(
    pairs.filter((p) => p.guest?.online).map((p) => p.guest.key)
  );

  // A tablet currently online as Guest should not also show an offline Main card
  pairs = pairs.filter((p) => p.main.online || !onlineGuestKeys.has(p.key));

  const mainKeys = new Set(pairs.map((p) => p.key));

  // Keep each guest tablet in its best pair only (online first, then most recent)
  const bestGuestRoom = new Map();
  pairs.forEach((p) => {
    if (!p.guest) return;
    if (!p.guest.online && mainKeys.has(p.guest.key)) {
      p.guest = null;
      return;
    }
    const current = bestGuestRoom.get(p.guest.key);
    if (
      !current ||
      isBetter(
        { online: p.guest.online, rank: 0, time: p.guest.connectedAt },
        { online: current.online, rank: 0, time: current.time }
      )
    ) {
      bestGuestRoom.set(p.guest.key, {
        roomId: p.roomId,
        online: p.guest.online,
        time: p.guest.connectedAt,
      });
    }
  });

  pairs.forEach((p) => {
    if (p.guest && bestGuestRoom.get(p.guest.key)?.roomId !== p.roomId) {
      p.guest = null;
    }
  });

  pairs.sort((a, b) => {
    if (a.main.online !== b.main.online) return a.main.online ? -1 : 1;
    return String(a.main.name).localeCompare(String(b.main.name));
  });

  const guests = pairs.map((p) => p.guest).filter(Boolean);

  const stats = {
    mainTotal: pairs.length,
    mainOnline: pairs.filter((p) => p.main.online).length,
    guestTotal: guests.length,
    guestOnline: guests.filter((g) => g.online).length,
  };
  stats.total = stats.mainTotal + stats.guestTotal;
  stats.online = stats.mainOnline + stats.guestOnline;
  stats.offline = stats.total - stats.online;

  return { pairs, stats, legacyRooms };
}

/** Flat device list (Main + Guest) for simple lists such as App Updates. */
export function flattenDevices(pairs) {
  const list = [];
  pairs.forEach((p) => {
    list.push({ id: `${p.roomId}_main`, role: "Main", ...p.main });
    if (p.guest) {
      list.push({ id: `${p.roomId}_guest`, role: "Guest", ...p.guest });
    }
  });
  return list;
}
