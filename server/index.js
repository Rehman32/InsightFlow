const roomTranscripts = {}; // { roomId: "full transcript" }

const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
// const FormData = require("form-data"); // Not needed for Gemini API directly

// Import the Google Generative AI library
const { GoogleGenerativeAI } = require("@google/generative-ai");

const ASSEMBLY_API_KEY = process.env.AI_ASSEMBLY_API; // replace with your actual key or use dotenv

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Configure Gemini API
const geminiApi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Use your Gemini API Key
const geminiModel = geminiApi.getGenerativeModel({ model: "gemini-1.5-flash" }); // You can use 'gemini-1.5-pro' for more complex tasks, but Flash is faster and cheaper.

io.on("connection", (socket) => {
  console.log("New Socket Connected . ", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on("send-note", ({ roomId, note }) => {
    socket.to(roomId).emit("receive-note", note);
  });

  socket.on("audio-chunk", async ({ roomId, blob }) => {
    const buffer = Buffer.from(blob); // If using binary transfer, this is enough

    // Ensure the 'temp' directory exists
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const fileName = `audio-${Date.now()}.wav`;
    const filePath = path.join(__dirname, "temp", fileName);
    fs.writeFileSync(filePath, buffer);

    try {
      const audioUrl = await uploadAudioToAssemblyAI(filePath);
      const transcriptId = await transcribeAudioWithAssemblyAI(audioUrl);
      const text = await pollTranscriptionStatus(transcriptId);

      // Store transcript for the room
      if (!roomTranscripts[roomId]) {
        roomTranscripts[roomId] = "";
      }
      roomTranscripts[roomId] += " " + text;

      io.to(roomId).emit("receive-transcript", text);
    } catch (err) {
      console.error("❌ Transcription error:", err.message);
    } finally {
      // Ensure file is deleted even if transcription fails
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(" Socket Disconnected :", socket.id);
  });
});

app.post("/generate-summary", async (req, res) => {
  const { roomId } = req.body;
  const transcript = roomTranscripts[roomId];

  if (!transcript) {
    return res.status(404).json({ error: "Transcript not found" });
  }

  try {
    const prompt = `You are an AI meeting assistant. Given a meeting transcript, generate a concise 1 to 2 paragraph summary and a bullet list of key action items.

Transcript:
${transcript}`;

    const result = await geminiModel.generateContent(prompt);
    const aiReply = result.response.text();

    res.json({ summary: aiReply });

    console.log("✅ AI Reply:", aiReply);
  } catch (err) {
    console.error("❌ AI summary error:", err.message);
    res.status(500).json({ error: "AI summarization failed" });
  }
});

async function uploadAudioToAssemblyAI(filePath) {
  const audio = fs.readFileSync(filePath);

  const response = await axios.post(
    "https://api.assemblyai.com/v2/upload",
    audio,
    {
      headers: {
        authorization: ASSEMBLY_API_KEY,
        "content-type": "application/octet-stream",
      },
    }
  );

  return response.data.upload_url;
}

async function transcribeAudioWithAssemblyAI(audioUrl) {
  const response = await axios.post(
    "https://api.assemblyai.com/v2/transcript",
    {
      audio_url: audioUrl,
    },
    {
      headers: {
        authorization: ASSEMBLY_API_KEY,
      },
    }
  );

  return response.data.id;
}

async function pollTranscriptionStatus(transcriptId) {
  const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;

  while (true) {
    const response = await axios.get(pollingEndpoint, {
      headers: {
        authorization: ASSEMBLY_API_KEY,
      },
    });

    if (response.data.status === "completed") {
      return response.data.text;
    }

    if (response.data.status === "error") {
      throw new Error("Transcription failed: " + response.data.error); // Add more specific error message
    }

    await new Promise((resolve) => setTimeout(resolve, 3000)); // wait 3 seconds
  }
}

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
