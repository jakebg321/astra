import React, { useEffect, useRef } from 'react';

const BackgroundVideo = ({ 
    src = "/vid.mp4", 
    speed = 0.3, 
    brightness = 0.4, 
    contrast = 1.2,
    overlay = 0.5,
    className = "",
    enableForGame = false 
}) => {
    const videoRef = useRef(null);
    const isGamePage = window.location.pathname === '/game';

    if (isGamePage && !enableForGame) {
        return null;
    }

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            const handleLoadedData = () => {
                video.playbackRate = speed;
                console.log(`Background video playing at ${speed}x speed`);
            };

            const handleCanPlay = () => {
                video.playbackRate = speed;
            };

            video.addEventListener('loadeddata', handleLoadedData);
            video.addEventListener('canplay', handleCanPlay);
            
            return () => {
                video.removeEventListener('loadeddata', handleLoadedData);
                video.removeEventListener('canplay', handleCanPlay);
            };
        }
    }, [speed]);

    return (
        <div className={`fixed inset-0 z-0 pointer-events-none select-none ${className}`}>
            <video
                ref={videoRef}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                style={{ 
                    filter: `brightness(${brightness}) contrast(${contrast})`,
                }}
                onLoadedData={(e) => {
                    e.target.playbackRate = speed;
                }}
            >
                <source src={src} type="video/mp4" />
            </video>
            

            {overlay > 0 && (
                <div 
                    className="absolute inset-0 bg-black"
                    style={{ opacity: overlay }}
                />
            )}
        </div>
    );
};

export default BackgroundVideo;
