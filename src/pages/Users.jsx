import { useCallback, useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { buildUserCards } from "../utils/tablets";
import "./Users.css";

const emptyUser = { name: "", address: "", email: "", phone: "" };
const fieldLabel = { name: "Name", address: "Address", email: "Email", phone: "Phone number" };
const emptyTablet = { deviceName: "", serialNumber: "" };
const serialKey = (value) => encodeURIComponent(value.trim().toUpperCase().replace(/[\s-]+/g, ""));
const describeError = (error) => error.code === "permission-denied"
  ? "Firestore access was denied. Check your database permissions."
  : "Could not save or load data. Check your connection and try again.";
const historyCollection = (userId) => collection(db, "users", userId, "connectionHistory");
const connectionStamp = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    createdAt: serverTimestamp(),
  };
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null);
  const [userForm, setUserForm] = useState(emptyUser);
  const [adding, setAdding] = useState(false);
  const [deviceUser, setDeviceUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [registered, setRegistered] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adding) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape" && !saving) setAdding(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding, saving]);

  useEffect(() => onSnapshot(collection(db, "users"), (snapshot) => {
    setUsers(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name))));
    setLoading(false);
    setError("");
  }, (err) => { setError(describeError(err)); setLoading(false); }), []);

  useEffect(() => onSnapshot(collection(db, "userTablets"), (snapshot) => {
    setRegistered(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })));
  }, () => setRegistered([])), []);

  useEffect(() => onSnapshot(collection(db, "rooms"), (snapshot) => {
    setRooms(snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        deviceName: data.deviceName || data.ownerName || "",
        adminBlocked: data.adminBlocked === true,
        adminBlockMessage: typeof data.adminBlockMessage === "string" ? data.adminBlockMessage : "",
      };
    }));
  }, () => setRooms([])), []);

  async function saveUser(event) {
    event.preventDefault();
    if (saving) return;
    const values = Object.fromEntries(Object.entries(userForm).map(([key, value]) => [key, value.trim()]));
    if (Object.values(values).some((value) => !value)) {
      setError("Complete all user details."); return;
    }
    setSaving(true); setError("");
    try {
      await addDoc(collection(db, "users"), { ...values, createdAt: serverTimestamp() });
      setUserForm(emptyUser);
      setAdding(false);
    } catch (err) { setError(describeError(err)); }
    finally { setSaving(false); }
  }

  function openAdd() {
    setUserForm(emptyUser);
    setError("");
    setAdding(true);
  }

  const closeDevice = useCallback(() => setDeviceUser(null), []);

  async function removeUser(user) {
    const ok = window.confirm(`Delete ${user.name}?\nTheir tablets will also be removed from Firebase.`);
    if (!ok || deletingId) return;
    setDeletingId(user.id); setError("");
    try {
      const [tablets, history] = await Promise.all([
        getDocs(query(collection(db, "userTablets"), where("userId", "==", user.id))),
        getDocs(historyCollection(user.id)),
      ]);
      await Promise.all([
        deleteDoc(doc(db, "users", user.id)),
        ...history.docs.map((item) => deleteDoc(item.ref)),
        ...tablets.docs.flatMap((item) => {
          const serial = item.data().serialNumber;
          const removals = [deleteDoc(item.ref)];
          if (serial) removals.push(deleteDoc(doc(db, "tabletSerials", serialKey(serial))));
          return removals;
        }),
      ]);
      if (panel?.id === user.id) setPanel(null);
      if (deviceUser?.id === user.id) setDeviceUser(null);
    } catch (err) { setError(describeError(err)); }
    finally { setDeletingId(""); }
  }

  const disconnectByUser = useMemo(() => {
    const cards = buildUserCards(users, registered, [], rooms);
    return new Map(cards.map((card) => [card.id, card]));
  }, [users, registered, rooms]);

  const selected = users.find((user) => user.id === panel?.id);
  const selectedLink = selected
    ? (disconnectByUser.get(selected.id) || { roomIds: [], adminBlocked: false })
    : null;
  return <div className="users-page">
    {error && !adding && <p role="alert" className="users-error">{error}</p>}
    {selected ? <section className="users-panel">
      <UserDetails
        key={`${selected.id}-${panel.mode}`}
        user={selected}
        mode={panel.mode}
        link={selectedLink}
        deleting={deletingId === selected.id}
        onBack={() => setPanel(null)}
        onEdit={() => setPanel({ id: selected.id, mode: "edit" })}
        onView={() => setPanel({ id: selected.id, mode: "view" })}
        onDelete={() => removeUser(selected)}
      />
    </section> : <>
      <div className="users-page-head">
        <button type="button" className="users-add" onClick={openAdd}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add User
        </button>
      </div>
      <section className="users-panel">
        {loading ? <p>Loading users...</p> : users.length === 0 ? <p>No users yet. Use Add User to add one.</p> :
          <ul className="users-directory">{users.map((user) => <li key={user.id}>
            <button type="button" className="users-name" onClick={() => setPanel({ id: user.id, mode: "view" })}>
              {user.name}
            </button>
            <div className="users-actions">
              <ActionIcon label="Add Tablet" onClick={() => setDeviceUser({ id: user.id, name: user.name })} disabled={deletingId === user.id}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10 18h4" /></svg>
              </ActionIcon>
            </div>
          </li>)}</ul>}
      </section>
    </>}
    {deviceUser && <AddDeviceModal user={deviceUser} onClose={closeDevice} />}
    {adding && <div className="users-modal" onClick={() => { if (!saving) setAdding(false); }}>
      <div className="users-modal-card" role="dialog" aria-modal="true" aria-labelledby="add-user-title"
        onClick={(event) => event.stopPropagation()}>
        <h2 id="add-user-title">Add User</h2>
        <form onSubmit={saveUser} className="users-form">
          <UserFields values={userForm} disabled={saving} autoFocus onChange={setUserForm} />
          {error && <p role="alert" className="users-error">{error}</p>}
          <div className="users-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save User"}</button>
            <button type="button" className="users-cancel" onClick={() => setAdding(false)} disabled={saving}>Cancel</button>
          </div>
        </form>
      </div>
    </div>}
  </div>;
}

