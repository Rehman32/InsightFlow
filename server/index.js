const express =require('express');
const cors= require('cors');
const http = require ('http');
const {Server} = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server (server, {
    cors: {
        origin : "*",
        methods: ["GET","POST"],
    },
});

io.on("connection",(socket) => {
    console.log("New Socket Connected . ",socket.id);

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log( `Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('send-note', ({roomId,note})=>{
        socket.to(roomId).emit("receive-note",note);
    });

    socket.on("disconnect", () => {
        console.log(" Socket Disconnected :", socket.id);
    });

});

const PORT = 5000;

server.listen(PORT , () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
