import { loadFabric } from '../../utils/fabric.js';
import React, { useEffect, useRef, useState } from 'react';

const Banner = ({ 
    user = null, 
    height = 200, 
    width = 800,
    className = '',
    fallbackGradient = 'from-purple-600 to-blue-600'
}) => {
    const canvasRef = useRef(null);
    const rawBanner = user?.personal_banner;
    const imageBanner = user?.customization?.customBanner || (
        typeof rawBanner === 'string' && !/^[{[]/.test(rawBanner.trim()) ? rawBanner : null
    );
    const [bannerLoaded, setBannerLoaded] = useState(false);

    useEffect(() => {
        let disposed = false;
        let canvas;
        const controller = new AbortController();
        setBannerLoaded(false);
        const loadBanner = async () => {
            if (imageBanner || !user?.personal_banner || !canvasRef.current) {
                setBannerLoaded(true);
                return;
            }
            try {
                const fabric = await loadFabric();
                if (disposed || !canvasRef.current) return;
                canvas = new fabric.StaticCanvas(canvasRef.current, { width: Number(width) || 800, height: 200 });
                canvas.setDimensions({ width: '100%', height: '100%' }, { cssOnly: true });
                await canvas.loadFromJSON(user.personal_banner, undefined, { signal: controller.signal });
                if (disposed) return;
                canvas.renderAll();
                setBannerLoaded(true);
            } catch (error) {
                if (!disposed) {
                    console.error('Error loading banner:', error);
                    setBannerLoaded(true);
                }
            }
        };
        void loadBanner();
        return () => {
            disposed = true;
            controller.abort();
            if (canvas) void canvas.dispose();
        };
    }, [user?.personal_banner, imageBanner, width, height]);

    const getFallbackBanner = () => {
        const themes = {
            cosmic: 'from-purple-600 to-blue-600',
            solar: 'from-orange-500 to-red-600',
            ocean: 'from-blue-500 to-teal-600',
            forest: 'from-green-500 to-emerald-600',
            royal: 'from-purple-500 to-pink-600',
            stealth: 'from-gray-600 to-slate-700'
        };

        const userTheme = user?.theme || 'cosmic';
        const gradientClass = themes[userTheme] || fallbackGradient;

        return (
            <div 
                className={`w-full bg-gradient-to-r ${gradientClass} flex items-center justify-center`}
                style={{ height: `${height}px` }}
            >
                <div className="text-white text-center">
                    <h3 className="text-2xl font-bold mb-2">{user?.display_name || user?.username || 'Player'}</h3>
                    <p className="text-lg opacity-75">@{user?.username || 'player'}</p>
                </div>
            </div>
        );
    };

    return (
        <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ height: `${height}px` }}>

            {imageBanner ? (
                <>
                    <img 
                        src={imageBanner}
                        alt={`${user.username}'s banner`}
                        className="w-full h-full object-cover"
                        onLoad={() => setBannerLoaded(true)}
                    />
                    {!bannerLoaded && (
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </>
            ) : user?.personal_banner ? (
                <>
                    <canvas 
                        ref={canvasRef}
                        className={`w-full h-full transition-opacity duration-300 ${bannerLoaded ? 'opacity-100' : 'opacity-0'}`}
                        style={{ maxWidth: '100%', height: '100%' }}
                    />
                    {!bannerLoaded && (
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </>
            ) : (
                getFallbackBanner()
            )}
            

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
    );
};

export default Banner;