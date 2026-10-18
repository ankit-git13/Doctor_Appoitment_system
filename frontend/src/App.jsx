import React, { useContext, useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Doctors from './pages/Doctors'
import Login from './pages/Login'
import About from './pages/About'
import Contact from './pages/Contact'
import Appointment from './pages/Appointment'
import MyAppointments from './pages/MyAppointments'
import MyProfile from './pages/MyProfile'
import Footer from './components/Footer'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Verify from './pages/Verify'
import VideoCall from './pages/VideoCall'

// SOCKET & NOTIFICATION IMPORTS
import { io } from 'socket.io-client'
import { AppContext } from './context/AppContext'
import CallNotification from './components/CallNotification' 
import MyReports from './pages/MyReports'

// Initialize Socket outside the component to avoid multiple connection instances
const socket = io('http://localhost:4000', {
    autoConnect: true,
    reconnection: true
})

const App = () => {

    const { userData, token } = useContext(AppContext)
    const [incomingCall, setIncomingCall] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        // Only run socket logic if the user is authenticated and userData is loaded
        if (token && userData?._id) {
            
            // 1. Join a private room based on the Patient's ID
            socket.emit("join_notification_room", userData._id);
            console.log("Joined notification room for user:", userData._id);

            // 2. Remove any old listeners before adding a new one
            socket.off("incoming_call_event");

            // 3. Listen for the 'incoming_call_event' from the doctor
            socket.on("incoming_call_event", (data) => {
                console.log("Incoming call event received:", data);
                
                // Show the ringing overlay
                setIncomingCall(data);

                // Optional: Play a ringing sound
                // const audio = new Audio('/notification-sound.mp3');
                // audio.play().catch(e => console.log("Audio playback blocked by browser"));
            });
        }

        // Cleanup on unmount
        return () => {
            socket.off("incoming_call_event");
        };
    }, [token, userData]);

    return (
        <div className='mx-4 sm:mx-[10%] relative'>
            <ToastContainer />

            {/* RINGING OVERLAY - Appears over all pages when a call comes in */}
            {incomingCall && (
                <CallNotification 
                    data={incomingCall} 
                    onHide={() => setIncomingCall(null)} 
                />
            )}

            <Navbar />
            
            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/doctors' element={<Doctors />} />
                <Route path='/doctors/:speciality' element={<Doctors />} />
                <Route path='/login' element={<Login />} />
                <Route path='/about' element={<About />} />
                <Route path='/contact' element={<Contact />} />
                <Route path='/appointment/:docId' element={<Appointment />} />
                <Route path='/my-appointments' element={<MyAppointments />} />
                <Route path='/my-profile' element={<MyProfile />} />
                <Route path='/verify' element={<Verify />} />
                <Route path='/video-call/:appointmentId' element={<VideoCall />} />
                <Route path='my-reports' element={<MyReports/>} />
            </Routes>
            
            <Footer />
        </div>
    )
}

export default App
