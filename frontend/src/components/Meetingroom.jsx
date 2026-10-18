
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

function Meetingroom({ meetingCode }) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef = useRef(null);
    const peerRef = useRef(null);
    const streamRef = useRef(null);
    const remoteSocketIdRef = useRef(null);
    const pendingCandidatesRef = useRef([]);

    const [status, setStatus] = useState("Connecting...");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);

    useEffect(() => {
        if (!meetingCode) return;

        let cancelled = false;
        let socket;
        let peer;
        let localStream;

        const startMeeting = async () => {
            try {
                setStatus("Connecting...");
                setError("");
                setMessage("");

                socket = io("http://localhost:8000");
                socketRef.current = socket;

                peer = new RTCPeerConnection({
                    iceServers: [
                        {
                            urls: "stun:stun.l.google.com:19302",
                        },
                    ],
                });

                peerRef.current = peer;

                peer.ontrack = (event) => {
                    if (cancelled || !remoteVideoRef.current) return;

                    if (event.streams && event.streams[0]) {
                        remoteVideoRef.current.srcObject =
                            event.streams[0];

                        remoteVideoRef.current.play().catch(() => {});
                        setMessage("");
                    }
                };

                peer.onicecandidate = (event) => {
                    if (event.candidate && remoteSocketIdRef.current) {
                        socket.emit("ice-candidate", {
                            candidate: event.candidate,
                            to: remoteSocketIdRef.current,
                        });
                    }
                };

                peer.onconnectionstatechange = () => {
                    if (cancelled) return;

                    if (peer.connectionState === "connected") {
                        setStatus("Connected");
                    } else if (
                        peer.connectionState === "connecting"
                    ) {
                        setStatus("Connecting media...");
                    } else if (
                        peer.connectionState === "disconnected"
                    ) {
                        setStatus("Connection interrupted");
                    } else if (peer.connectionState === "failed") {
                        setStatus("Connection failed");
                    } else if (peer.connectionState === "closed") {
                        setStatus("Call ended");
                    }
                };

                socket.on("connect", () => {
                    console.log("Socket connected:", socket.id);

                    socket.emit("join-meeting", meetingCode);
                    setStatus("Waiting for another participant...");
                });

                socket.on("connect_error", (err) => {
                    console.error("Socket connection error:", err);

                    if (!cancelled) {
                        setError("Unable to connect to the meeting server.");
                    }
                });

                socket.on("user-joined", async (userId) => {
                    if (cancelled || !peerRef.current) return;

                    try {
                        console.log("Participant joined:", userId);

                        remoteSocketIdRef.current = userId;
                        setMessage("");
                        setStatus("Connecting media...");

                        const offer = await peer.createOffer();
                        await peer.setLocalDescription(offer);

                        socket.emit("offer", {
                            offer: peer.localDescription,
                            to: userId,
                        });

                        console.log("Offer sent to:", userId);
                    } catch (err) {
                        console.error("Error creating offer:", err);
                        setError("Could not start the video connection.");
                    }
                });

                socket.on("offer", async ({ offer, from }) => {
                    if (cancelled || !peerRef.current) return;

                    try {
                        console.log("Offer received from:", from);

                        remoteSocketIdRef.current = from;

                        await peer.setRemoteDescription(
                            new RTCSessionDescription(offer)
                        );

                        for (const candidate of pendingCandidatesRef.current) {
                            await peer.addIceCandidate(
                                new RTCIceCandidate(candidate)
                            );
                        }

                        pendingCandidatesRef.current = [];

                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);

                        socket.emit("answer", {
                            answer: peer.localDescription,
                            to: from,
                        });

                        console.log("Answer sent to:", from);
                    } catch (err) {
                        console.error("Error handling offer:", err);
                        setError("Could not establish the video connection.");
                    }
                });

                socket.on("answer", async ({ answer, from }) => {
                    if (cancelled || !peerRef.current) return;

                    try {
                        console.log("Answer received from:", from);

                        await peer.setRemoteDescription(
                            new RTCSessionDescription(answer)
                        );

                        for (const candidate of pendingCandidatesRef.current) {
                            await peer.addIceCandidate(
                                new RTCIceCandidate(candidate)
                            );
                        }

                        pendingCandidatesRef.current = [];

                        console.log("Remote description set successfully.");
                    } catch (err) {
                        console.error("Error handling answer:", err);
                    }
                });

                socket.on(
                    "ice-candidate",
                    async ({ candidate, from }) => {
                        if (
                            cancelled ||
                            !peerRef.current ||
                            !candidate
                        ) {
                            return;
                        }

                        try {
                            if (peer.remoteDescription) {
                                await peer.addIceCandidate(
                                    new RTCIceCandidate(candidate)
                                );
                            } else {
                                pendingCandidatesRef.current.push(candidate);
                            }
                        } catch (err) {
                            console.error(
                                "Error adding ICE candidate:",
                                err
                            );
                        }
                    }
                );

                // Handle the other participant leaving.
                socket.on("user-left", (userId) => {
                    if (cancelled) return;

                    // Ignore a departure notification from an unrelated user.
                    if (
                        remoteSocketIdRef.current &&
                        userId !== remoteSocketIdRef.current
                    ) {
                        return;
                    }

                    console.log("Participant left:", userId);

                    remoteSocketIdRef.current = null;
                    pendingCandidatesRef.current = [];

                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }

                    // Close the old peer connection so a new participant
                    // can connect without reusing stale connection state.
                    if (peerRef.current) {
                        peerRef.current.close();
                        peerRef.current = null;
                    }

                    setStatus("Waiting for another participant...");
                    setMessage("The other participant has left the meeting.");
                });

                // Get access to the local camera and microphone.
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });

                if (cancelled) {
                    localStream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = localStream;

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStream;
                }

                localStream.getTracks().forEach((track) => {
                    peer.addTrack(track, localStream);
                });

                setStatus("Waiting for another participant...");
            } catch (err) {
                console.error("Meeting setup error:", err);

                if (!cancelled) {
                    if (err.name === "NotAllowedError") {
                        setError(
                            "Camera or microphone permission was denied."
                        );
                    } else if (err.name === "NotFoundError") {
                        setError(
                            "No camera or microphone was found on this device."
                        );
                    } else {
                        setError(
                            "Unable to start the meeting. Please try again."
                        );
                    }
                }
            }
        };

        startMeeting();

        return () => {
            cancelled = true;

            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
            }

            if (peer) {
                peer.close();
            }

            if (localStream) {
                localStream.getTracks().forEach((track) => track.stop());
            }

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }

            socketRef.current = null;
            peerRef.current = null;
            streamRef.current = null;
            remoteSocketIdRef.current = null;
            pendingCandidatesRef.current = [];
        };
    }, [meetingCode]);

    const toggleMute = () => {
        const stream = streamRef.current;
        if (!stream) return;

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) return;

        const nextMuted = !muted;

        audioTracks.forEach((track) => {
            track.enabled = !nextMuted;
        });

        setMuted(nextMuted);
    };

    const toggleCamera = () => {
        const stream = streamRef.current;
        if (!stream) return;

        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length === 0) return;

        const nextCameraOff = !cameraOff;

        videoTracks.forEach((track) => {
            track.enabled = !nextCameraOff;
        });

        setCameraOff(nextCameraOff);
    };

    return (
        <div className="container my-4">
            <div className="card shadow-sm border-0">
                <div className="card-body p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                        <div>
                            <h3 className="mb-1">Meeting Room</h3>
                            <p className="text-muted mb-0">
                                Meeting code: {meetingCode}
                            </p>
                        </div>

                        <span className="badge bg-secondary">
                            {status}
                        </span>
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="alert alert-info" role="status">
                            {message}
                        </div>
                    )}

                    <div className="row g-3">
                        <div className="col-12 col-lg-6">
                            <div className="bg-dark rounded overflow-hidden">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-100"
                                    style={{
                                        display: "block",
                                        minHeight: "220px",
                                        maxHeight: "420px",
                                        objectFit: "cover",
                                    }}
                                />
                            </div>
                            <p className="text-center mt-2 mb-0">
                                You
                            </p>
                        </div>

                        <div className="col-12 col-lg-6">
                            <div className="bg-dark rounded overflow-hidden">
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="w-100"
                                    style={{
                                        display: "block",
                                        minHeight: "220px",
                                        maxHeight: "420px",
                                        objectFit: "cover",
                                    }}
                                />
                            </div>
                            <p className="text-center mt-2 mb-0">
                                Remote participant
                            </p>
                        </div>
                    </div>

                    <div className="d-flex justify-content-center flex-wrap gap-2 mt-4">
                        <button
                            type="button"
                            className={`btn ${
                                muted ? "btn-danger" : "btn-outline-dark"
                            }`}
                            onClick={toggleMute}
                        >
                            {muted ? "Unmute microphone" : "Mute microphone"}
                        </button>

                        <button
                            type="button"
                            className={`btn ${
                                cameraOff ? "btn-danger" : "btn-outline-dark"
                            }`}
                            onClick={toggleCamera}
                        >
                            {cameraOff ? "Turn camera on" : "Turn camera off"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Meetingroom;
