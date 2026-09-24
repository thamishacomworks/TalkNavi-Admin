import { useEffect, useState } from "react";
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
  const [versionName, setVersionName] = useState("1.0.0");
  const [versionCode, setVersionCode] = useState("1");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [forceUpdate, setForceUpdate] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [currentVersion, setCurrentVersion] = useState("-");
  const [lastPublished, setLastPublished] = useState("-");
  const [apkSize, setApkSize] = useState("-");
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    loadLatestUpdate();
  }, []);

  const loadLatestUpdate = async () => {
    try {
      const snap = await getDoc(doc(db, "app_updates", "latest"));
      if (!snap.exists()) return;

      const data = snap.data();
      setCurrentVersion(data.versionName || "-");
      if (data.versionName) setVersionName(data.versionName);
      if (data.versionCode != null) setVersionCode(String(data.versionCode));
      if (data.apkSize) setApkSize(data.apkSize);
      if (data.releaseNotes) setReleaseNotes(data.releaseNotes);
      if (typeof data.forceUpdate === "boolean") setForceUpdate(data.forceUpdate);

      if (data.publishedAt?.toDate) {
        setLastPublished(
          data.publishedAt.toDate().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        );
      }
    } catch (error) {
      console.error("Failed to load update info:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "rooms"), (snapshot) => {
      const list = snapshot.docs.map((roomDoc) => {
        const room = roomDoc.data();
        return {
          id: roomDoc.id,
          name: room.deviceName || room.ownerName || "Unknown tablet",
          online: room.isOnline === true,
          active: room.active === true,
        };
      });

      list.sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return String(a.name).localeCompare(String(b.name));
      });

      setDevices(list);
    });

    return () => unsubscribe();
  }, []);

  const publishUpdate = async () => {
    if (!apkFile) {
      alert("Please select an APK file.");
      return;
    }

    if (!versionName.trim() || !versionCode.trim()) {
      alert("Please enter version name and version code.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const fileName = `TalkNavi_v${versionName.trim()}.apk`;
      const storageRef = ref(storage, `app_updates/${fileName}`);

      await uploadBytes(storageRef, apkFile);
      const apkUrl = await getDownloadURL(storageRef);
      const apkSizeMB = (apkFile.size / (1024 * 1024)).toFixed(2);

      await setDoc(doc(db, "app_updates", "latest"), {
        versionName: versionName.trim(),
        versionCode: Number(versionCode),
        apkUrl,
        releaseNotes,
        forceUpdate,
        apkSize: `${apkSizeMB} MB`,
        publishedAt: serverTimestamp(),
        status: "published",
      });

      setCurrentVersion(versionName.trim());
      setApkSize(`${apkSizeMB} MB`);
      setLastPublished(
        new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );

      setMessage("Update published successfully.");
      setApkFile(null);
    } catch (error) {
      console.error(error);
      setMessage("Upload failed. Check Firebase Storage rules and try again.");
    } finally {
      setUploading(false);
    }
  };

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div className="updates-page">
      <div className="updates-toolbar">
        <p className="updates-hint">
          Upload an APK whose <strong>versionCode</strong> in{" "}
          <code>build.gradle</code> is the same as (or higher than) the
          Version Code you enter below. If the APK version is lower, tablets
          will keep asking to update after install.
        </p>
        <button
          type="button"
          className="publish-btn"
          onClick={publishUpdate}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Publish Update"}
        </button>
      </div>

      {message && (
        <div
          className={
            message.toLowerCase().includes("fail")
              ? "updates-message error"
              : "updates-message success"
          }
        >
          {message}
        </div>
      )}

      <div className="stats-grid">
        <div className="status-card blue">
          <span>Current Version</span>
          <h2>{currentVersion}</h2>
        </div>
        <div className="status-card green">
          <span>Tablets Online</span>
          <h2>
            {onlineCount} / {devices.length}
          </h2>
        </div>
        <div className="status-card orange">
          <span>Last Published</span>
          <h2>{lastPublished}</h2>
        </div>
        <div className="status-card purple">
          <span>APK Size</span>
          <h2>{apkSize}</h2>
        </div>
      </div>

      <div className="upload-card">
        <h3>Upload New APK</h3>
        <div className="drop-area">
          <p>Select an APK file</p>
          <input
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={(e) => setApkFile(e.target.files?.[0] || null)}
          />
          {apkFile && (
            <div className="selected-file">Selected: {apkFile.name}</div>
          )}
        </div>

        <div className="version-grid">
          <input
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="Version Name (e.g. 1.0.3)"
          />
          <input
            type="number"
            value={versionCode}
            onChange={(e) => setVersionCode(e.target.value)}
            placeholder="Version Code (e.g. 3)"
          />
        </div>
      </div>

      <div className="release-card">
        <h3>Release Notes</h3>
        <textarea
          rows="5"
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          placeholder="Describe what's new in this update..."
        />
        <div className="release-footer">
          <label className="force-update-label">
            <input
              type="checkbox"
              checked={forceUpdate}
              onChange={() => setForceUpdate(!forceUpdate)}
            />
            Force update on all tablets
          </label>
        </div>
      </div>

      <div className="devices-card">
        <div className="devices-header">
          <h3>Tablets</h3>
          <span className="online-chip">
            {onlineCount} of {devices.length} online
          </span>
        </div>

        {devices.length === 0 && (
          <div className="devices-empty">No tablets registered yet.</div>
        )}

        {devices.map((device) => (
          <div className="device-row" key={device.id}>
            <div className="device-left">
              <div>
                <strong>{device.name}</strong>
                <p>{device.active ? "Session connected" : "Waiting / idle"}</p>
              </div>
            </div>
            <span
              className={
                device.online
                  ? "update-status-online"
                  : "update-status-offline"
              }
            >
              {device.online ? "Online" : "Offline"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
