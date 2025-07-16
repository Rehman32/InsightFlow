import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

function Dashboard() {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState([]); // State to store meeting summaries
  const [pastSummaries, setPastSummaries] = useState([]); // Renamed from 'summaries' for clarity
  const [scheduledMeetings, setScheduledMeetings] = useState([]); // New state for scheduled meetings

  // State for the scheduling form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newMeetingName, setNewMeetingName] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState(""); // For date input
  const [loading, setLoading] = useState(false); // To show loading state
  const [error, setError] = useState(null); // To show errors

  // dashboard.jsx
// ... (existing imports and states)

  useEffect(() => {
    const fetchPastSummaries = async () => {
      if (!currentUser || !currentUser.uid) {
        setPastSummaries([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:5000/get-summaries/${currentUser.uid}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPastSummaries(data);
      } catch (error) {
        console.error("Error fetching past summaries:", error);
        setError("Failed to load past meetings.");
      } finally {
        setLoading(false);
      }
    };

    const fetchScheduledMeetings = async () => {
      if (!currentUser || !currentUser.uid) {
        setScheduledMeetings([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:5000/get-scheduled-meetings/${currentUser.uid}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // You might want to filter 'upcoming' vs 'past' here if scheduledDate is used
        // For now, we'll assume the backend provides all and frontend displays them as upcoming
        setScheduledMeetings(data);
      } catch (error) {
        console.error("Error fetching scheduled meetings:", error);
        setError("Failed to load scheduled meetings.");
      } finally {
        setLoading(false);
      }
    };

    fetchPastSummaries();
    fetchScheduledMeetings();
  }, [currentUser]);

   const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!newMeetingName.trim() || !currentUser?.uid) {
      setError("Meeting name cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5000/schedule-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: currentUser.uid,
          meetingName: newMeetingName.trim(),
          scheduledDate: newMeetingDate || null, // Send date if provided
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Scheduled meeting:", data);
      // Re-fetch scheduled meetings to update the list
      // For a real-time feel, you might update the state directly with the new item
      setNewMeetingName(""); // Clear form
      setNewMeetingDate("");
      setShowScheduleForm(false); // Close form
      // Re-fetch to ensure data consistency, or directly add to scheduledMeetings state
      const updatedResponse = await fetch(`http://localhost:5000/get-scheduled-meetings/${currentUser.uid}`);
      const updatedData = await updatedResponse.json();
      setScheduledMeetings(updatedData);

    } catch (error) {
      console.error("Error scheduling meeting:", error);
      setError("Failed to schedule meeting. Please try again.");
    } finally {
      setLoading(false);
    }
  }; 


  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleStartMeeting = () => {
    const roomId = uuidv4();
    navigate(`/meeting/${roomId}`);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Hello, {currentUser?.displayName || currentUser?.email}! 👋
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition duration-300 ease-in-out shadow-md"
        >
          Logout
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="font-semibold text-2xl text-gray-700">Your Meetings 🚀</h2>
        <div className="flex gap-4">
            <button
                onClick={() => setShowScheduleForm(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition duration-300 ease-in-out cursor-pointer text-white font-semibold shadow-md"
            >
                🗓️ Schedule New Meeting
            </button>
            <button
                onClick={handleStartMeeting} // This remains for ad-hoc meetings
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-300 ease-in-out cursor-pointer text-white font-semibold shadow-md"
            >
                + Start Ad-hoc Meeting
            </button>
        </div>
      </div>

      {showScheduleForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Schedule New Meeting</h3>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleScheduleMeeting}>
              <div className="mb-4">
                <label htmlFor="meetingName" className="block text-gray-700 text-sm font-bold mb-2">
                  Meeting Name:
                </label>
                <input
                  type="text"
                  id="meetingName"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={newMeetingName}
                  onChange={(e) => setNewMeetingName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="mb-6">
                <label htmlFor="meetingDate" className="block text-gray-700 text-sm font-bold mb-2">
                  Scheduled Date (Optional):
                </label>
                <input
                  type="datetime-local"
                  id="meetingDate"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={newMeetingDate}
                  onChange={(e) => setNewMeetingDate(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition duration-300"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Scheduling...' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && <p className="text-center text-blue-600 my-4">Loading meetings...</p>}
      {error && <p className="text-center text-red-600 my-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Upcoming Meetings Section */}
        <div className="col-span-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Upcoming Meetings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduledMeetings.length > 0 ? (
                    scheduledMeetings.map((meeting) => (
                        <div key={meeting.roomId} className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
                            <p className="text-sm text-gray-600 mb-2">Scheduled</p>
                            <h4 className="text-xl font-semibold text-gray-800">{meeting.meetingName}</h4>
                            <p className="text-sm text-gray-500">
                                Date: {meeting.scheduledDate ? new Date(meeting.scheduledDate).toLocaleString() : 'Not set'}
                            </p>
                            <p className="text-sm text-gray-500">
                                Created: {new Date(meeting.createdAt).toLocaleString()}
                            </p>
                            <button
                                onClick={() => navigate(`/meeting/${meeting.roomId}`)}
                                className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition duration-300 text-sm font-semibold"
                            >
                                Start Meeting
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-6 bg-white rounded-lg shadow-lg text-center text-gray-600">
                        No upcoming meetings scheduled.
                    </div>
                )}
            </div>
        </div>

        {/* Past Meetings Section */}
        <div className="col-span-full mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Past Meetings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastSummaries.length > 0 ? (
                    pastSummaries.map((meeting) => (
                        <div key={meeting._id} className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
                            <p className="text-sm text-gray-600 mb-2">Summary Available</p>
                            <h4 className="text-xl font-semibold text-gray-800">
                                {meeting.meetingName || `Meeting ${meeting.roomId.slice(0, 6)}...`}
                            </h4> {/* Display meetingName if available */}
                            <p className="text-sm text-gray-500">
                                Date: {new Date(meeting.timestamp).toLocaleString()}
                            </p>
                            <button
                                onClick={() => navigate(`/summary/${meeting.roomId}`)}
                                className="mt-4 text-blue-600 text-base underline hover:text-blue-800 transition duration-200"
                            >
                                View Summary
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-6 bg-white rounded-lg shadow-lg text-center text-gray-600">
                        No past meetings found. Start a new one to see your history here!
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
export default Dashboard;