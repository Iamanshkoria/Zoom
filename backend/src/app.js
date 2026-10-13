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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", userRouter);
app.use("/api", meetingRouter);

app.get("/", (req, res) => {
    res.send("Backend is running");
});

const PORT = process.env.PORT || 8000;

// Create HTTP server
const server = createServer(app);

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Socket.IO connection
io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    socket.on("join-meeting", (meetingCode) => {

        socket.join(meetingCode);

        console.log(
            `${socket.id} joined meeting: ${meetingCode}`
        );

        socket.to(meetingCode).emit("user-joined", socket.id);
    });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {

        console.log("MongoDB connected");

        server.listen(PORT, () => {
            console.log(`Listening on port ${PORT}`);
        });

    })
    .catch((error) => {

        console.log("MongoDB connection failed:", error);

    });