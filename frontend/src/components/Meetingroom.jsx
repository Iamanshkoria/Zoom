import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function Meetingroom({ meetingCode }) {

    const peerRef = useRef(null);
    const streamRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {

        socketRef.current = io("http://localhost:8000");

        socketRef.current.emit("join-meeting", meetingCode);

        socketRef.current.on("user-joined", (userId) => {
            console.log("Another user joined:", userId);
        });

        const startMedia = async () => {

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            streamRef.current = stream;

            stream.getTracks().forEach((track) => {

                peerRef.current.addTrack(track, stream);

                console.log("Track:", track);

            });

            console.log("Camera and microphone accessed:", stream);
        };

        peerRef.current = new RTCPeerConnection();

        startMedia();

    }, [meetingCode]);

    return (
        <div className="mt-4">

            <h3>Meeting Room</h3>

            <p>
                Meeting Code: {meetingCode}
            </p>

        </div>
    );
}