function ActionIcon({ label, className = "", disabled, onClick, children }) {
  return <button type="button" className={`users-icon ${className}`.trim()} aria-label={label} disabled={disabled} onClick={onClick}>
    {children}
    <span className="users-tip" aria-hidden="true">{label}</span>
  </button>;
}

function UserDisconnect({ userId, roomIds, blocked }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function write(nextBlocked, warning) {
    if (roomIds.length === 0) {
      alert("These tablets have not opened the app yet.");
      return;
    }
    setBusy(true);
    try {
      await Promise.all(roomIds.map((roomId) => updateDoc(doc(db, "rooms", roomId), {
        adminBlocked: nextBlocked,
        adminBlockMessage: warning,
      })));
      await addDoc(historyCollection(userId), {
        userId,
        action: nextBlocked ? "disconnect" : "connect",
        reason: nextBlocked ? warning : "",
        ...connectionStamp(),
      });
      setText("");
    } catch (err) {
      alert("Failed to update the tablets.");
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    const warning = text.trim();
    if (!blocked && !warning) {
      alert("Type the warning message first.");
      return;
    }
    write(!blocked, warning);
  }

  return <div className="pair-disconnect">
    <textarea
      value={text}
      onChange={(event) => setText(event.target.value.slice(0, 200))}
      placeholder="Warning message shown on both tablets"
      aria-label="Warning message"
      rows={2}
      disabled={busy}
    />
    <button type="button" className={blocked ? "pair-connect" : "pair-disconnect-button"} onClick={toggle} disabled={busy}>
      {busy ? "Saving" : blocked ? "Connect" : "Disconnect"}
    </button>
  </div>;
}

function AddDeviceModal({ user, onClose }) {
  const [form, setForm] = useState(emptyTablet);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function saveTablet(event) {
    event.preventDefault();
    if (saving) return;
    const deviceName = form.deviceName.trim();
    const serialNumber = form.serialNumber.trim();
    const key = serialKey(serialNumber);
    if (!deviceName || !key) { setError("Enter device name and serial number."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const serialRef = doc(db, "tabletSerials", key);
      const tabletRef = doc(collection(db, "userTablets"));
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(serialRef);
        if (existing.exists()) throw new Error("duplicate-serial");
        transaction.set(tabletRef, { userId: user.id, deviceName, serialNumber, createdAt: serverTimestamp() });
        transaction.set(serialRef, { tabletId: tabletRef.id, userId: user.id });
      });
      setForm(emptyTablet);
      setMessage("Tablet added successfully.");
    } catch (err) {
      setError(err.message === "duplicate-serial" ? "This serial number is already used by a user." : describeError(err));
    } finally { setSaving(false); }
  }

  return <div className="users-modal" onClick={() => { if (!saving) onClose(); }}>
    <div className="users-modal-card" role="dialog" aria-modal="true" aria-labelledby="add-device-title"
      onClick={(event) => event.stopPropagation()}>
      <h2 id="add-device-title">Add Tablet</h2>
      <p className="users-note">Add a tablet for {user.name}. Each serial number can be added to only one user.</p>
      <form className="users-form" onSubmit={saveTablet}>
        <label>Device name<input required maxLength={200} autoFocus value={form.deviceName} disabled={saving}
          onChange={(event) => setForm({ ...form, deviceName: event.target.value })} /></label>
        <label>Serial number<input required maxLength={200} value={form.serialNumber} disabled={saving}
          onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} /></label>
        {error && <p role="alert" className="users-error">{error}</p>}
        {message && <p role="status">{message}</p>}
        <div className="users-actions">
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Tablet"}</button>
          <button type="button" className="users-cancel" onClick={onClose} disabled={saving}>Close</button>
        </div>
      </form>
    </div>
  </div>;
}

