import { useEffect, useState } from "react";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { buildTabletPairs, buildUserCards } from "../utils/tablets";

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

function StatCard({ tone, label, value, description, onClick, icon }) {
  return (
    <button type="button" className={`stat-card stat-card-button stat-${tone}`} onClick={onClick}>
      <span className="stat-icon">{icon}</span>
      <span className="stat-copy">
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
        <span className="stat-description">{description}</span>
      </span>
    </button>
  );
}

function Dashboard({ onNavigate }) {
  const [languageCount, setLanguageCount] = useState(0);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [tabletStats, setTabletStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
  });
  const [loadingTablets, setLoadingTablets] = useState(true);
  const [latestVersion, setLatestVersion] = useState("-");
  const [users, setUsers] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [countsReady, setCountsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingLanguages(true);
        const snapshot = await getDocs(collection(db, "languages"));
        if (!cancelled) setLanguageCount(snapshot.size);
      } catch (error) {
        console.error("Failed to load language count:", error);
        if (!cancelled) setLanguageCount(0);
      } finally {
        if (!cancelled) setLoadingLanguages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let usersReady = false;
    let tabletsReady = false;
    let roomsReady = false;
    const markCounts = () => {
      if (usersReady && tabletsReady && roomsReady) setCountsReady(true);
    };
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })));
        usersReady = true;
        markCounts();
      },
      () => {
        setUsers([]);
        usersReady = true;
        markCounts();
      }
    );
    const unsubTablets = onSnapshot(
      collection(db, "userTablets"),
      (snapshot) => {
        setRegistered(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })));
        tabletsReady = true;
        markCounts();
      },
      () => {
        setRegistered([]);
        tabletsReady = true;
        markCounts();
      }
    );
    const unsubRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const result = buildTabletPairs(snapshot.docs);
        setPairs(result.pairs);
        setRooms(
          snapshot.docs.map((item) => {
            const data = item.data();
            return {
              id: item.id,
              deviceName: data.deviceName || data.ownerName || "",
              adminBlocked: data.adminBlocked === true,
              adminBlockMessage:
                typeof data.adminBlockMessage === "string" ? data.adminBlockMessage : "",
            };
          })
        );
        setTabletStats({
          total: result.stats.total,
          online: result.stats.online,
          offline: result.stats.offline,
        });
        setLoadingTablets(false);
        roomsReady = true;
        markCounts();
      },
      (error) => {
        console.error("Failed to load tablet stats:", error);
        setTabletStats({ total: 0, online: 0, offline: 0 });
        setPairs([]);
        setRooms([]);
        setLoadingTablets(false);
        roomsReady = true;
        markCounts();
      }
    );

    const unsubUpdate = onSnapshot(
      doc(db, "app_updates", "latest"),
      (snap) => {
        if (snap.exists()) {
          setLatestVersion(snap.data().versionName || "-");
        } else {
          setLatestVersion("-");
        }
      },
      () => setLatestVersion("-")
    );

    return () => {
      unsubUsers();
      unsubTablets();
      unsubRooms();
      unsubUpdate();
    };
  }, []);

  const cards = buildUserCards(users, registered, pairs, rooms);
  const disconnectCount = cards.filter((card) => card.adminBlocked).length;
  const connectedCount = cards.filter((card) => card.connected && !card.adminBlocked).length;

  return (
    <div>
      <div className="dashboard dashboard-home">
        <StatCard
          tone="users"
          label="Users"
          value={countsReady ? users.length : "..."}
          description="Registered users"
          onClick={() => onNavigate?.("users")}
          icon={<Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="3" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>}
        />
        <StatCard
          tone="disconnect"
          label="Disconnect"
          value={countsReady ? disconnectCount : "..."}
          description="Users disconnected"
          onClick={() => onNavigate?.("users")}
          icon={<Icon><circle cx="12" cy="12" r="9" /><path d="M8 8l8 8" /></Icon>}
        />
        <StatCard
          tone="connected"
          label="Connected"
          value={countsReady ? connectedCount : "..."}
          description="Users with tablets connected"
          onClick={() => onNavigate?.("tablets")}
          icon={<Icon><path d="M20 6 9 17l-5-5" /></Icon>}
        />
        <StatCard
          tone="languages"
          label="Languages"
          value={loadingLanguages ? "..." : languageCount}
          description="Managed languages"
          onClick={() => onNavigate?.("languages")}
          icon={<Icon><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18" /><path d="M12 3a14 14 0 0 0 0 18" /></Icon>}
        />
        <StatCard
          tone="tablets"
          label="Tablets Online"
          value={loadingTablets ? "..." : tabletStats.online}
          description={loadingTablets ? "Loading..." : `${tabletStats.offline} offline · ${tabletStats.total} total`}
          onClick={() => onNavigate?.("tablets")}
          icon={<Icon><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10 18h4" /></Icon>}
        />
        <StatCard
          tone="version"
          label="App Version"
          value={latestVersion}
          description="Latest published APK"
          onClick={() => onNavigate?.("app-updates")}
          icon={<Icon><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></Icon>}
        />
      </div>
    </div>
  );
}

export default Dashboard;
