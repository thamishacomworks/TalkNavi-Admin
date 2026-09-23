import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { db, storage } from "../firebase";


function Languages() {

  // =========================================================
  // LANGUAGES
  // =========================================================

  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);


  // =========================================================
  // ADD LANGUAGE
  // =========================================================

  const [showAddForm, setShowAddForm] = useState(false);

  const [name, setName] = useState("");
  const [nativeName, setNativeName] = useState("");
  const [code, setCode] = useState("");
  const [speechCode, setSpeechCode] = useState("");

  const [flagFile, setFlagFile] = useState(null);
  const [flagPreview, setFlagPreview] = useState("");


  // =========================================================
  // EDIT LANGUAGE
  // =========================================================

  const [editingLanguage, setEditingLanguage] = useState(null);

  const [editName, setEditName] = useState("");
  const [editNativeName, setEditNativeName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editSpeechCode, setEditSpeechCode] = useState("");

  const [editFlagFile, setEditFlagFile] = useState(null);
  const [editFlagPreview, setEditFlagPreview] = useState("");


  // =========================================================
  // LOAD LANGUAGES
  // =========================================================

  const loadLanguages = async () => {

    try {

      setLoading(true);

      console.log("Loading languages...");

      const snapshot = await getDocs(
        collection(db, "languages")
      );

      console.log(
        "Languages found:",
        snapshot.size
      );

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      console.log(
        "Languages data:",
        data
      );

      setLanguages(data);

    } catch (error) {

      console.error(
        "Failed to load languages:",
        error
      );

      alert(
        "Failed to load languages: " +
        error.message
      );

    } finally {

      setLoading(false);

    }
  };


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    loadLanguages();

  }, []);


  // =========================================================
  // SCROLL TO EDIT FORM
  // =========================================================

  useEffect(() => {

    if (!editingLanguage) {
      return;
    }

    setTimeout(() => {

      const form =
        document.getElementById(
          "edit-language-form"
        );

      if (form) {

        form.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

      }

    }, 150);

  }, [editingLanguage]);


  // =========================================================
  // ADD FLAG CHANGE
  // =========================================================

  const handleFlagChange = (e) => {

    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {

      alert(
        "Please select an image file."
      );

      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {

      alert(
        "Flag image must be smaller than 2 MB."
      );

      return;
    }

    setFlagFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setFlagPreview(previewUrl);
  };


  // =========================================================
  // RESET ADD FORM
  // =========================================================

  const resetForm = () => {

    setName("");
    setNativeName("");
    setCode("");
    setSpeechCode("");

    setFlagFile(null);
    setFlagPreview("");

    setShowAddForm(false);
  };


  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditLanguage = (language) => {

    console.log(
      "EDIT CLICKED:",
      language
    );

    setEditingLanguage(language);

    setEditName(
      language.name || ""
    );

    setEditNativeName(
      language.nativeName || ""
    );

    setEditCode(
      language.code || ""
    );

    setEditSpeechCode(
      language.speechCode || ""
    );

    setEditFlagFile(null);

    setEditFlagPreview(
      language.flagUrl || ""
    );
  };


  // =========================================================
  // EDIT FLAG CHANGE
  // =========================================================

  const handleEditFlagChange = (e) => {

    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {

      alert(
        "Please select an image file."
      );

      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {

      alert(
        "Flag image must be smaller than 2 MB."
      );

      return;
    }

    setEditFlagFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setEditFlagPreview(previewUrl);
  };


  // =========================================================
  // CANCEL EDIT
  // =========================================================

  const cancelEdit = () => {

    setEditingLanguage(null);

    setEditName("");
    setEditNativeName("");
    setEditCode("");
    setEditSpeechCode("");

    setEditFlagFile(null);
    setEditFlagPreview("");
  };


  // =========================================================
  // ADD LANGUAGE
  // =========================================================

  const addLanguage = async (e) => {

    e.preventDefault();

    const cleanCode =
      code.toLowerCase().trim();

    if (
      !name.trim() ||
      !nativeName.trim() ||
      !cleanCode ||
      !speechCode.trim()
    ) {

      alert(
        "Please fill all fields."
      );

      return;
    }

    if (!flagFile) {

      alert(
        "Please select a flag image."
      );

      return;
    }

    try {

      // -------------------------------------------------------
      // Upload flag
      // -------------------------------------------------------

      const flagStorageRef = ref(
        storage,
        `language_flags/${cleanCode}_${Date.now()}_${flagFile.name}`
      );

      const uploadResult =
        await uploadBytes(
          flagStorageRef,
          flagFile
        );

      const flagUrl =
        await getDownloadURL(
          uploadResult.ref
        );


      // -------------------------------------------------------
      // Save Firestore
      // -------------------------------------------------------

      await setDoc(
        doc(
          db,
          "languages",
          cleanCode
        ),
        {
          name: name.trim(),

          nativeName:
            nativeName.trim(),

          code: cleanCode,

          speechCode:
            speechCode.trim(),

          flagUrl: flagUrl,

          enabled: true,

          createdAt: new Date(),
        }
      );


      alert(
        `${name} added successfully.`
      );


      resetForm();

      await loadLanguages();

    } catch (error) {

      console.error(
        "Failed to add language:",
        error
      );

      alert(
        "Failed to add language:\n" +
        error.message
      );
    }
  };


  // =========================================================
  // UPDATE LANGUAGE
  // =========================================================

  const handleUpdateLanguage = async (e) => {

    e.preventDefault();

    if (!editingLanguage) {
      return;
    }

    const cleanCode =
      editCode.toLowerCase().trim();

    if (
      !editName.trim() ||
      !editNativeName.trim() ||
      !cleanCode ||
      !editSpeechCode.trim()
    ) {

      alert(
        "Please fill all fields."
      );

      return;
    }

    try {

      let flagUrl =
        editingLanguage.flagUrl || "";


      // -------------------------------------------------------
      // Upload new flag ONLY if selected
      // -------------------------------------------------------

      if (editFlagFile) {

        console.log(
          "Uploading new flag..."
        );

        const flagStorageRef =
          ref(
            storage,
            `language_flags/${cleanCode}_${Date.now()}_${editFlagFile.name}`
          );

        const uploadResult =
          await uploadBytes(
            flagStorageRef,
            editFlagFile
          );

        flagUrl =
          await getDownloadURL(
            uploadResult.ref
          );

        console.log(
          "New flag uploaded:",
          flagUrl
        );
      }


      // -------------------------------------------------------
      // Update Firestore
      // -------------------------------------------------------

      console.log(
        "Updating Firestore document:",
        editingLanguage.id
      );

     await updateDoc(
  doc(db, "languages", cleanCode),
  {
    name: editName.trim(),
    nativeName: editNativeName.trim(),
    code: cleanCode,
    speechCode: editSpeechCode.trim(),
    flagUrl: flagUrl,
  }
);


      alert(
        `${editName} updated successfully.`
      );


      cancelEdit();

      await loadLanguages();

    } catch (error) {

      console.error(
        "Failed to update language:",
        error
      );

      alert(
        "Failed to update language:\n" +
        error.message
      );
    }
  };


  // =========================================================
  // DELETE LANGUAGE
  // =========================================================

  const handleDeleteLanguage = async (
    language
  ) => {

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${language.name}?`
      );

    if (!confirmed) {
      return;
    }

    try {

      // -------------------------------------------------------
      // Delete Firestore document
      // -------------------------------------------------------

      await deleteDoc(
        doc(
          db,
          "languages",
          language.id
        )
      );


      // -------------------------------------------------------
      // Delete flag from Storage
      // -------------------------------------------------------

      if (language.flagUrl) {

        try {

          const url =
            new URL(
              language.flagUrl
            );

          const encodedPath =
            url.pathname
              .split("/o/")[1]
              ?.split("?")[0];

          if (encodedPath) {

            const path =
              decodeURIComponent(
                encodedPath
              );

            const flagRef =
              ref(
                storage,
                path
              );

            await deleteObject(
              flagRef
            );
          }

        } catch (storageError) {

          console.warn(
            "Could not delete flag:",
            storageError
          );
        }
      }


      setLanguages(
        (currentLanguages) =>
          currentLanguages.filter(
            (item) =>
              item.id !== language.id
          )
      );


      alert(
        `${language.name} deleted successfully.`
      );

    } catch (error) {

      console.error(
        "Delete language error:",
        error
      );

      alert(
        "Failed to delete language:\n" +
        error.message
      );
    }
  };


  // =========================================================
  // ENABLE / DISABLE
  // =========================================================

  const toggleLanguage = async (
    language
  ) => {

    try {

      await updateDoc(
        doc(
          db,
          "languages",
          language.id
        ),
        {
          enabled:
            !language.enabled,
        }
      );

      await loadLanguages();

    } catch (error) {

      console.error(
        "Failed to update language:",
        error
      );

      alert(
        "Failed to update language:\n" +
        error.message
      );
    }
  };


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
            Language Management
          </h1>

          <p>
            Manage languages available
            in Talk Bridge.
          </p>

        </div>


        <button
          type="button"
          className="add-button"
          onClick={() =>
            setShowAddForm(true)
          }
        >
          + Add Language
        </button>

      </div>


      {/* =====================================================
          ADD FORM
      ====================================================== */}

      {showAddForm && (

        <div className="language-card">

          <h2>
            Add New Language
          </h2>


          <form
            onSubmit={addLanguage}
          >

            {/* NAME */}

            <div className="form-group">

              <label>
                Language Name
              </label>

              <input
                type="text"
                placeholder="French"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
              />

            </div>


            {/* NATIVE NAME */}

            <div className="form-group">

              <label>
                Native Name
              </label>

              <input
                type="text"
                placeholder="Français"
                value={nativeName}
                onChange={(e) =>
                  setNativeName(
                    e.target.value
                  )
                }
              />

            </div>


            {/* CODE */}

            <div className="form-group">

              <label>
                Language Code
              </label>

              <input
                type="text"
                placeholder="fr"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                  )
                }
              />

            </div>


            {/* SPEECH CODE */}

            <div className="form-group">

              <label>
                Speech Code
              </label>

              <input
                type="text"
                placeholder="fr-FR"
                value={speechCode}
                onChange={(e) =>
                  setSpeechCode(
                    e.target.value
                  )
                }
              />

            </div>


            {/* FLAG */}

            <div className="form-group">

              <label>
                Language Flag
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={
                  handleFlagChange
                }
              />


              {flagPreview && (

                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >

                  <img
                    src={flagPreview}
                    alt="Flag preview"
                    style={{
                      width: "64px",
                      height: "44px",
                      objectFit: "cover",
                      borderRadius: "6px",
                      border:
                        "1px solid #ddd",
                    }}
                  />

                  <span>
                    {flagFile?.name}
                  </span>

                </div>

              )}

            </div>


            {/* SAVE */}

            <button
              type="submit"
              className="add-button"
            >
              Save Language
            </button>


            {/* CANCEL */}

            <button
              type="button"
              className="edit-button"
              onClick={resetForm}
            >
              Cancel
            </button>

          </form>

        </div>

      )}


      {/* =====================================================
          EDIT FORM
      ====================================================== */}

      {editingLanguage && (

        <div
          id="edit-language-form"
          className="language-card"
          style={{
            marginTop: "20px",
          }}
        >

          <h2>
            Edit Language
          </h2>


          <form
            onSubmit={
              handleUpdateLanguage
            }
          >

            {/* NAME */}

            <div className="form-group">

              <label>
                Language Name
              </label>

              <input
                type="text"
                value={editName}
                onChange={(e) =>
                  setEditName(
                    e.target.value
                  )
                }
              />

            </div>


            {/* NATIVE NAME */}

            <div className="form-group">

              <label>
                Native Name
              </label>

              <input
                type="text"
                value={editNativeName}
                onChange={(e) =>
                  setEditNativeName(
                    e.target.value
                  )
                }
              />

            </div>


            {/* CODE */}

            <div className="form-group">

              <label>
                Language Code
              </label>

              <input
                type="text"
                value={editCode}
                onChange={(e) =>
                  setEditCode(
                    e.target.value
                  )
                }
              />

            </div>


            {/* SPEECH CODE */}

            <div className="form-group">

              <label>
                Speech Code
              </label>

              <input
                type="text"
                value={editSpeechCode}
                onChange={(e) =>
                  setEditSpeechCode(
                    e.target.value
                  )
                }
              />

            </div>


            {/* FLAG */}

            <div className="form-group">

              <label>
                Language Flag
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={
                  handleEditFlagChange
                }
              />


              {editFlagPreview && (

                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >

                  <img
                    src={
                      editFlagPreview
                    }
                    alt="Language flag"
                    style={{
                      width: "64px",
                      height: "44px",
                      objectFit: "cover",
                      borderRadius: "6px",
                      border:
                        "1px solid #ddd",
                    }}
                  />


                  {editFlagFile && (

                    <span>
                      {editFlagFile.name}
                    </span>

                  )}

                </div>

              )}

            </div>


            {/* UPDATE */}

            <button
              type="submit"
              className="add-button"
            >
              Update Language
            </button>


            {/* CANCEL */}

            <button
              type="button"
              className="edit-button"
              onClick={cancelEdit}
            >
              Cancel
            </button>

          </form>

        </div>

      )}


      {/* =====================================================
          LANGUAGE TABLE
      ====================================================== */}

      <div className="language-card">

        <div className="language-table-header">

          <span>
            Language
          </span>

          <span>
            Code
          </span>

          <span>
            Speech Code
          </span>

          <span>
            Status
          </span>

          <span>
            Action
          </span>

        </div>


        {/* LOADING */}

        {loading && (

          <div className="language-row">

            <span>
              Loading languages...
            </span>

          </div>

        )}


        {/* LANGUAGES */}

        {!loading &&
          languages.map(
            (language) => (

              <div
                className="language-row"
                key={language.id}
              >

                {/* LANGUAGE */}

                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >

                  {language.flagUrl && (

                    <img
                      src={
                        language.flagUrl
                      }
                      alt={`${language.name} flag`}
                      style={{
                        width: "36px",
                        height: "25px",
                        objectFit: "cover",
                        borderRadius: "4px",
                        border:
                          "1px solid #ddd",
                      }}
                    />

                  )}

                  {language.nativeName ||
                    language.name}

                </span>


                {/* CODE */}

                <span>
                  {language.code}
                </span>


                {/* SPEECH CODE */}

                <span>
                  {language.speechCode}
                </span>


                {/* STATUS */}

                <span
                  className={
                    language.enabled
                      ? "status-active"
                      : "status-disabled"
                  }
                >
                  {language.enabled
                    ? "Active"
                    : "Disabled"}
                </span>


                {/* ACTIONS */}

                <div
                  className="language-actions"
                >

                  {/* EDIT */}

                  <button
                    type="button"
                    className="edit-button"
                    onClick={() =>
                      openEditLanguage(
                        language
                      )
                    }
                  >
                    Edit
                  </button>


                  {/* ENABLE / DISABLE */}

                  <button
                    type="button"
                    className="edit-button"
                    onClick={() =>
                      toggleLanguage(
                        language
                      )
                    }
                  >
                    {language.enabled
                      ? "Disable"
                      : "Enable"}
                  </button>


                  {/* DELETE */}

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() =>
                      handleDeleteLanguage(
                        language
                      )
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            )
          )}


        {/* NO LANGUAGES */}

        {!loading &&
          languages.length === 0 && (

            <div className="language-row">

              <span>
                No languages found.
              </span>

            </div>

          )}

      </div>

    </div>
  );
}


export default Languages;