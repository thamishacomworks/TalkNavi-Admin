import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { buildTabletPairs, buildUserCards } from "../utils/tablets";

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
  const [legacyRooms, setLegacyRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [users, setUsers] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [registryReady, setRegistryReady] = useState(false);

  useEffect(() => {
    let nextUsers = [];
    let nextTablets = [];
    let usersReady = false;
    let tabletsReady = false;
    const publish = () => {
      setUsers(nextUsers);
      setRegistered(nextTablets);
      setRegistryReady(usersReady && tabletsReady);
    };
    const stopUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        nextUsers = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
        usersReady = true;
        publish();
      },
      () => {
        usersReady = true;
        publish();
      }
    );
    const stopTablets = onSnapshot(
      collection(db, "userTablets"),
      (snapshot) => {
        nextTablets = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
        tabletsReady = true;
        publish();
      },
      () => {
        tabletsReady = true;
        publish();
      }
    );
    return () => {
      stopUsers();
      stopTablets();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const result = buildTabletPairs(snapshot.docs);
        setPairs(result.pairs);
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

  const ready = !loading && registryReady;
  const cards = buildUserCards(users, registered, pairs);
  const listed = cards.flatMap((card) => card.tablets);
  const mainTablets = listed.filter((tablet) => tablet.type === "main");
  const guestTablets = listed.filter((tablet) => tablet.type === "guest");
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
          <strong>{ready ? `${mainTablets.filter((tablet) => tablet.online).length} / ${mainTablets.length}` : "..."}</strong>
          <span className="stat-description">Online / total</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Guest Tablets</span>
          <strong>{ready ? `${guestTablets.filter((tablet) => tablet.online).length} / ${guestTablets.length}` : "..."}</strong>
          <span className="stat-description">Online / total</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Users</span>
          <strong>{ready ? cards.length : "..."}</strong>
          <span className="stat-description">
            {ready ? `${listed.length} tablets` : "Loading..."}
          </span>
        </div>
      </div>

      {ready && removableLegacy.length > 0 && (
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

      {!ready && !error && <div className="tablet-empty">Loading tablets...</div>}

      {ready && error && (
        <div className="tablet-empty tablet-error">{error}</div>
      )}

      {ready && !error && cards.length === 0 && (
        <div className="tablet-empty">
          No tablets yet. Add a user and their tablets on the Users page.
        </div>
      )}

      {ready && !error && cards.length > 0 && (
        <div className="pair-grid">
          {cards.map((card) => (
            <article
              key={card.id}
              className={card.connected ? "pair-card pair-card-connected" : "pair-card"}
            >
              <h2 className="pair-card-title">{card.name}</h2>
              {card.tablets.map((tablet) => (
                <div className="pair-row" key={tablet.id}>
                  <span className={tablet.type === "main" ? "role-chip role-main" : tablet.type === "guest" ? "role-chip role-guest" : "role-chip"}>
                    {tablet.type === "main" ? "Main" : tablet.type === "guest" ? "Guest" : "—"}
                  </span>
                  <span className="pair-name-block">
                    <strong className="pair-name">{tablet.deviceName}</strong>
                    {tablet.serialNumber && (
                      <span className="pair-device-id">{tablet.serialNumber}</span>
                    )}
                  </span>
                  <StatusBadge online={tablet.online} />
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Tablets;
