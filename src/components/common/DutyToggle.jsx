import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { setDutyStatus, getAllNurseRooms, nurseCheckIn, nurseCheckOut } from '../../firebase/db';
import { DoorOpen, DoorClosed, Loader2 } from 'lucide-react';

const DutyToggle = () => {
  const { user, userRole } = useAuth();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [dutyRoomId, setDutyRoomId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRole === 'nurse') {
      getAllNurseRooms().then(setRooms);
    }
  }, [userRole]);

  const toggleDoctor = async () => {
    setSaving(true);
    try {
      await setDutyStatus(user.uid, !isOnDuty);
      setIsOnDuty(!isOnDuty);
    } finally {
      setSaving(false);
    }
  };

  const toggleNurse = async () => {
    setSaving(true);
    try {
      if (!isOnDuty) {
        if (!selectedRoom) return;
        const room = rooms.find(r => r.id === selectedRoom);
        await nurseCheckIn(user.uid, user.displayName || user.email, room.id, room.roomNumber);
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

  if (!['doctor', 'nurse'].includes(userRole)) return null;

  const availableRooms = rooms.filter(r => !r.nurseOnDuty || r.id === dutyRoomId);

  return (
    <div className="card flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {isOnDuty ? <DoorOpen className="w-5 h-5 text-emerald-500" /> : <DoorClosed className="w-5 h-5 text-venus-text-muted" />}
        <div>
          <p className="text-sm font-medium text-venus-text-primary">
            {isOnDuty ? 'On Duty' : 'Off Duty'}
          </p>
          {userRole === 'nurse' && isOnDuty && (
            <p className="text-xs text-venus-text-muted">
              Room {rooms.find(r => r.id === dutyRoomId)?.roomNumber}
            </p>
          )}
        </div>
      </div>

      {userRole === 'nurse' && !isOnDuty && (
        <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}
          className="input-field !w-auto">
          <option value="">Select room...</option>
          {availableRooms.map(r => (
            <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
          ))}
        </select>
      )}

      <button
        onClick={userRole === 'nurse' ? toggleNurse : toggleDoctor}
        disabled={saving || (userRole === 'nurse' && !isOnDuty && !selectedRoom)}
        className={isOnDuty ? 'btn-secondary' : 'btn-primary'}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
      </button>
    </div>
  );
};

export default DutyToggle;