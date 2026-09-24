import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

function Tablets() {
  const [tablets, setTablets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const data = snapshot.docs.map((item) => {
          const room = item.data();
          return {
            id: item.id,
            deviceName: room.deviceName || room.ownerName || "Unknown tablet",
            isOnline: room.isOnline === true,
            active: room.active === true,
            guestOnline: room.guestOnline === true,
            mainOnline: room.mainOnline === true,
            password: room.password || "",
            roomId: room.roomId || item.id,
          };
        });

        data.sort((a, b) => {
          if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
          return String(a.deviceName).localeCompare(String(b.deviceName));
        });

        setTablets(data);
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

  const onlineCount = tablets.filter((t) => t.isOnline).length;
  const offlineCount = tablets.length - onlineCount;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tablets</h1>
          <p>Deployed tablets with live online / offline status</p>
        </div>
      </div>

      <div className="dashboard">
        <div className="stat-card">
          <span className="stat-label">Total</span>
          <strong>{loading ? "..." : tablets.length}</strong>
          <span className="stat-description">Registered rooms</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Online</span>
          <strong>{loading ? "..." : onlineCount}</strong>
          <span className="stat-description">Ready or in session</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Offline</span>
          <strong>{loading ? "..." : offlineCount}</strong>
          <span className="stat-description">After QR reset</span>
        </div>
      </div>

      <div className="language-card">
        <div className="tablet-table-header">
          <span>Device</span>
          <span>Status</span>
          <span>Session</span>
          <span>Room ID</span>
        </div>

        {loading && (
          <div className="tablet-empty">Loading tablets...</div>
        )}

        {!loading && error && (
          <div className="tablet-empty tablet-error">{error}</div>
        )}

        {!loading && !error && tablets.length === 0 && (
          <div className="tablet-empty">
            No tablets yet. Deploy a Main tablet and open the Host QR screen.
          </div>
        )}

        {!loading &&
          !error &&
          tablets.map((tablet) => (
            <div key={tablet.id} className="tablet-row">
              <div>
                <strong>{tablet.deviceName}</strong>
                <span className="tablet-meta">
                  {tablet.guestOnline ? "Guest present" : "No guest"}
                </span>
              </div>

              <div>
                <span
                  className={
                    tablet.isOnline
                      ? "status-badge status-online"
                      : "status-badge status-offline"
                  }
                >
                  {tablet.isOnline ? "Online" : "Offline"}
                </span>
              </div>

              <div>
                <span
                  className={
                    tablet.active
                      ? "status-badge status-connected"
                      : "status-badge status-waiting"
                  }
                >
                  {tablet.active ? "Connected" : "Waiting"}
                </span>
              </div>

              <div className="tablet-room-id" title={tablet.roomId}>
                {tablet.roomId}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default Tablets;
