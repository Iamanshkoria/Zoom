
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
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-meeting", (meetingCode) => {
        if (
            typeof meetingCode !== "string" ||
            !meetingCode.trim()
        ) {
            console.log("Invalid meeting code");
            return;
        }

        const room = meetingCode.trim();

        socket.join(room);
        socket.data.meetingCode = room;

        console.log(`${socket.id} joined meeting: ${room}`);

        socket.to(room).emit("user-joined", socket.id);
    });

    socket.on("offer", ({ offer, to } = {}) => {
        if (!offer || !to) {
            console.log("Invalid offer payload");
            return;
        }

        console.log(`Forwarding offer: ${socket.id} -> ${to}`);

        io.to(to).emit("offer", {
            offer,
            from: socket.id,
        });
    });

    socket.on("answer", ({ answer, to } = {}) => {
        if (!answer || !to) {
            console.log("Invalid answer payload");
            return;
        }

        console.log(`Forwarding answer: ${socket.id} -> ${to}`);

        io.to(to).emit("answer", {
            answer,
            from: socket.id,
        });
    });

    socket.on("ice-candidate", ({ candidate, to } = {}) => {
        if (!candidate || !to) return;

        io.to(to).emit("ice-candidate", {
            candidate,
            from: socket.id,
        });
    });

    // Real-time meeting chat
    socket.on("chat-message", (text) => {
        const room = socket.data.meetingCode;

        if (
            !room ||
            typeof text !== "string" ||
            !text.trim()
        ) {
            return;
        }

        const message = {
            id: `${socket.id}-${Date.now()}`,
            senderId: socket.id,
            text: text.trim().slice(0, 1000),
            time: new Date().toISOString(),
        };

        // Send the message to everyone in this room, including the sender.
        io.to(room).emit("chat-message", message);
    });

    socket.on("disconnecting", () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                socket.to(room).emit("user-left", socket.id);

                console.log(
                    `User ${socket.id} leaving meeting: ${room}`
                );
            }
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");

        server.listen(PORT, () => {
            console.log(`Listening on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
    });
