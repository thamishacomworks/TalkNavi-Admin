import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebase";


function Dashboard() {

  const [languageCount, setLanguageCount] = useState(0);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [latestVersion, setLatestVersion] = useState("No version");
  const [loadingVersion, setLoadingVersion] = useState(true);

  // =========================================================
  // LOAD LANGUAGES
  // =========================================================

  const loadLanguageCount = async () => {
    try {

      setLoadingLanguages(true);

      const snapshot = await getDocs(
        collection(db, "languages")
      );

      setLanguageCount(snapshot.size);

      console.log(
        "Total languages:",
        snapshot.size
      );

    } catch (error) {

      console.error(
        "Failed to load language count:",
        error
      );

      setLanguageCount(0);

    } finally {

      setLoadingLanguages(false);

    }
  };

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


  // =========================================================
  // UI
  // =========================================================

  return (
    <div>

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="page-header">

        <div>

          <h1>
            Dashboard
          </h1>

          <p>
            Welcome to Talk Navi Admin Panel
          </p>

        </div>

      </div>


      {/* =====================================================
          STAT CARDS
      ====================================================== */}

      <div className="dashboard">


        {/* ===================================================
            LANGUAGES
        ==================================================== */}

        <div className="stat-card">

          <span className="stat-label">
            Languages
          </span>


          <strong>
            {loadingLanguages
              ? "..."
              : languageCount}
          </strong>


          <span className="stat-description">
            Total languages
          </span>

        </div>


        {/* ===================================================
            SPEAKERS
        ==================================================== */}

        <div className="stat-card">

          <span className="stat-label">
            Speakers
          </span>


          <strong>
            0
          </strong>


          <span className="stat-description">
            Registered speakers
          </span>

        </div>


        {/* ===================================================
            AI HELP
        ==================================================== */}

        <div className="stat-card">

          <span className="stat-label">
            AI Help
          </span>


          <strong>
            Active
          </strong>


          <span className="stat-description">
            Spot Navigation
          </span>

        </div>
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

      </div>


      {/* =====================================================
          WELCOME CARD
      ====================================================== */}

      <div className="welcome-card">

        <h2>
          Talk Navi Administration
        </h2>


        <p>
          Manage languages, speakers and AI Help
          configuration from this dashboard.
        </p>


        <p>
          Select an option from the sidebar to continue.
        </p>

      </div>

    </div>
  );
}


export default Dashboard;