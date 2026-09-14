import { useState, useEffect } from "react";
import { getAllNurseRooms, createNurseRoom } from "../../firebase/db";
import { deleteDocument } from "../../firebase/db";
import { useAuditLog } from "../../hooks/useAuditLog";
import {
  DoorOpen,
  DoorClosed,
  Plus,
  Loader2,
  X,
  AlertCircle,
  Trash2,
  User,
} from "lucide-react";

const NurseRooms = () => {
  const { logAction } = useAuditLog();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await getAllNurseRooms();
      setRooms(
        data.sort((a, b) =>
          a.roomNumber.localeCompare(b.roomNumber, undefined, {
            numeric: true,
          }),
        ),
      );
    } catch (err) {
      console.error("Failed to load nurse rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");

    if (!roomNumber.trim()) {
      setError("Room number is required");
      return;
    }
    if (
      rooms.some(
        (r) => r.roomNumber.toLowerCase() === roomNumber.trim().toLowerCase(),
      )
    ) {
      setError("A room with that number already exists");
      return;
    }

    setSubmitting(true);
    try {
      const docRef = await createNurseRoom(roomNumber.trim());
      await logAction("create", "nurseRoom", docRef.id, {
        roomNumber: roomNumber.trim(),
      });
      setRoomNumber("");
      setShowModal(false);
      await loadRooms();
    } catch (err) {
      console.error("Failed to create room:", err);
      setError("Failed to create room: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (room) => {
    if (room.nurseOnDuty || room.isOccupied) {
      alert(
        "This room is currently in use — check the nurse out (or wait for the patient to finish) before deleting it.",
      );
      return;
    }
    if (!confirm(`Delete Room ${room.roomNumber}? This can't be undone.`))
      return;

    try {
      await deleteDocument("nurseRooms", room.id);
      await logAction("delete", "nurseRoom", room.id, {
        roomNumber: room.roomNumber,
      });
      await loadRooms();
    } catch (err) {
      alert("Failed to delete room: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-venus-text-primary">
            Nurse Rooms
          </h1>
          <p className="text-venus-text-muted mt-1">
            Set up the physical rooms nurses can check into. Patients are
            auto-assigned to an open, staffed room.
          </p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setError("");
            setRoomNumber("");
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Room
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-venus-primary-400 animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="card text-center py-16">
          <DoorClosed className="w-10 h-10 text-venus-text-muted mx-auto mb-3" />
          <p className="text-venus-text-primary font-medium">
            No rooms set up yet
          </p>
          <p className="text-sm text-venus-text-muted mt-1">
            Add at least one room before a nurse can go on duty.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {room.nurseOnDuty ? (
                    <DoorOpen className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <DoorClosed className="w-5 h-5 text-venus-text-muted" />
                  )}
                  <h3 className="font-semibold text-venus-text-primary">
                    Room {room.roomNumber}
                  </h3>
                </div>
                <button
                  onClick={() => handleDelete(room)}
                  className="p-1.5 text-venus-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete room"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-venus-text-muted">
                  <User className="w-3.5 h-3.5" />
                  {room.nurseOnDuty ? (
                    <span className="text-venus-text-primary">
                      {room.assignedNurseName}
                    </span>
                  ) : (
                    <span className="italic">No nurse on duty</span>
                  )}
                </div>
                {room.nurseOnDuty && (
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      room.isOccupied
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-emerald-500/10 text-emerald-500"
                    }`}
                  >
                    {room.isOccupied ? "With a patient" : "Available"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-venus-border">
              <h3 className="text-lg font-semibold text-venus-text-primary">
                Add Room
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-venus-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-venus-text-muted" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-venus-text-primary mb-1.5">
                  Room Number <span className="text-red-400">*</span>
                </label>
                <input
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 1, 2, or A1"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-venus-border text-venus-text-primary rounded-lg text-sm font-medium hover:bg-venus-bg-elevated transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseRooms;
