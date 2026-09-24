import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

export default function Emergency() {
  const [loading, setLoading] = useState(true);

  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");

  // Emergency
  const [emergencyTitle, setEmergencyTitle] = useState("");
  const [emergencyDescription, setEmergencyDescription] = useState("");

  // Contacts
  const [ambulanceTitle, setAmbulanceTitle] = useState("");
  const [policeTitle, setPoliceTitle] = useState("");
const [policeDescription, setPoliceDescription] = useState("");
  // Preview (Current Firestore Data)
  const [preview, setPreview] = useState({});

  useEffect(() => {
    loadLanguages();
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      loadEmergency(selectedLanguage);
    }
  }, [selectedLanguage]);

  // Load Languages
  async function loadLanguages() {
    try {
      const snap = await getDocs(collection(db, "languages"));

      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((lang) => lang.enabled !== false);

      setLanguages(list);

      if (list.length > 0) {
        setSelectedLanguage(list[0].code);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Load Emergency + Contacts
  async function loadEmergency(languageCode) {
    try {
      setLoading(true);

      const emergencySnap = await getDoc(
        doc(db, "ai_help", "emergency")
      );

      const ambulanceSnap = await getDoc(
        doc(db, "ai_help", "emergency", "contacts", "ambulance")
      );

      const policeSnap = await getDoc(
        doc(db, "ai_help", "emergency", "contacts", "police")
      );

      const emergencyData = emergencySnap.exists()
        ? emergencySnap.data()
        : {};

      const ambulanceData = ambulanceSnap.exists()
        ? ambulanceSnap.data()
        : {};

      const policeData = policeSnap.exists()
        ? policeSnap.data()
        : {};

      setEmergencyTitle(
        emergencyData[`title_${languageCode}`] || ""
      );

      setEmergencyDescription(
        emergencyData[`description_${languageCode}`] || ""
      );

      setAmbulanceTitle(
        ambulanceData[`title_${languageCode}`] || ""
      );

      setPoliceTitle(
        policeData[`title_${languageCode}`] || ""
      );
      setPoliceDescription(
        policeData[`description_${languageCode}`] || ""
      );

      // Preview all languages
      const previewData = {};

      languages.forEach((lang) => {
        previewData[lang.code] = {
          name: lang.name,
          title: emergencyData[`title_${lang.code}`] || "",
          description:
            emergencyData[`description_${lang.code}`] || "",
        };
      });

      setPreview(previewData);
    } catch (e) {
      console.error(e);
      alert("Failed to load Emergency data.");
    } finally {
      setLoading(false);
    }
  }

  // Save Emergency + Contacts
  async function saveEmergency() {
    try {
      await setDoc(
        doc(db, "ai_help", "emergency"),
        {
          [`title_${selectedLanguage}`]: emergencyTitle,
          [`description_${selectedLanguage}`]:
            emergencyDescription,
        },
        { merge: true }
      );

      await setDoc(
        doc(
          db,
          "ai_help",
          "emergency",
          "contacts",
          "ambulance"
        ),
        {
          number: "119",
          [`title_${selectedLanguage}`]: ambulanceTitle,
        },
        { merge: true }
      );

      await setDoc(
        doc(
          db,
          "ai_help",
          "emergency",
          "contacts",
          "police"
        ),
        {
          number: "110",
          [`title_${selectedLanguage}`]: policeTitle,
          [`description_${selectedLanguage}`]:
            policeDescription,
        },
        { merge: true }
      );

      alert("Emergency updated successfully.");

      loadEmergency(selectedLanguage);
    } catch (e) {
      console.error(e);
      alert("Failed to save Emergency.");
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {/* Current Firestore Data */}
      <div className="welcome-card">
        <h2>Current Firestore Data</h2>

        {languages.map((lang) => (
          <div className="preview-card" key={lang.code}>
            <strong>{lang.name}</strong>

            <p>
              <b>Title :</b>{" "}
              {preview[lang.code]?.title || "-"}
            </p>

            <p>
              <b>Description :</b>{" "}
              {preview[lang.code]?.description || "-"}
            </p>
          </div>
        ))}
      </div>

      {/* Edit Section */}
      <div
        className="welcome-card"
        style={{ marginTop: 20 }}
      >
        <h2>Edit Emergency</h2>

        <label>Select Language</label>

        <select
          className="input-field"
          value={selectedLanguage}
          onChange={(e) =>
            setSelectedLanguage(e.target.value)
          }
        >
          {languages.map((lang) => (
            <option
              key={lang.code}
              value={lang.code}
            >
              {lang.name}
            </option>
          ))}
        </select>

        <label>Emergency Title</label>

        <input
          className="input-field"
          value={emergencyTitle}
          onChange={(e) =>
            setEmergencyTitle(e.target.value)
          }
        />

        <label>Emergency Description</label>

        <textarea
          className="input-field"
          rows={4}
          value={emergencyDescription}
          onChange={(e) =>
            setEmergencyDescription(e.target.value)
          }
        />

        <hr />

        <h2>Emergency Contacts</h2>

        <div className="contact-card">
          <h3>🚑 Ambulance (119)</h3>

          <input
            className="input-field"
            placeholder="Ambulance Title"
            value={ambulanceTitle}
            onChange={(e) =>
              setAmbulanceTitle(e.target.value)
            }
          />
        </div>

        <div className="contact-card">
          <h3>👮 Police (110)</h3>

          <input
            className="input-field"
            placeholder="Police Title"
            value={policeTitle}
            onChange={(e) =>
              setPoliceTitle(e.target.value)
            }
          />
           <label>police Description</label>

        <textarea
          className="input-field"
          rows={4}
          value={policeDescription}
          onChange={(e) =>
            setPoliceDescription(e.target.value)
          }
        />
        </div>

        <button
          className="add-button"
          onClick={saveEmergency}
        >
          Save Emergency
        </button>
      </div>
    </div>
  );
}