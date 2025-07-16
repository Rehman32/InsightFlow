const roomTranscripts = {}; // { roomId: "full transcript" }

const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const puppeteer = require("puppeteer");
const { v4: uuidv4 } = require("uuid");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const ASSEMBLY_API_KEY = process.env.AI_ASSEMBLY_API;

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose"); // Import Mongoose

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

// --- MongoDB Connection ---
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/meetingSummariesDB"; // Use an environment variable for your MongoDB URI
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- Mongoose Schema and Model for Summaries ---
const summarySchema = new mongoose.Schema({
  uid: { type: String, required: true },
  roomId: { type: String, required: true, unique: true },
  meetingName: { type: String, required: true },
  summary: { type: String, required: true },
  transcript: { type: String }, // Add this line
  timestamp: { type: Date, default: Date.now },
});

const Summary = mongoose.model("Summary", summarySchema); // Create the Mongoose Model

// --- Mongoose Schema and Model for Scheduled Meetings ---
const scheduledMeetingSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  roomId: { type: String, required: true, unique: true }, // Unique ID for the meeting instance
  meetingName: { type: String, required: true },
  scheduledDate: { type: Date, required: false }, // Optional: User can schedule a specific date/time
  createdAt: { type: Date, default: Date.now },
});

const ScheduledMeeting = mongoose.model(
  "ScheduledMeeting",
  scheduledMeetingSchema
);

// --- New /schedule-meeting endpoint ---
app.post("/schedule-meeting", async (req, res) => {
  const { uid, meetingName, scheduledDate } = req.body;
  const roomId = uuidv4(); // Generate a unique roomId for the scheduled meeting

  if (!uid || !meetingName) {
    return res
      .status(400)
      .json({ error: "User ID and Meeting Name are required." });
  }

  try {
    const newScheduledMeeting = new ScheduledMeeting({
      uid,
      roomId,
      meetingName,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    });
    await newScheduledMeeting.save();
    res
      .status(201)
      .json({ message: "Meeting scheduled successfully!", roomId });
  } catch (err) {
    console.error("❌ MongoDB schedule meeting error:", err.message);
    res.status(500).json({ error: "Failed to schedule meeting." });
  }
});

// Configure Gemini API
const geminiApi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = geminiApi.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const buffer = Buffer.from(blob);

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

      if (!roomTranscripts[roomId]) {
        roomTranscripts[roomId] = "";
      }
      roomTranscripts[roomId] += " " + text;

      io.to(roomId).emit("receive-transcript", text);
    } catch (err) {
      console.error("❌ Transcription error:", err.message);
    } finally {
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

// --- New /save-summary endpoint for MongoDB ---
app.post("/save-summary", async (req, res) => {
  const { uid, roomId, summary } = req.body;

  try {
    let meetingName = "Ad-hoc Meeting"; // Default name for unscheduled meetings

    // Try to find if this roomId corresponds to a scheduled meeting
    const scheduledMeeting = await ScheduledMeeting.findOne({ roomId });
    if (scheduledMeeting) {
      meetingName = scheduledMeeting.meetingName;
    }

    const newSummary = new Summary({
      uid,
      roomId,
      summary,
      meetingName, // Now includes the meetingName
      timestamp: new Date(),
    });
    await newSummary.save();

    res.status(200).json({ message: "Summary saved successfully!" });
  } catch (err) {
    console.error("❌ MongoDB save error:", err.message);
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "Summary for this room already exists." });
    }
    res.status(500).json({ error: "Failed to save summary." });
  }
});

// --- New /get-summaries endpoint for MongoDB ---
app.get("/get-summaries/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    const summaries = await Summary.find({ uid }).sort({ timestamp: -1 }); // Find by UID and sort by latest
    res.status(200).json(summaries);
  } catch (err) {
    console.error("❌ MongoDB fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch summaries." });
  }
});

// --- New /get-scheduled-meetings endpoint ---
app.get("/get-scheduled-meetings/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    // Fetch meetings that are not yet "past" or simply fetch all and let frontend filter
    // For now, let's just fetch all and sort by creation date
    const scheduledMeetings = await ScheduledMeeting.find({ uid }).sort({
      createdAt: -1,
    });
    res.status(200).json(scheduledMeetings);
  } catch (err) {
    console.error("❌ MongoDB fetch scheduled meetings error:", err.message);
    res.status(500).json({ error: "Failed to fetch scheduled meetings." });
  }
});

