
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";

import userRouter from "./routes/users.routes.js";
import meetingRouter from "./routes/meeting.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Keep your existing API routes.
app.use("/api", userRouter);
app.use("/api", meetingRouter);

app.get("/", (req, res) => {
    res.send("Backend is running");
});

const PORT = process.env.PORT || 8000;
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join a meeting room.
    socket.on("join-meeting", (meetingCode) => {
        socket.join(meetingCode);

        console.log(
            `${socket.id} joined meeting: ${meetingCode}`
        );

        // Notify existing participants, not the joining user.
        socket.to(meetingCode).emit("user-joined", socket.id);
    });

    // Forward a WebRTC offer to its intended participant.
    socket.on("offer", ({ offer, to }) => {
        if (!offer || !to) {
            console.log("Invalid offer payload");
            return;
        }

        console.log(`Forwarding offer: ${socket.id} -> ${to}`);

        io.to(to).emit("offer", {
            offer,
            from: socket.id
        });
    });

    // Forward the answer back to the offer sender.
    socket.on("answer", ({ answer, to }) => {
        if (!answer || !to) {
            console.log("Invalid answer payload");
            return;
        }

        console.log(`Forwarding answer: ${socket.id} -> ${to}`);

        io.to(to).emit("answer", {
            answer,
            from: socket.id
        });
    });

    // Forward ICE candidates between participants.
    socket.on("ice-candidate", ({ candidate, to }) => {
        if (!candidate || !to) {
            return;
        }

        io.to(to).emit("ice-candidate", {
            candidate,
            from: socket.id
        });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Start the server only after MongoDB connects.
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");

        server.listen(PORT, () => {
            console.log(`Listening on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
    });
