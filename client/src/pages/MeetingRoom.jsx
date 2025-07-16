// meetingRoom.jsx
import React, { useRef, useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import RecordRTC from "recordrtc";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const socket = io("http://localhost:5000");

export default function MeetingRoom() {
  const { id: roomId } = useParams();
  const [note, setNote] = useState("");
  const [sharedNotes, setSharedNotes] = useState("");

  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const { currentUser } = useContext(AuthContext);

  // New state for microphone selection
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
  const [isRecording, setIsRecording] = useState(false); // To manage button states

  useEffect(() => {
    socket.emit("join-room", roomId);

    socket.on("receive-note", (newNote) => {
      setSharedNotes(newNote);
    });

    socket.on("receive-transcript", (text) => {
      setTranscript((prev) => prev + " " + text);
    });

    // Fetch audio input devices
    const getAudioDevices = async () => {
      try {
        // Request media devices permission first to ensure labels are available
        await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(
          (device) => device.kind === "audioinput"
        );
        setAudioDevices(audioInputDevices);
        if (audioInputDevices.length > 0) {
          setSelectedAudioDevice(audioInputDevices[0].deviceId); // Select first device by default
        }
      } catch (error) {
        console.error("Error enumerating audio devices:", error);
        alert("Permission to access microphone denied. Please allow microphone access in your browser settings to use transcription.");
      }
    };

    getAudioDevices();

    return () => {
      socket.disconnect();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recorderRef.current) {
          recorderRef.current.destroy(); // Clean up RecordRTC instance
      }
    };
  }, [roomId]);

  const navigate = useNavigate();

  const endMeeting = async () => {
    // Stop recording first if it's still active
    stopRecording();

    // Fetch the meeting name if it's a scheduled meeting, otherwise use a default
    let meetingNameForSummary = "Ad-hoc Meeting";
    // This logic ideally would be on the backend when saving, as implemented previously.
    // However, if you need it on frontend for displaying before saving, you'd need another endpoint.
    // For now, trust the backend to derive it.

    const res = await fetch("http://localhost:5000/generate-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });

    const data = await res.json();

    localStorage.setItem(`summary-${roomId}`, data.summary);
    localStorage.setItem(`transcript-${roomId}`, transcript);

    if (currentUser && data.summary) {
      try {
        await fetch("http://localhost:5000/save-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: currentUser.uid,
            roomId,
            summary: data.summary,
            // We are relying on the backend to add meetingName.
            // If you added transcript to DB, uncomment: transcript: transcript,
          }),
        });
        console.log("Summary successfully saved to MongoDB!");
      } catch (saveError) {
        console.error("Error saving summary to MongoDB:", saveError);
      }
    }

    navigate(`/summary/${roomId}`);
  };

  const startRecording = async () => {
    if (!selectedAudioDevice) {
      alert("Please select an audio input device.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
        },
      });
      streamRef.current = stream;

      const recorder = RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 4000,
        ondataavailable: (blob) => {
          socket.emit("audio-chunk", { roomId, blob });
        },
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true); // Set recording state to true
      setTranscript(""); // Clear transcript for new recording
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to start recording. Please check microphone permissions.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stopRecording(() => {
        streamRef.current.getTracks().forEach((track) => track.stop());
        setIsRecording(false); // Set recording state to false
      });
    }
  };

  const handleChange = (e) => {
    const newNote = e.target.value;
    setNote(newNote);
    socket.emit("send-note", { roomId, note: newNote });
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Meeting Room : {roomId.slice(0, 6)}...
      </h1>
      <p className="text-gray-500">Collaborative Notes</p>

      <div className="mb-4">
        <label htmlFor="audioInput" className="block text-sm font-medium text-gray-700 mb-1">
          Select Microphone:
        </label>
        <select
          id="audioInput"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={selectedAudioDevice}
          onChange={(e) => setSelectedAudioDevice(e.target.value)}
          disabled={isRecording}
        >
          {audioDevices.length > 0 ? (
            audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
              </option>
            ))
          ) : (
            <option value="">No microphones found</option>
          )}
        </select>
      </div>

      <div className="flex gap-4">
        <button
          onClick={startRecording}
          disabled={isRecording || !selectedAudioDevice}
          className={`rounded px-4 py-2 font-semibold text-white ${
            isRecording ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isRecording ? "Recording..." : "Start Transcription"}
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className={`rounded px-4 py-2 font-semibold text-white ${
            !isRecording ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          Stop
        </button>
      </div>
      <textarea
        value={note}
        onChange={handleChange}
        rows={10}
        className="w-full border rounded p-4 resize-none"
        placeholder="Type your shared meeting notes here..."
      />

      <div>
        <h2 className="text-lg font-semibold">🧠 Live AI Transcript</h2>
        <div className="bg-gray-100 p-4 rounded min-h-[100px]">
          {transcript}
        </div>
        <button
          onClick={endMeeting}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 mt-4"
        >
          🧠 End Meeting + Generate AI Summary
        </button>
      </div>

      <div>
        <h2 className="font-semibold text-lg">
          Live Shared Notes (From Other Users) :
        </h2>
        <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded mt-2">
          {sharedNotes}
        </pre>
      </div>
    </div>
  );
}