function UserFields({ values, disabled, autoFocus = false, onChange }) {
  return Object.keys(emptyUser).map((field) => <label key={field}>
    {fieldLabel[field]}
    <input required maxLength={field === "address" ? 500 : 200}
      type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
      value={values[field]} disabled={disabled} autoFocus={autoFocus && field === "name"}
      onChange={(event) => onChange({ ...values, [field]: event.target.value })} />
  </label>);
}

function UserDetails({ user, mode, link, deleting, onBack, onEdit, onView, onDelete }) {
  const [form, setForm] = useState({
    name: user.name || "",
    address: user.address || "",
    email: user.email || "",
    phone: user.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveEdit(event) {
    event.preventDefault();
    if (saving) return;
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    if (Object.values(values).some((value) => !value)) {
      setError("Complete all user details."); return;
    }
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "users", user.id), values);
      onView();
    } catch (err) { setError(describeError(err)); }
    finally { setSaving(false); }
  }

  return <>
    <div className="users-detail-head">
      <button type="button" className="users-back" onClick={onBack} disabled={saving || deleting}>Back</button>
      <h2>{mode === "edit" ? `Edit ${user.name}` : user.name}</h2>
      <div className="users-actions">
        {mode === "view" && <button type="button" onClick={onEdit} disabled={deleting}>Edit</button>}
        <button type="button" className="users-delete" onClick={onDelete} disabled={saving || deleting}>
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
    {error && <p role="alert" className="users-error">{error}</p>}
    {mode === "edit" ? <form onSubmit={saveEdit} className="users-form users-edit-form">
      <UserFields values={form} disabled={saving} autoFocus onChange={setForm} />
      <div className="users-actions">
        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        <button type="button" className="users-cancel" onClick={onView} disabled={saving}>Cancel</button>
      </div>
    </form> : <dl className="users-details">
      <dt>Address</dt><dd>{user.address}</dd>
      <dt>Email</dt><dd>{user.email}</dd>
      <dt>Phone</dt><dd>{user.phone}</dd>
    </dl>}
    <UserTablets userId={user.id} canManage={mode === "edit"} />
    <UserDisconnect userId={user.id} roomIds={link.roomIds} blocked={link.adminBlocked} />
    <ConnectionHistory userId={user.id} />
  </>;
}

function ConnectionHistory({ userId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => onSnapshot(historyCollection(userId), (snapshot) => {
    const list = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
    list.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.time).localeCompare(String(a.time)));
    setRows(list);
    setLoading(false);
  }, () => setLoading(false)), [userId]);

  return <div className="users-history">
    <button type="button" className="users-history-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      Connection history ({rows.length})
    </button>
    {open && (loading ? <p>Loading history...</p> : rows.length === 0 ? <p>No connection history yet.</p> :
      <div className="users-table-wrap"><table className="users-table">
        <thead><tr><th>Date</th><th>Time</th><th>Action</th><th>Reason</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <td>{row.date}</td>
          <td>{row.time}</td>
          <td>{row.action === "disconnect" ? "Disconnect" : "Connect"}</td>
          <td>{row.reason || "—"}</td>
        </tr>)}</tbody>
      </table></div>)}
  </div>;
}

