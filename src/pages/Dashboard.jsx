import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
<<<<<<< HEAD
  onSnapshot,
=======
  doc,
  getDoc,
>>>>>>> 5b495f2 (updates)
} from "firebase/firestore";

import { db } from "../firebase";

function Dashboard() {
  const [languageCount, setLanguageCount] = useState(0);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
<<<<<<< HEAD

  const [tabletStats, setTabletStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
  });
  const [loadingTablets, setLoadingTablets] = useState(true);
=======
  const [latestVersion, setLatestVersion] = useState("No version");
  const [loadingVersion, setLoadingVersion] = useState(true);

  // =========================================================
  // LOAD LANGUAGES
  // =========================================================
>>>>>>> 5b495f2 (updates)

  const loadLanguageCount = async () => {
    try {
      setLoadingLanguages(true);

      const snapshot = await getDocs(collection(db, "languages"));
      setLanguageCount(snapshot.size);
    } catch (error) {
      console.error("Failed to load language count:", error);
      setLanguageCount(0);
    } finally {
      setLoadingLanguages(false);
    }
  };

<<<<<<< HEAD
  useEffect(() => {
    loadLanguageCount();
  }, []);
=======
// =========================================================
// LOAD APP VERSION
// =========================================================

const loadLatestVersion = async () => {
  try {
    setLoadingVersion(true);

    const snapshot = await getDoc(
      doc(db, "app_updates", "latest")
    );

    if (snapshot.exists()) {
      setLatestVersion(snapshot.data().versionName);
    } else {
      setLatestVersion("No version");
    }
  } catch (error) {
    console.error("Failed to load app version:", error);
    setLatestVersion("No version");
  } finally {
    setLoadingVersion(false);
  }
};
  // =========================================================
  // LOAD WHEN DASHBOARD OPENS
  // =========================================================

  useEffect(() => {
  loadLanguageCount();
  loadLatestVersion();
}, []);
>>>>>>> 5b495f2 (updates)

  useEffect(() => {
    const unsubscribe = onSnapshot(
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

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome to Talk Navi Admin Panel</p>
        </div>
      </div>

      <div className="dashboard">
        <div className="stat-card">
          <span className="stat-label">Languages</span>
          <strong>{loadingLanguages ? "..." : languageCount}</strong>
          <span className="stat-description">Total languages</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Tablets Online</span>
          <strong>{loadingTablets ? "..." : tabletStats.online}</strong>
          <span className="stat-description">
            {loadingTablets
              ? "Loading..."
              : `${tabletStats.offline} offline / ${tabletStats.total} total`}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">AI Help</span>
          <strong>Active</strong>
          <span className="stat-description">Spot Navigation</span>
        </div>
<<<<<<< HEAD
=======
{/* ===================================================
    APP UPDATE
=================================================== */}

<div className="stat-card">

  <span className="stat-label">
    App Version
  </span>

  <strong>
    {loadingVersion ? "..." : latestVersion}
  </strong>

  <span className="stat-description">
    Latest published APK
  </span>

</div>

>>>>>>> 5b495f2 (updates)
      </div>

      <div className="welcome-card">
        <h2>Talk Navi Administration</h2>
        <p>
          Manage languages, tablets and AI Help configuration from this
          dashboard.
        </p>
        <p>Select an option from the sidebar to continue.</p>
      </div>
    </div>
  );
}

export default Dashboard;
