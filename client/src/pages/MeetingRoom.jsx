import React, { useRef, useState,useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {io} from 'socket.io-client';

const socket = io("http://localhost:5000");

export default function MeetingRoom() {
  const {id : roomId} =useParams();
  const [note,setNote]=useState("");
  const [sharedNotes,setSharedNotes]=useState("");
  const typingTimingOut=useRef(null);

  useEffect(() => {
    socket.emit("join-room", roomId);

    socket.on("receive-note", (newNote) => {
      setSharedNotes(newNote);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const handleChange = (e) => {
    const newNote = e.target.value;
    setNote(newNote);

    if(typingTimingOut.current){
      clearTimeout(typingTimingOut.current);
    };

    typingTimingOut.current = setTimeout( () => {
      socket.emit("send-note", {roomId, note: newNote});
    },3000);
  };

  return (
    <div className='p-6 space-y-4'>
      <h1 className='text-2xl font-bold'> Meeting Room : {roomId.slice(0,6)}... </h1>
      <p className='text-gray-500'>Collaborative Notes</p>
      <textarea
      value={note}
      onChange={handleChange}
      rows={10}
      className='w-full border rounded  p-4 resize-none'
      placeholder='Type your shared meeting notes here...'
      />

      <div>
        <h2 className='font-semibold text-lg'>Live Shared Notes (From Other Users) :</h2>
        <pre className='whitespace-pre-wrap bg-gray-100 p-4 rounded mt-2'>{sharedNotes}</pre>
      </div>

    </div>
  )
}
