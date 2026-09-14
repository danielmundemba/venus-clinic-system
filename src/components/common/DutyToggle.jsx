import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  setDutyStatus,
  getAllNurseRooms,
  nurseCheckIn,
  nurseCheckOut,
} from "../../firebase/db";
import { DoorOpen, DoorClosed, Loader2 } from "lucide-react";

const DutyToggle = () => {
  const { user, userRole } = useAuth();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [dutyRoomId, setDutyRoomId] = useState(null);
  const [doctorRoomInput, setDoctorRoomInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRole === "nurse") {
      getAllNurseRooms().then(setRooms);
    }
  }, [userRole]);

  const toggleDoctor = async () => {
    setSaving(true);
    try {
      if (!isOnDuty) {
        if (!doctorRoomInput.trim()) return;
        await setDutyStatus(user.uid, true, doctorRoomInput.trim());
        setIsOnDuty(true);
      } else {
        await setDutyStatus(user.uid, false);
        setDoctorRoomInput("");
        setIsOnDuty(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleNurse = async () => {
    setSaving(true);
    try {
      if (!isOnDuty) {
        if (!selectedRoom) return;
        const room = rooms.find((r) => r.id === selectedRoom);
        await nurseCheckIn(
          user.uid,
          user.displayName || user.email,
          room.id,
          room.roomNumber,
        );
        setDutyRoomId(room.id);
        setIsOnDuty(true);
      } else {
        await nurseCheckOut(user.uid, dutyRoomId);
        setDutyRoomId(null);
        setIsOnDuty(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!["doctor", "nurse"].includes(userRole)) return null;

  const availableRooms = rooms.filter(
    (r) => !r.nurseOnDuty || r.id === dutyRoomId,
  );

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {isOnDuty ? (
          <DoorOpen className="w-5 h-5 text-emerald-500" />
        ) : (
          <DoorClosed className="w-5 h-5 text-venus-text-muted" />
        )}
        <div>
          <p className="text-sm font-medium text-venus-text-primary">
            {isOnDuty ? "On Duty" : "Off Duty"}
          </p>
          {userRole === "nurse" && isOnDuty && (
            <p className="text-xs text-venus-text-muted">
              Room {rooms.find((r) => r.id === dutyRoomId)?.roomNumber}
            </p>
          )}
          {userRole === "doctor" && isOnDuty && (
            <p className="text-xs text-venus-text-muted">
              Consulting Room {doctorRoomInput}
            </p>
          )}
        </div>
      </div>

      {userRole === "nurse" && !isOnDuty && (
        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
          className="input-field !w-auto"
        >
          <option value="">Select room...</option>
          {availableRooms.map((r) => (
            <option key={r.id} value={r.id}>
              Room {r.roomNumber}
            </option>
          ))}
        </select>
      )}

      {userRole === "doctor" && !isOnDuty && (
        <input
          value={doctorRoomInput}
          onChange={(e) => setDoctorRoomInput(e.target.value)}
          className="input-field !w-auto"
          placeholder="Consulting room (e.g. 5)"
        />
      )}

      <button
        onClick={userRole === "nurse" ? toggleNurse : toggleDoctor}
        disabled={
          saving ||
          (!isOnDuty && userRole === "nurse" && !selectedRoom) ||
          (!isOnDuty && userRole === "doctor" && !doctorRoomInput.trim())
        }
        className={isOnDuty ? "btn-secondary" : "btn-primary"}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isOnDuty ? (
          "Go Off Duty"
        ) : (
          "Go On Duty"
        )}
      </button>
    </div>
  );
};

export default DutyToggle;
