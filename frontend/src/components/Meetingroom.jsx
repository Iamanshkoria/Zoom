
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function Meetingroom({ meetingCode }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const remoteSocketIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const [status, setStatus] = useState("Connecting...");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    let active = true;
    let makingOffer = false;

    pendingCandidatesRef.current = [];

    const socket = io("http://localhost:8000");

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });

    socketRef.current = socket;
    peerRef.current = peer;

    const flushCandidates = async () => {
      while (
        pendingCandidatesRef.current.length > 0 &&
        peer.remoteDescription
      ) {
        const candidate = pendingCandidatesRef.current.shift();

        try {
          await peer.addIceCandidate(candidate);
        } catch (err) {
          console.error("ICE candidate error:", err);
        }
      }
    };

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        console.log(
          "LOCAL AUDIO TRACKS:",
          stream.getAudioTracks().map((track) => ({
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          }))
        );

        console.log(
          "LOCAL VIDEO TRACKS:",
          stream.getVideoTracks().map((track) => ({
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState,
          }))
        );

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Add both audio and video tracks to WebRTC.
        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        setStatus("Camera and microphone ready");
      } catch (err) {
        console.error("Media access error:", err);
        setError(
          `Camera/microphone access failed: ${err.message}`
        );
        setStatus("Media access failed");
      }
    };

    peer.ontrack = async (event) => {
      console.log("REMOTE TRACK RECEIVED:", {
        kind: event.track.kind,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState,
        streams: event.streams.length,
      });

      if (!active || !remoteVideoRef.current) return;

      if (event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];

        try {
          await remoteVideoRef.current.play();
          console.log("Remote media playback started");
        } catch (err) {
          console.error("Remote playback failed:", err);
          setError(
            "Remote media autoplay was blocked. Click the remote video to start playback."
          );
        }
      } else {
        console.warn("Remote track has no associated stream");
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
      console.log("Peer connection:", peer.connectionState);

      if (peer.connectionState === "connected") {
        setStatus("Connected");
        setError("");
      } else if (peer.connectionState === "connecting") {
        setStatus("Connecting to participant...");
      } else if (
        peer.connectionState === "disconnected" ||
        peer.connectionState === "failed"
      ) {
        setStatus("Connection interrupted");
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log("ICE connection:", peer.iceConnectionState);
    };

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join-meeting", meetingCode);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setError("Could not connect to the meeting server.");
    });

    socket.on("user-joined", async (userId) => {
      console.log("USER-JOINED EVENT RECEIVED:", userId);

      remoteSocketIdRef.current = userId;

      if (
        makingOffer ||
        peer.signalingState !== "stable"
      ) {
        console.warn("Skipping offer: peer is not ready");
        return;
      }

      makingOffer = true;

      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit("offer", {
          offer: peer.localDescription,
          to: userId,
        });

        console.log("Offer sent to:", userId);
        setStatus("Calling participant...");
      } catch (err) {
        console.error("Offer creation failed:", err);
      } finally {
        makingOffer = false;
      }
    });

    socket.on("offer", async ({ offer, from }) => {
      console.log("Offer received from:", from);
      remoteSocketIdRef.current = from;

      try {
        if (peer.signalingState !== "stable") {
          console.warn("Cannot accept offer in current state");
          return;
        }

        await peer.setRemoteDescription(offer);
        await flushCandidates();

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit("answer", {
          answer: peer.localDescription,
          to: from,
        });

        console.log("Answer sent to:", from);
        setStatus("Connecting to participant...");
      } catch (err) {
        console.error("Offer handling failed:", err);
      }
    });

    socket.on("answer", async ({ answer, from }) => {
      console.log("Answer received from:", from);

      try {
        await peer.setRemoteDescription(answer);
        await flushCandidates();
      } catch (err) {
        console.error("Answer handling failed:", err);
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        if (!peer.remoteDescription) {
          pendingCandidatesRef.current.push(candidate);
        } else {
          await peer.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error("Adding ICE candidate failed:", err);
      }
    });

    startMedia();

    return () => {
      active = false;

      socket.disconnect();
      peer.close();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
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

    if (tracks.length === 0) {
      setError("No microphone track is available.");
      return;
    }

    const nextMuted = !muted;

    tracks.forEach((track) => {
      track.enabled = !nextMuted;
    });

    setMuted(nextMuted);
    console.log("Microphone muted:", nextMuted);
  };

  const toggleCamera = () => {
    const stream = streamRef.current;

    if (!stream) return;

    const tracks = stream.getVideoTracks();

    if (tracks.length === 0) {
      setError("No camera track is available.");
      return;
    }

    const nextCameraOff = !cameraOff;

    tracks.forEach((track) => {
      track.enabled = !nextCameraOff;
    });

    setCameraOff(nextCameraOff);
    console.log("Camera off:", nextCameraOff);
  };

  return (
    <div className="container py-4">
      <h2 className="mb-2">Meeting Room</h2>

      <p className="text-muted">
        Meeting code: {meetingCode}
      </p>

      <p role="status">{status}</p>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-6">
          <h5>Your Camera</h5>

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-100 bg-dark rounded"
            style={{ minHeight: "220px" }}
          />
        </div>

        <div className="col-md-6">
          <h5>Other Participant</h5>

          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            controls
            className="w-100 bg-dark rounded"
            style={{ minHeight: "220px" }}
          />
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          className={`btn ${muted ? "btn-danger" : "btn-primary"}`}
          onClick={toggleMute}
        >
          {muted ? "Unmute Microphone" : "Mute Microphone"}
        </button>

        <button
          type="button"
          className={`btn ${cameraOff ? "btn-danger" : "btn-primary"}`}
          onClick={toggleCamera}
        >
          {cameraOff ? "Turn Camera On" : "Turn Camera Off"}
        </button>
      </div>
    </div>
  );
}