import { useEffect, useState } from "react";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

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
    const unsubRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        let online = 0;
        snapshot.docs.forEach((docSnap) => {
          if (docSnap.data().isOnline === true) online += 1;
        });
        setTabletStats({
          total: snapshot.size,
          online,
          offline: snapshot.size - online,
        });
        setLoadingTablets(false);
      },
      (error) => {
        console.error("Failed to load tablet stats:", error);
        setTabletStats({ total: 0, online: 0, offline: 0 });
        setLoadingTablets(false);
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
      unsubRooms();
      unsubUpdate();
    };
  }, []);

  return (
    <div>
      <div className="dashboard">
        <button
          type="button"
          className="stat-card stat-card-button"
          onClick={() => onNavigate?.("languages")}
        >
          <span className="stat-label">Languages</span>
          <strong>{loadingLanguages ? "..." : languageCount}</strong>
          <span className="stat-description">Managed languages</span>
        </button>

        <button
          type="button"
          className="stat-card stat-card-button"
          onClick={() => onNavigate?.("tablets")}
        >
          <span className="stat-label">Tablets Online</span>
          <strong>{loadingTablets ? "..." : tabletStats.online}</strong>
          <span className="stat-description">
            {loadingTablets
              ? "Loading..."
              : `${tabletStats.offline} offline · ${tabletStats.total} total`}
          </span>
        </button>

        <button
          type="button"
          className="stat-card stat-card-button"
          onClick={() => onNavigate?.("app-updates")}
        >
          <span className="stat-label">App Version</span>
          <strong>{latestVersion}</strong>
          <span className="stat-description">Latest published APK</span>
        </button>
      </div>

      <div className="welcome-card">
        <h2>Talk Navi Administration</h2>
        <p>
          Use the sidebar to manage tablets, languages, app updates, and
          emergency content.
        </p>
        <ul className="dashboard-links">
          <li>
            <button type="button" onClick={() => onNavigate?.("tablets")}>
              View tablets
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onNavigate?.("app-updates")}>
              Publish app update
            </button>
          </li>
          <li>
            <button type="button" onClick={() => onNavigate?.("emergency")}>
              Edit emergency content
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
