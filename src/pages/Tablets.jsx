import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { buildTabletPairs } from "../utils/tablets";

function StatusBadge({ online }) {
  return (
    <span
      className={
        online ? "status-badge status-online" : "status-badge status-offline"
      }
    >
      {online ? "Online" : "Offline"}
    </span>
  );
}

function Tablets() {
  const [pairs, setPairs] = useState([]);
  const [stats, setStats] = useState(null);
  const [legacyRooms, setLegacyRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const result = buildTabletPairs(snapshot.docs);
        setPairs(result.pairs);
        setStats(result.stats);
        setLegacyRooms(result.legacyRooms);
        setError("");
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load tablets:", err);
        setError("Failed to load tablets");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const removableLegacy = legacyRooms.filter((r) => r.active !== true);

  const cleanUpLegacy = async () => {
    if (removableLegacy.length === 0) return;
    const ok = window.confirm(
      `Delete ${removableLegacy.length} old room(s) created by previous app versions?\n` +
        "Rooms with an active session are kept."
    );
    if (!ok) return;

    try {
      setCleaning(true);
      await Promise.all(
        removableLegacy.map((r) => deleteDoc(doc(db, "rooms", r.id)))
      );
    } catch (err) {
      console.error("Failed to delete old rooms:", err);
      alert("Failed to delete some old rooms.");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div>
      <div className="dashboard">
        <div className="stat-card">
          <span className="stat-label">Main Tablets</span>
          <strong>{loading ? "..." : `${stats.mainOnline} / ${stats.mainTotal}`}</strong>
          <span className="stat-description">Online / total</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Guest Tablets</span>
          <strong>{loading ? "..." : `${stats.guestOnline} / ${stats.guestTotal}`}</strong>
          <span className="stat-description">Online / total</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Offline</span>
          <strong>{loading ? "..." : stats.offline}</strong>
          <span className="stat-description">Main + Guest after reset</span>
        </div>
      </div>

      {!loading && removableLegacy.length > 0 && (
        <div className="legacy-banner">
          <span>
            {removableLegacy.length} old room(s) from previous app versions are
            hidden.
          </span>
          <button
            type="button"
            className="edit-button"
            onClick={cleanUpLegacy}
            disabled={cleaning}
          >
            {cleaning ? "Deleting..." : "Delete old rooms"}
          </button>
        </div>
      )}

      {loading && <div className="tablet-empty">Loading tablets...</div>}

      {!loading && error && (
        <div className="tablet-empty tablet-error">{error}</div>
      )}

      {!loading && !error && pairs.length === 0 && (
        <div className="tablet-empty">
          No tablets yet. Open Host QR on a Main tablet to register one.
        </div>
      )}

      <div className="pair-grid">
        {!loading &&
          !error &&
          pairs.map((pair) => (
            <div key={pair.roomId} className="pair-card">
              <div className="pair-row">
                <span className="role-chip role-main">Main</span>
                <strong className="pair-name">{pair.main.name}</strong>
                <StatusBadge online={pair.main.online} />
              </div>

              <div className="pair-row">
                <span className="role-chip role-guest">Guest</span>
                {pair.guest ? (
                  <>
                    <strong className="pair-name">{pair.guest.name}</strong>
                    <StatusBadge online={pair.guest.online} />
                  </>
                ) : (
                  <span className="pair-name pair-empty">Not connected</span>
                )}
              </div>

              <div className="pair-footer">
                {pair.active ? "Session connected" : "Waiting for guest (QR)"}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default Tablets;