function UserTablets({ userId, canManage }) {
  const [tablets, setTablets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(emptyTablet);
  const [rowBusy, setRowBusy] = useState("");

  useEffect(() => onSnapshot(query(collection(db, "userTablets"), where("userId", "==", userId)), (snapshot) => {
    setTablets(snapshot.docs.map((item) => ({ ...item.data(), id: item.id })));
    setLoading(false);
  }, (err) => { setError(describeError(err)); setLoading(false); }), [userId]);

  function startEdit(tablet) {
    setEditingId(tablet.id);
    setEditForm({ deviceName: tablet.deviceName || "", serialNumber: tablet.serialNumber || "" });
    setError(""); setMessage("");
  }

  async function saveEdit(tablet) {
    if (rowBusy) return;
    const deviceName = editForm.deviceName.trim();
    const serialNumber = editForm.serialNumber.trim();
    const nextKey = serialKey(serialNumber);
    const previousKey = serialKey(tablet.serialNumber || "");
    if (!deviceName || !nextKey) { setError("Enter device name and serial number."); return; }
    setRowBusy(tablet.id); setError(""); setMessage("");
    try {
      await runTransaction(db, async (transaction) => {
        const nextRef = doc(db, "tabletSerials", nextKey);
        if (nextKey !== previousKey) {
          const existing = await transaction.get(nextRef);
          if (existing.exists() && existing.data().tabletId !== tablet.id) throw new Error("duplicate-serial");
        }
        transaction.update(doc(db, "userTablets", tablet.id), { deviceName, serialNumber });
        if (nextKey !== previousKey) {
          if (previousKey) transaction.delete(doc(db, "tabletSerials", previousKey));
          transaction.set(nextRef, { tabletId: tablet.id, userId });
        }
      });
      setEditingId(""); setMessage("Tablet updated.");
    } catch (err) {
      setError(err.message === "duplicate-serial" ? "This serial number is already used by a user." : describeError(err));
    } finally { setRowBusy(""); }
  }

  async function removeTablet(tablet) {
    const ok = window.confirm(`Delete ${tablet.deviceName || "this tablet"}?`);
    if (!ok || rowBusy) return;
    setRowBusy(tablet.id); setError(""); setMessage("");
    try {
      const key = serialKey(tablet.serialNumber || "");
      const removals = [deleteDoc(doc(db, "userTablets", tablet.id))];
      if (key) removals.push(deleteDoc(doc(db, "tabletSerials", key)));
      await Promise.all(removals);
      if (editingId === tablet.id) setEditingId("");
    } catch (err) { setError(describeError(err)); }
    finally { setRowBusy(""); }
  }

  return <div>
    {error && <p role="alert" className="users-error">{error}</p>}
    {message && <p role="status">{message}</p>}
    <h2 className="users-list-title">Tablets ({tablets.length})</h2>
    {loading ? <p>Loading tablets...</p> : tablets.length === 0 ? <p>No tablets added yet.</p> :
      <div className="users-table-wrap"><table className="users-table">
        <thead><tr><th>Device name</th><th>Serial number</th>{canManage && <th></th>}</tr></thead>
        <tbody>{tablets.map((tablet) => <tr key={tablet.id}>
          {canManage && editingId === tablet.id ? <>
            <td><input aria-label="Device name" maxLength={200} value={editForm.deviceName} disabled={rowBusy === tablet.id}
              onChange={(event) => setEditForm({ ...editForm, deviceName: event.target.value })} /></td>
            <td><input aria-label="Serial number" maxLength={200} value={editForm.serialNumber} disabled={rowBusy === tablet.id}
              onChange={(event) => setEditForm({ ...editForm, serialNumber: event.target.value })} /></td>
            <td><div className="users-actions">
              <button type="button" onClick={() => saveEdit(tablet)} disabled={rowBusy === tablet.id}>
                {rowBusy === tablet.id ? "Saving..." : "Save"}
              </button>
              <button type="button" className="users-cancel" onClick={() => setEditingId("")} disabled={rowBusy === tablet.id}>Cancel</button>
            </div></td>
          </> : <>
            <td>{tablet.deviceName}</td>
            <td>{tablet.serialNumber}</td>
            {canManage && <td><div className="users-actions">
              <button type="button" onClick={() => startEdit(tablet)} disabled={Boolean(rowBusy)}>Edit</button>
              <button type="button" className="users-delete" onClick={() => removeTablet(tablet)} disabled={Boolean(rowBusy)}>
                {rowBusy === tablet.id ? "Deleting..." : "Delete"}
              </button>
            </div></td>}
          </>}
        </tr>)}</tbody>
      </table></div>}
  </div>;
}
