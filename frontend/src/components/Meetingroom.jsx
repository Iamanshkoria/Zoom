
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

function Meetingroom({ meetingCode, onLeave }) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef = useRef(null);
    const peerRef = useRef(null);
    const streamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const remoteSocketIdRef = useRef(null);
    const pendingCandidatesRef = useRef([]);

    const [status, setStatus] = useState("Connecting...");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [muted, setMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);
    const [isSharingScreen, setIsSharingScreen] = useState(false);

    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState([]);

    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [chatMessages]);

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
                    if (
                        cancelled ||
                        !remoteVideoRef.current ||
                        !event.streams?.[0]
                    ) {
                        return;
                    }

                    remoteVideoRef.current.srcObject =
                        event.streams[0];

                    remoteVideoRef.current.play().catch(() => {});
                    setMessage("");
                };

                peer.onicecandidate = (event) => {
                    if (
                        event.candidate &&
                        remoteSocketIdRef.current
                    ) {
                        socket.emit("ice-candidate", {
                            candidate: event.candidate,
                            to: remoteSocketIdRef.current,
                        });
                    }
                };

                peer.onconnectionstatechange = () => {
                    if (cancelled) return;

                    switch (peer.connectionState) {
                        case "connected":
                            setStatus("Connected");
                            break;
                        case "connecting":
                            setStatus("Connecting media...");
                            break;
                        case "disconnected":
                            setStatus("Connection interrupted");
                            break;
                        case "failed":
                            setStatus("Connection failed");
                            break;
                        case "closed":
                            setStatus("Call ended");
                            break;
                        default:
                            break;
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
                        setError(
                            "Unable to connect to the meeting server."
                        );
                    }
                });

                socket.on("user-joined", async (userId) => {
                    if (cancelled || !peerRef.current) return;

                    try {
                        remoteSocketIdRef.current = userId;
                        setMessage("");
                        setStatus("Connecting media...");

                        const currentPeer = peerRef.current;
                        const offer = await currentPeer.createOffer();

                        await currentPeer.setLocalDescription(offer);

                        socket.emit("offer", {
                            offer: currentPeer.localDescription,
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
                        const currentPeer = peerRef.current;

                        remoteSocketIdRef.current = from;

                        await currentPeer.setRemoteDescription(
                            new RTCSessionDescription(offer)
                        );

                        for (const candidate of pendingCandidatesRef.current) {
                            await currentPeer.addIceCandidate(
                                new RTCIceCandidate(candidate)
                            );
                        }

                        pendingCandidatesRef.current = [];

                        const answer = await currentPeer.createAnswer();

                        await currentPeer.setLocalDescription(answer);

                        socket.emit("answer", {
                            answer: currentPeer.localDescription,
                            to: from,
                        });
                    } catch (err) {
                        console.error("Error handling offer:", err);
                        setError(
                            "Could not establish the video connection."
                        );
                    }
                });

                socket.on("answer", async ({ answer }) => {
                    if (cancelled || !peerRef.current) return;

                    try {
                        const currentPeer = peerRef.current;

                        await currentPeer.setRemoteDescription(
                            new RTCSessionDescription(answer)
                        );

                        for (const candidate of pendingCandidatesRef.current) {
                            await currentPeer.addIceCandidate(
                                new RTCIceCandidate(candidate)
                            );
                        }

                        pendingCandidatesRef.current = [];
                    } catch (err) {
                        console.error("Error handling answer:", err);
                    }
                });

                socket.on("ice-candidate", async ({ candidate }) => {
                    if (
                        cancelled ||
                        !peerRef.current ||
                        !candidate
                    ) {
                        return;
                    }

                    try {
                        const currentPeer = peerRef.current;

                        if (currentPeer.remoteDescription) {
                            await currentPeer.addIceCandidate(
                                new RTCIceCandidate(candidate)
                            );
                        } else {
                            pendingCandidatesRef.current.push(candidate);
                        }
                    } catch (err) {
                        console.error("Error adding ICE candidate:", err);
                    }
                });

                socket.on("user-left", (userId) => {
                    if (cancelled) return;

                    if (
                        remoteSocketIdRef.current &&
                        userId !== remoteSocketIdRef.current
                    ) {
                        return;
                    }

                    remoteSocketIdRef.current = null;
                    pendingCandidatesRef.current = [];

                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }

                    if (peerRef.current) {
                        peerRef.current.close();
                        peerRef.current = null;
                    }

                    setStatus("Waiting for another participant...");
                    setMessage(
                        "The other participant has left the meeting."
                    );
                });

                // Receive chat messages.
                socket.on("chat-message", (chatMessage) => {
                    if (cancelled || !chatMessage) return;

                    setChatMessages((previous) => [
                        ...previous,
                        chatMessage,
                    ]);
                });

                localStream =
                    await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true,
                    });

                if (cancelled) {
                    localStream
                        .getTracks()
                        .forEach((track) => track.stop());
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
                            "No camera or microphone was found."
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
                localStream
                    .getTracks()
                    .forEach((track) => track.stop());
            }

            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((track) => {
                    track.onended = null;
                    track.stop();
                });

                screenStreamRef.current = null;
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

        const tracks = stream.getAudioTracks();
        if (!tracks.length) return;

        const nextMuted = !muted;

        tracks.forEach((track) => {
            track.enabled = !nextMuted;
        });

        setMuted(nextMuted);
    };

    const toggleCamera = () => {
        const stream = streamRef.current;
        if (!stream) return;

        const tracks = stream.getVideoTracks();
        if (!tracks.length) return;

        const nextCameraOff = !cameraOff;

        tracks.forEach((track) => {
            track.enabled = !nextCameraOff;
        });

        setCameraOff(nextCameraOff);
    };

    const stopScreenShare = async () => {
        const screenStream = screenStreamRef.current;
        if (!screenStream) return;

        screenStreamRef.current = null;

        screenStream.getTracks().forEach((track) => {
            track.onended = null;
            track.stop();
        });

        const cameraTrack = streamRef.current?.getVideoTracks()[0];

        const videoSender = peerRef.current
            ?.getSenders()
            .find((sender) => sender.track?.kind === "video");

        try {
            if (videoSender && cameraTrack) {
                await videoSender.replaceTrack(cameraTrack);
            }

            if (localVideoRef.current && streamRef.current) {
                localVideoRef.current.srcObject = streamRef.current;
            }

            setIsSharingScreen(false);
            setMessage("Screen sharing stopped.");
            setError("");
        } catch (err) {
            console.error("Could not restore camera:", err);
            setError("Could not restore the camera.");
            setIsSharingScreen(false);
        }
    };

    const startScreenShare = async () => {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            setError("Screen sharing is not supported by this browser.");
            return;
        }

        if (!peerRef.current || !streamRef.current) {
            setError("The meeting is not ready for screen sharing.");
            return;
        }

        try {
            setError("");
            setMessage("");

            const screenStream =
                await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false,
                });

            const screenTrack = screenStream.getVideoTracks()[0];

            if (!screenTrack) {
                screenStream.getTracks().forEach((track) => track.stop());
                setError("No screen video track was available.");
                return;
            }

            const videoSender = peerRef.current
                ?.getSenders()
                .find((sender) => sender.track?.kind === "video");

            if (!videoSender) {
                screenStream.getTracks().forEach((track) => track.stop());
                setError("Video connection is not ready.");
                return;
            }

            screenStreamRef.current = screenStream;

            await videoSender.replaceTrack(screenTrack);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = screenStream;
            }

            screenTrack.onended = () => {
                stopScreenShare();
            };

            setIsSharingScreen(true);
            setMessage("You are sharing your screen.");
        } catch (err) {
            console.error("Screen sharing error:", err);

            setError(
                err.name === "NotAllowedError"
                    ? "Screen sharing was cancelled or permission was denied."
                    : "Unable to share your screen."
            );
        }
    };

    const sendChatMessage = (e) => {
        e.preventDefault();

        const text = chatInput.trim();
        const socket = socketRef.current;

        if (!text || !socket?.connected) return;

        socket.emit("chat-message", text);
        setChatInput("");
    };

    const handleLeaveMeeting = () => {
        if (typeof onLeave === "function") {
            onLeave();
        }
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
                                        objectFit: "contain",
                                    }}
                                />
                            </div>

                            <p className="text-center mt-2 mb-0">
                                {isSharingScreen ? "Your screen" : "You"}
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
                                        objectFit: "contain",
                                    }}
                                />
                            </div>

                            <p className="text-center mt-2 mb-0">
                                Remote participant / shared screen
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

                        <button
                            type="button"
                            className={`btn ${
                                isSharingScreen
                                    ? "btn-warning"
                                    : "btn-outline-primary"
                            }`}
                            onClick={
                                isSharingScreen
                                    ? stopScreenShare
                                    : startScreenShare
                            }
                        >
                            {isSharingScreen ? "Stop Sharing" : "Share Screen"}
                        </button>

                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={handleLeaveMeeting}
                        >
                            Leave Meeting
                        </button>
                    </div>

                    {/* Meeting chat */}
                    <div className="card mt-4">
                        <div className="card-header">
                            <h5 className="mb-0">Meeting Chat</h5>
                        </div>

                        <div
                            className="card-body"
                            style={{
                                height: "260px",
                                overflowY: "auto",
                            }}
                        >
                            {chatMessages.length === 0 && (
                                <p className="text-muted text-center mt-3">
                                    No messages yet. Start the conversation!
                                </p>
                            )}

                            {chatMessages.map((chatMessage, index) => {
                                const isMine =
                                    chatMessage.senderId ===
                                    socketRef.current?.id;

                                return (
                                    <div
                                        key={
                                            chatMessage.id ||
                                            `${chatMessage.senderId}-${index}`
                                        }
                                        className={`d-flex mb-3 ${
                                            isMine
                                                ? "justify-content-end"
                                                : "justify-content-start"
                                        }`}
                                    >
                                        <div
                                            className={`rounded p-2 ${
                                                isMine
                                                    ? "bg-primary text-white"
                                                    : "bg-light text-dark"
                                            }`}
                                            style={{
                                                maxWidth: "80%",
                                                overflowWrap: "anywhere",
                                            }}
                                        >
                                            <div className="small fw-bold mb-1">
                                                {isMine ? "You" : "Participant"}
                                            </div>

                                            <div>{chatMessage.text}</div>

                                            <div className="small mt-1 opacity-75">
                                                {chatMessage.time
                                                    ? new Date(
                                                          chatMessage.time
                                                      ).toLocaleTimeString([], {
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                      })
                                                    : ""}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div ref={chatEndRef} />
                        </div>

                        <div className="card-footer">
                            <form
                                onSubmit={sendChatMessage}
                                className="d-flex gap-2"
                            >
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Type a message..."
                                    value={chatInput}
                                    onChange={(e) =>
                                        setChatInput(e.target.value)
                                    }
                                    maxLength={1000}
                                    aria-label="Chat message"
                                />

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={
                                        !chatInput.trim() ||
                                        !socketRef.current?.connected
                                    }
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Meetingroom;