app.get("/download-summary-pdf/:roomId", async (req, res) => {
  const { roomId } = req.params;

  try {
    // 1. Fetch Summary and Transcript from MongoDB
    const summaryData = await Summary.findOne({ roomId });

    if (!summaryData) {
      return res
        .status(404)
        .json({ error: "Summary not found for this room." });
    }

    // Since transcript is stored locally on the frontend, and not in the DB with the summary,
    // we need to decide where it lives for the PDF.
    // For now, we'll assume we only have summary and action items from the DB.
    // If you want the full transcript in the PDF, you MUST store it with the summary in MongoDB.
    // Let's modify our Summary schema temporarily for this, or acknowledge it's a limitation.

    // --- TEMPORARY NOTE: To include transcript in PDF, you need to save it with the summary. ---
    // If you want full transcript in PDF, modify `meetingRoom.jsx` and `index.js`'s `/save-summary`
    // to include `transcript` in the data sent to `/save-summary` and add `transcript: { type: String }`
    // to your `summarySchema` in `index.js`.
    // For this example, I'll generate the PDF with what we *currently* save (summary, action items implicitly from summary text, and meetingName).
    // If you want the *full* transcript, you MUST persist it in MongoDB.

    // For now, let's craft an HTML using the summary text and meetingName.
    // To parse action items from the single summary string (if they are bullet points):
    const summaryLines = summaryData.summary.split("\n").filter(Boolean);
    const summaryText =
      summaryLines.find(
        (line) =>
          !line.trim().startsWith("-") &&
          !line.trim().startsWith("•") &&
          !line.trim().startsWith("*")
      ) || summaryData.summary;
    const actionItems = summaryLines
      .filter(
        (line) =>
          line.trim().startsWith("-") ||
          line.trim().startsWith("•") ||
          line.trim().startsWith("*")
      )
      .map((item) => item.replace(/^(\*+|\-|\•)\s*/, "")); // Clean up bullets

    // Prepare HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Meeting Summary - ${summaryData.meetingName}</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 40px; }
              h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; font-size: 28px; }
              h2 { color: #34495e; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; font-size: 22px; }
              p { margin-bottom: 10px; }
              ul { list-style-type: disc; margin-left: 25px; margin-bottom: 10px; }
              li { margin-bottom: 5px; }
              .header { text-align: center; margin-bottom: 40px; }
              .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #777; }
              .container { max-width: 800px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
              .meta { font-size: 14px; color: #666; margin-bottom: 20px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Meeting Summary Report</h1>
                  <p class="meta"><strong>Meeting Name:</strong> ${
                    summaryData.meetingName || "Untitled Meeting"
                  }</p>
                  <p class="meta"><strong>Date:</strong> ${new Date(
                    summaryData.timestamp
                  ).toLocaleDateString()}</p>
                  <p class="meta"><strong>Time:</strong> ${new Date(
                    summaryData.timestamp
                  ).toLocaleTimeString()}</p>
                  <p class="meta"><strong>Room ID:</strong> ${
                    summaryData.roomId
                  }</p>
              </div>

              <h2>Summary</h2>
              <p>${summaryText}</p>

              <h2>Action Items</h2>
              ${
                actionItems.length > 0
                  ? `<ul>${actionItems
                      .map((item) => `<li>${item}</li>`)
                      .join("")}</ul>`
                  : "<p>No action items identified.</p>"
              }
               
              <h2>Full Transcript</h2>
              <pre style="white-space: pre-wrap; word-wrap: break-word; background-color: #f8f8f8; padding: 10px; border-radius: 5px;">${
                summaryData.transcript || "No transcript available."
              }</pre>
    

              <div class="footer">
                  <p>Generated by AI Meeting Assistant</p>
                  <p>${new Date().toLocaleString()}</p>
              </div>
          </div>
      </body>
      </html>
    `;

    // 2. Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true, // Use 'new' for new Puppeteer versions, or true for old
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Recommended for production environments
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" }); // Wait for content to load

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true, // Renders colors and images in the background
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    await browser.close();

    // 3. Send PDF as response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meeting_summary_${summaryData.roomId}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ PDF generation error:", err.message);
    res.status(500).json({ error: "Failed to generate PDF summary." });
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
      throw new Error("Transcription failed: " + response.data.error);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

const PORT = 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
