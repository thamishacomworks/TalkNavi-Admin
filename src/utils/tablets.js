function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

/**
 * Builds one Main/Guest pair per Main tablet from `rooms` docs.
 * Each physical tablet (deviceId) is shown in one place only.
 * Rooms without `mainDeviceId` were created by older app builds and are
 * reported as legacy instead of being shown.
 */
export function buildTabletPairs(docs) {
  const all = docs.map((d) => ({ id: d.id, ...d.data() }));
  const rooms = all.filter((r) => r.mainDeviceId);
  const legacyRooms = all.filter((r) => !r.mainDeviceId);

  let pairs = rooms
    .filter((r) => r.mainInGuestMode !== true)
    .map((r) => ({
      roomId: r.id,
      active: r.active === true,
      main: {
        deviceId: r.mainDeviceId,
        name: r.deviceName || r.ownerName || "Main tablet",
        online: r.isOnline === true,
      },
      guest: r.guestDeviceId
        ? {
            deviceId: r.guestDeviceId,
            name: r.guestDeviceName || "Guest tablet",
            online: r.guestOnline === true,
            connectedAt: toMillis(r.guestConnectedAt),
          }
        : null,
    }));

  const onlineGuestIds = new Set(
    pairs.filter((p) => p.guest?.online).map((p) => p.guest.deviceId)
  );

  // A tablet currently online as Guest should not also show an offline Main card
  pairs = pairs.filter(
    (p) => p.main.online || !onlineGuestIds.has(p.main.deviceId)
  );

  const mainIds = new Set(pairs.map((p) => p.main.deviceId));

  // Keep each guest tablet in its best pair only (online first, then most recent)
  const bestGuestRoom = new Map();
  pairs.forEach((p) => {
    if (!p.guest) return;
    if (!p.guest.online && mainIds.has(p.guest.deviceId)) {
      p.guest = null;
      return;
    }
    const current = bestGuestRoom.get(p.guest.deviceId);
    const score = [p.guest.online ? 1 : 0, p.guest.connectedAt];
    if (
      !current ||
      score[0] > current.score[0] ||
      (score[0] === current.score[0] && score[1] > current.score[1])
    ) {
      bestGuestRoom.set(p.guest.deviceId, { roomId: p.roomId, score });
    }
  });

  pairs.forEach((p) => {
    if (p.guest && bestGuestRoom.get(p.guest.deviceId)?.roomId !== p.roomId) {
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
