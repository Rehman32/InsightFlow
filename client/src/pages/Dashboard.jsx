import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

function Dashboard() {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };
  const handleStartMeeting = () => {
    const roomId = uuidv4();
    navigate(`/meeting/${roomId}`);
  };

  return (
    <div className="p-6 bg-gray-100">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">
          Hello, {currentUser?.displayName || currentUser?.email}
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl ">Your Meetings</h2>
        <button
          onClick={handleStartMeeting}
          className="px-4 py-2 mt-4 bg-blue-600 hover:bg-blue-700 rounded transiton cursor-pointer text-white font-semibold"
        >
          + Start new Meeting
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Upcoming</p>
          <h3 className="text-lg font-semibold">Client Check-in</h3>
          <p className="text-sm text-gray-500">Date: 2025-07-15, 2:00 PM</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Past</p>
          <h3 className="text-lg font-semibold">Team Sync-up</h3>
          <p className="text-sm text-gray-500">Date: 2025-07-12</p>
          <button
            onClick={() => navigate("/summary/abc123")}
            className="mt-2 text-blue-600 text-sm underline"
          >
            View Summary
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
