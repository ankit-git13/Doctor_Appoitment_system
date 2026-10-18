import React, { useEffect, useRef, useContext, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { io } from 'socket.io-client';

const VideoCall = () => {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const { token, backendUrl, userData } = useContext(AppContext);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerRef = useRef(null);
    const socketRef = useRef(null);
    const localStreamRef = useRef(null);

    const [connected, setConnected] = useState(false);
    const [waiting, setWaiting] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);

    useEffect(() => {
        if (!token) { navigate('/login'); return; }

        // Connect to socket
        socketRef.current = io(backendUrl);

        // Get camera/mic
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // Join the room
                socketRef.current.emit('join-room', appointmentId, userData?._id);

                // Doctor joined — initiate connection
                socketRef.current.on('user-connected', () => {
                    setWaiting(false);
                    setConnected(true);
                    createOffer(stream);
                });

                // Receive offer from doctor
                socketRef.current.on('offer', async (offer) => {
                    setWaiting(false);
                    setConnected(true);
                    await createAnswer(offer, stream);
                });

                socketRef.current.on('answer', async (answer) => {
                    await peerRef.current?.setRemoteDescription(
                        new RTCSessionDescription(answer)
                    );
                });

                socketRef.current.on('ice-candidate', async (candidate) => {
                    try {
                        await peerRef.current?.addIceCandidate(
                            new RTCIceCandidate(candidate)
                        );
                    } catch (e) { console.error(e); }
                });

                socketRef.current.on('user-disconnected', () => {
                    setConnected(false);
                    setWaiting(true);
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }
                });
            })
            .catch(err => console.error('Media error:', err));

        return () => {
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            peerRef.current?.close();
            socketRef.current?.disconnect();
        };
    }, [appointmentId, token, backendUrl, navigate, userData]);

    const createPeer = (stream) => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ]
        });

        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peer.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', event.candidate, appointmentId);
            }
        };

        return peer;
    };

    const createOffer = async (stream) => {
        peerRef.current = createPeer(stream);
        const offer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(offer);
        socketRef.current.emit('offer', offer, appointmentId);
    };

    const createAnswer = async (offer, stream) => {
        peerRef.current = createPeer(stream);
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        socketRef.current.emit('answer', answer, appointmentId);
    };

    const toggleMic = () => {
        const audio = localStreamRef.current?.getAudioTracks()[0];
        if (audio) { audio.enabled = !audio.enabled; setMicOn(audio.enabled); }
    };

    const toggleCam = () => {
        const video = localStreamRef.current?.getVideoTracks()[0];
        if (video) { video.enabled = !video.enabled; setCamOn(video.enabled); }
    };

    const leaveCall = () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        peerRef.current?.close();
        socketRef.current?.disconnect();
        navigate(-1);
    };

    return (
        <div className='w-full min-h-screen bg-[#111827] flex flex-col font-sans'>
            <header className='w-full bg-[#1F2937] text-white px-4 md:px-8 py-3 flex justify-between items-center shadow-lg sticky top-0 z-50'>
                <h1 className='text-sm md:text-xl font-bold tracking-tight'>
                    PRESCRIPTO <span className='text-blue-400'>LIVE</span>
                </h1>
                <div className='flex items-center gap-2'>
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></span>
                    <span className='text-xs text-gray-300'>{connected ? 'Connected' : 'Waiting...'}</span>
                </div>
                <button onClick={leaveCall} className='bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-xs font-bold'>
                    EXIT
                </button>
            </header>

            <main className='flex-1 flex flex-col'>
                {waiting && (
                    <div className='absolute inset-0 flex flex-col items-center justify-center gap-4 text-white z-10 bg-[#111827]'>
                        <div className='w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
                        <p className='text-xl font-bold'>Waiting for Doctor...</p>
                        <p className='text-gray-400 text-sm'>The call will connect automatically when your doctor joins.</p>
                        <button onClick={leaveCall} className='mt-4 text-red-400 text-sm underline'>Cancel & Go Back</button>
                    </div>
                )}

                {/* Video Grid */}
                <div className='flex-1 relative bg-black'>
                    {/* Remote (Doctor) Video — full screen */}
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className='w-full h-[80vh] object-cover'
                    />

                    {/* Local (Patient) Video — picture in picture */}
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className='absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 object-cover rounded-lg border-2 border-blue-500 shadow-xl'
                    />
                </div>

                {/* Controls */}
                <div className='bg-[#1F2937] py-4 flex items-center justify-center gap-6'>
                    <button
                        onClick={toggleMic}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all ${micOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600'}`}
                    >
                        {micOn ? '🎙' : '🔇'}
                    </button>
                    <button
                        onClick={leaveCall}
                        className='w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white text-2xl shadow-lg'
                    >
                        📵
                    </button>
                    <button
                        onClick={toggleCam}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg transition-all ${camOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600'}`}
                    >
                        {camOn ? '📹' : '🚫'}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default VideoCall;