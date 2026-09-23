import { useState, useEffect } from "react";
import "./AppUpdates.css";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { db, storage } from "../firebase";

export default function AppUpdates() {
  const [apkFile, setApkFile] = useState(null);

  const [versionName, setVersionName] = useState("1.0.2");
  const [versionCode, setVersionCode] = useState("2");

  const [releaseNotes, setReleaseNotes] = useState("");
  const [forceUpdate, setForceUpdate] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // Dashboard states
  const [currentVersion, setCurrentVersion] = useState("-");
  const [lastPublished, setLastPublished] = useState("-");
  const [apkSize, setApkSize] = useState("-");
  const [connectedDevices] = useState(6);

  const [devices, setDevices] = useState([]);

  // Load latest published update from Firestore
  useEffect(() => {
    loadLatestUpdate();
  }, []);

  const loadLatestUpdate = async () => {
    try {
      const snap = await getDoc(doc(db, "app_updates", "latest"));

      if (snap.exists()) {
        const data = snap.data();

        setCurrentVersion(data.versionName || "-");

        if (data.versionName) setVersionName(data.versionName);
        if (data.versionCode) setVersionCode(data.versionCode.toString());

        if (data.apkSize) {
          setApkSize(data.apkSize);
        }

        if (data.publishedAt?.toDate) {
          const date = data.publishedAt.toDate();

          setLastPublished(
            date.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          );
        }
      }
    } catch (error) {
      console.error("Failed to load update info:", error);
    }
  };

useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "rooms"), (snapshot) => {
    const list = [];

    snapshot.docs.forEach((roomDoc, index) => {
      const room = roomDoc.data();
      const roomNumber = index + 1;

      if (room.mainOnline === true) {
        list.push({
          id: `${roomDoc.id}_main`,
          name: `Main Tablet ${roomNumber}`,
          online: true,
          version: currentVersion,
        });
      }

      if (room.guestOnline === true) {
        list.push({
          id: `${roomDoc.id}_guest`,
          name: `Guest Tablet ${roomNumber}`,
          online: true,
          version: currentVersion,
        });
      }
    });

    setDevices(list);
  });

  return () => unsubscribe();
}, [currentVersion]);
  const publishUpdate = async () => {
    if (!apkFile) {
      alert("Please select an APK file.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const fileName = `TalkNavi_v${versionName}.apk`;

      const storageRef = ref(storage, `app_updates/${fileName}`);

      // Upload APK
      await uploadBytes(storageRef, apkFile);

      // Get Download URL
      const apkUrl = await getDownloadURL(storageRef);

      // APK size
      const apkSizeMB = (apkFile.size / (1024 * 1024)).toFixed(2);

      // Save metadata
      await setDoc(doc(db, "app_updates", "latest"), {
        versionName,
        versionCode: Number(versionCode),
        apkUrl,
        releaseNotes,
        forceUpdate,
        apkSize: `${apkSizeMB} MB`,
        publishedAt: serverTimestamp(),
        status: "published",
      });

      // Refresh UI instantly
      setCurrentVersion(versionName);
      setApkSize(`${apkSizeMB} MB`);

      setLastPublished(
        new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );

      setMessage("✅ Update published successfully!");
      alert("Update published successfully.");

      setApkFile(null);
    } catch (error) {
      console.error(error);
      setMessage("❌ Upload failed.");
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="updates-page">

      {/* Header */}
      <div className="updates-header">
        <div>
          <h1>📲 Talk Navi App Updates</h1>
          <p>Publish new versions to all connected tablets instantly.</p>
        </div>

        <button
          className="publish-btn"
          onClick={publishUpdate}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "🚀 Publish Update"}
        </button>
      </div>

      {message && (
        <div
          style={{
            marginBottom: "20px",
            color: message.includes("✅") ? "#16a34a" : "#dc2626",
            fontWeight: "bold",
          }}
        >
          {message}
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="stats-grid">

        <div className="status-card blue">
          <span>Current Version</span>
          <h2>{currentVersion}</h2>
        </div>

        <div className="status-card green">
          <span>Connected Tablets</span>
          <h2>
  {devices.filter((d) => d.online).length} / {devices.length}
</h2>
        </div>

        <div className="status-card orange">
          <span>Last Published</span>
          <h2>{lastPublished}</h2>
        </div>

        <div className="status-card purple">
          <span>Storage</span>
          <h2>{apkSize}</h2>
        </div>

      </div>

      {/* Upload APK */}
      <div className="upload-card">

        <h3>Upload New APK</h3>

        <div className="drop-area">

          <div className="upload-icon">⬆️</div>

          <p>Drag & Drop APK here</p>

          <small>or click below to browse</small>

          <input
            type="file"
            accept=".apk"
            onChange={(e) => setApkFile(e.target.files[0])}
          />

          {apkFile && (
            <div className="selected-file">
              ✅ {apkFile.name}
            </div>
          )}

        </div>

        <div className="version-grid">

          <input
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="Version Name (1.0.2)"
          />

          <input
            type="number"
            value={versionCode}
            onChange={(e) => setVersionCode(e.target.value)}
            placeholder="Version Code (2)"
          />

        </div>

      </div>

      {/* Release Notes */}
      <div className="release-card">

        <h3>Release Notes</h3>

        <textarea
          rows="5"
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          placeholder="Describe what's new in this update..."
        />

        <div className="release-footer">

          <label className="switch">

            <input
              type="checkbox"
              checked={forceUpdate}
              onChange={() => setForceUpdate(!forceUpdate)}
            />

            <span className="slider"></span>

          </label>

          <span>Force Update on all tablets</span>

        </div>

      </div>

      {/* Connected Tablets */}
      <div className="devices-card">

        <div className="devices-header">
  <h3>Connected Tablets</h3>

  <span className="online-chip">
    ● {devices.filter((d) => d.online).length} of {devices.length} Devices Online
  </span>
</div>

        {devices.map((device) => (
          <div className="device-row" key={device.id}>

            <div className="device-left">

              <div className="tablet-icon">📱</div>

              <div>
                <strong>{device.name}</strong>
                <p>Version {currentVersion}</p>
              </div>

            </div>

            <span className={device.online ? "status-online" : "status-offline"}>
  {device.online ? "Online" : "Offline"}
</span>

          </div>
        ))}

      </div>

    </div>
  );
}