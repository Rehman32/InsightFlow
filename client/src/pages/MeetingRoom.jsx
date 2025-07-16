import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import RecordRTC from "recordrtc";
  import { useNavigate } from "react-router-dom";


const socket = io("http://localhost:5000");

export default function MeetingRoom() {
  const { id: roomId } = useParams();
  const [note, setNote] = useState("");
  const [sharedNotes, setSharedNotes] = useState("");
  const typingTimingOut = useRef(null);

  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    socket.emit("join-room", roomId);

    socket.on("receive-note", (newNote) => {
      setSharedNotes(newNote);
    });

    socket.on("receive-transcript", (text) => {
      setTranscript((prev) => prev + " " + text);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);


const navigate = useNavigate();

const endMeeting = async () => {
  const res = await fetch("http://localhost:5000/generate-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId }),
  });

  const data = await res.json();

  // ✅ Save summary + transcript locally for now
  localStorage.setItem(`summary-${roomId}`, data.summary);
  localStorage.setItem(`transcript-${roomId}`, transcript);

  navigate(`/summary/${roomId}`);
};




  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording(() => {
        streamRef.current.getTracks().forEach((track) => track.stop());
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
        {" "}
        Meeting Room : {roomId.slice(0, 6)}...{" "}
      </h1>
      <p className="text-gray-500">Collaborative Notes</p>

      <div className="flex gap-4">
        <button
          onClick={startRecording}
          className="bg-green-600 rounded px-4 py-2 font-semibold hover:bg-green-700 text-white"
        >
          Start Transcription
        </button>
        <button
          onClick={stopRecording}
          className="bg-red-600 rounded px-4 py-2 cursor-pointer hover:bg-red-700 font-semibold text-white"
        >
          Stop
        </button>
      </div>
      <textarea
        value={note}
        onChange={handleChange}
        rows={10}
        className="w-full border rounded  p-4 resize-none"
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
