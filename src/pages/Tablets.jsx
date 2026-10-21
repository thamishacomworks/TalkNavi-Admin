import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
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

function TabletName({ name, deviceName, align = "start" }) {
  const showId = deviceName && deviceName !== name;
  return (
    <span className={`pair-name-block pair-name-${align}`}>
      <strong className="pair-name">{name}</strong>
      {showId && <span className="pair-device-id">{deviceName}</span>}
    </span>
  );
}

function PairName({ roomId, name }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const showForm = !name || editing;

  useEffect(() => {
    if (!showForm) setValue(name);
  }, [name, showForm]);

  const save = async () => {
    const label = value.trim().slice(0, 40);
    if (!label || label === name) {
      setValue(name);
      setEditing(false);
      return;
    }
    try {
      setSaving(true);
      await updateDoc(doc(db, "rooms", roomId), { pairName: label });
      setEditing(false);
    } catch (err) {
      console.error("Failed to save pair name:", err);
      alert("Failed to save the pair name.");
    } finally {
      setSaving(false);
    }
  };

  if (!name || editing) {
    return (
      <form
        className="pair-edit-form pair-name-form"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <input
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, 40))}
          placeholder="Name this pair"
          aria-label="Pair name"
          disabled={saving}
          autoFocus
        />
        <button type="submit" className="pair-edit" disabled={saving || !value.trim()}>
          {saving ? "Saving" : "Save"}
        </button>
        {name && (
          <button
            type="button"
            className="pair-edit"
            onClick={() => {
              setValue(name);
              setEditing(false);
            }}
            disabled={saving}
          >
            Cancel
          </button>
        )}
      </form>
    );
  }

  return (
    <span className="pair-name-block">
      <strong className="pair-card-title">{name}</strong>
      <button type="button" className="pair-edit" onClick={() => setEditing(true)}>
        Edit name
      </button>
    </span>
  );
}

function PairDisconnect({ roomId, blocked, message }) {
  const [text, setText] = useState(message);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText(message);
  }, [message]);

  const write = async (nextBlocked, warning) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        adminBlocked: nextBlocked,
        adminBlockMessage: warning,
      });
    } catch (err) {
      console.error("Failed to update the pair connection:", err);
      alert("Failed to update the tablets.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    const warning = text.trim();
    if (!blocked && !warning) {
      alert("Type the warning message first.");
      return;
    }
    write(!blocked, warning);
  };

  const saveMessage = () => {
    const warning = text.trim();
    if (!blocked || warning === message) return;
    write(true, warning);
  };

  return (
    <div className="pair-disconnect">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value.slice(0, 200))}
        onBlur={saveMessage}
        placeholder="Warning message shown on both tablets"
        aria-label="Warning message"
        rows={2}
        disabled={busy}
      />
      <button
        type="button"
        className={blocked ? "pair-connect" : "pair-disconnect-button"}
        onClick={toggle}
        disabled={busy}
      >
        {busy ? "Saving" : blocked ? "Connect" : "Disconnect"}
      </button>
    </div>
  );
}

function Tablets() {
  const [pairs, setPairs] = useState([]);
  const [stats, setStats] = useState(null);
  const [legacyRooms, setLegacyRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [deletingId, setDeletingId] = useState("");

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

  const deletePair = async (pair) => {
    const label = pair.pairName || "this pair";
    const ok = window.confirm(
      `Delete the card for ${label}?\n` +
        "If those tablets connect again, a new card can appear."
    );
    if (!ok) return;

    try {
      setDeletingId(pair.roomId);
      await deleteDoc(doc(db, "rooms", pair.roomId));
    } catch (err) {
      console.error("Failed to delete pair:", err);
      alert("Failed to delete the card.");
    } finally {
      setDeletingId("");
    }
  };

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
          <span className="stat-label">Connected pairs</span>
          <strong>{loading ? "..." : stats.connected}</strong>
          <span className="stat-description">
            {loading ? "Loading..." : `${stats.offline} tablets offline`}
          </span>
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

      {!loading && !error && pairs.length > 0 && (
        <>
          <section className="pair-section">
            <h2>Connected</h2>
            <p className="pair-section-note">
              Give each connected pair one name. You can edit that name or
              delete the card.
            </p>
            {pairs.some((pair) => pair.connected) ? (
              <div className="pair-grid">
                {pairs
                  .filter((pair) => pair.connected)
                  .map((pair) => (
                    <article
                      key={pair.roomId}
                      className="pair-card pair-card-connected"
                    >
                      <div className="pair-card-head">
                        <PairName roomId={pair.roomId} name={pair.pairName} />
                        <button
                          type="button"
                          className="pair-delete"
                          onClick={() => deletePair(pair)}
                          disabled={deletingId === pair.roomId}
                        >
                          {deletingId === pair.roomId ? "Deleting" : "Delete"}
                        </button>
                      </div>
                      <div className="pair-link">
                        <div className="pair-side">
                          <span className="role-chip role-main">Main</span>
                          <TabletName
                            name={pair.main.name}
                            deviceName={pair.main.deviceName}
                          />
                          <StatusBadge online={pair.main.online} />
                        </div>
                        <div className="pair-arrow" aria-hidden="true">
                          connected
                        </div>
                        <div className="pair-side pair-side-guest">
                          <span className="role-chip role-guest">Guest</span>
                          <TabletName
                            name={pair.guest.name}
                            deviceName={pair.guest.deviceName}
                            align="end"
                          />
                          <StatusBadge online={pair.guest.online} />
                        </div>
                      </div>
                      <PairDisconnect
                        roomId={pair.roomId}
                        blocked={pair.adminBlocked}
                        message={pair.adminBlockMessage}
                      />
                      <p className="pair-summary">
                        {pair.pairName ? (
                          <>
                            <strong>{pair.pairName}</strong> is this pair.{" "}
                          </>
                        ) : null}
                        <strong>{pair.main.name}</strong> is the Main tablet.{" "}
                        <strong>{pair.guest.name}</strong> is the Guest tablet
                        connected to it.
                      </p>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="tablet-empty">
                No two tablets are connected right now.
              </div>
            )}
          </section>

          <section className="pair-section">
            <h2>Not connected</h2>
            {pairs.some((pair) => !pair.connected) ? (
              <div className="pair-grid">
                {pairs
                  .filter((pair) => !pair.connected)
                  .map((pair) => (
                    <article key={pair.roomId} className="pair-card">
                      <div className="pair-row">
                        <span className="role-chip role-main">Main</span>
                        <TabletName
                          name={pair.main.name}
                          deviceName={pair.main.deviceName}
                        />
                        <StatusBadge online={pair.main.online} />
                      </div>
                      <div className="pair-row">
                        <span className="role-chip role-guest">Guest</span>
                        <span className="pair-name pair-empty">
                          Not connected
                        </span>
                      </div>
                      {pair.adminBlocked && (
                        <PairDisconnect
                          roomId={pair.roomId}
                          blocked={pair.adminBlocked}
                          message={pair.adminBlockMessage}
                        />
                      )}
                    </article>
                  ))}
              </div>
            ) : (
              <div className="tablet-empty">
                Every registered tablet is in a session.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Tablets;
