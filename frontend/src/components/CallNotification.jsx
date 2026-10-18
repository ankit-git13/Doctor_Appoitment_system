import React from 'react';
import { useNavigate } from 'react-router-dom';

const CallNotification = ({ data, onHide }) => {
    const navigate = useNavigate();

    const handleAccept = () => {
        navigate(`/video-call/${data.appointmentId}`);
        onHide();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-pulse-subtle">
                <div className="bg-blue-600 p-8 flex flex-col items-center text-white">
                    {/* Pulsing Avatar */}
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping"></div>
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold shadow-lg">
                            {data.doctorName ? data.doctorName.charAt(0) : 'D'}
                        </div>
                    </div>
                    <h2 className="mt-4 text-xl font-bold">Incoming Call</h2>
                    <p className="text-sm opacity-90 uppercase tracking-widest mt-1">
                        Dr. {data.doctorName}
                    </p>
                </div>
                
                <div className="p-6 text-center">
                    <p className="text-slate-600 text-sm mb-6">
                        Your doctor has started the secure video consultation.
                    </p>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={onHide}
                            className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-all uppercase text-xs"
                        >
                            Decline
                        </button>
                        <button 
                            onClick={handleAccept}
                            className="flex-1 py-3 bg-green-500 rounded-xl text-white font-bold hover:bg-green-600 transition-all uppercase text-xs shadow-lg shadow-green-200"
                        >
                            Accept & Join
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CallNotification;