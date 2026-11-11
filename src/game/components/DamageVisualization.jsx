import React, { useState, useEffect, useRef } from 'react';
import { Z_INDEX } from '../constants/zIndex';

const DamageVisualization = ({ 
    health = 1.0,
    enabled = true,
    intensity = 1.0,
    criticalThreshold = 0.2
}) => {

    const maxDamageSustained = useRef(0);

    const [currentDamageLevel, setCurrentDamageLevel] = useState(0);
    const [damageOpacity, setDamageOpacity] = useState(0);
    const [pulseOpacity, setPulseOpacity] = useState(1);

    const [debugSettings, setDebugSettings] = useState({
        enabled: false,
        level: 3,
        opacity: 0.8,
        scale: 1.0
    });

    const getDamageLevel = (healthValue) => {
        const damage = 1.0 - healthValue;
        
        if (damage <= 0.1) return 0;
        if (damage <= 0.3) return 1;
        if (damage <= 0.5) return 2;
        if (damage <= 0.7) return 3;
        if (damage <= 0.9) return 4;
        return 5;
    };

    useEffect(() => {
        if (!enabled) return;

        const currentDamage = 1.0 - health;
        if (health >= 1.0 && maxDamageSustained.current > 0) {
            console.log('REPLAY DETECTED - Resetting damage overlay');
            maxDamageSustained.current = 0;
            setCurrentDamageLevel(0);
            setDamageOpacity(0);
            setPulseOpacity(1);
            return;
        }

        if (currentDamage > maxDamageSustained.current) {
            maxDamageSustained.current = currentDamage;
        }

        const permanentHealth = 1.0 - maxDamageSustained.current;
        const damageLevel = getDamageLevel(permanentHealth);
        
        setCurrentDamageLevel(damageLevel);

        if (damageLevel > 0) {
            const healthPercent = health;
            const baseOpacity = 0.4 + (1.0 - healthPercent) * 0.6;
            setDamageOpacity(baseOpacity * intensity);
        } else {
            setDamageOpacity(0);
        }
    }, [health, enabled, intensity]);

    useEffect(() => {
        const healthPercent = health;
        
        if (currentDamageLevel >= 3 && healthPercent < 0.5) {

            const pulseSpeed = healthPercent < 0.2 ? 800 :
                              healthPercent < 0.3 ? 1200 :
                              1800;
            
            const pulseInterval = setInterval(() => {
                const minOpacity = healthPercent < 0.2 ? 0.6 : 0.8;
                setPulseOpacity(prev => prev === 1 ? minOpacity : 1);
            }, pulseSpeed);
            
            return () => clearInterval(pulseInterval);
        } else {
            setPulseOpacity(1);
        }
    }, [currentDamageLevel, health]);

    useEffect(() => {

        window.setCrackDebug = (settings) => {
            setDebugSettings(settings);
        };

        window.testDamage = (damage = 0.5) => {
            maxDamageSustained.current = damage;
            const testHealth = 1.0 - damage;
            const damageLevel = getDamageLevel(testHealth);
            setCurrentDamageLevel(damageLevel);
            setDamageOpacity(damageLevel > 0 ? 1.0 : 0);
        };
        
        window.resetDamage = () => {
            maxDamageSustained.current = 0;
            setCurrentDamageLevel(0);
            setDamageOpacity(0);
        };
        
        window.forceShowCrack = (level = 3) => {
            setCurrentDamageLevel(level);
            setDamageOpacity(1.0);
        };

        window.damageVisualizationReady = true;

        return () => {
            delete window.setCrackDebug;
            delete window.testDamage;
            delete window.resetDamage;
            delete window.forceShowCrack;
            delete window.damageVisualizationReady;
        };
    }, []);

    if (!enabled) return null;

    if (debugSettings.enabled) {
        return (
            <div 
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: `rgba(255, 0, 0, ${debugSettings.opacity * 0.3})`,
                    border: `4px solid rgba(255, 0, 0, ${debugSettings.opacity})`,
                    opacity: debugSettings.opacity,
                    pointerEvents: 'none',
                    zIndex: Z_INDEX.HUD_BASE + 10,
                    contain: 'layout style',
                    willChange: 'opacity'
                }}
            />
        );
    }

    if (currentDamageLevel === 0 || damageOpacity === 0) {
        return null;
    }

    const edgeIntensity = (currentDamageLevel / 5) * 0.6;
    const borderIntensity = (currentDamageLevel / 5) * 0.8;
    const finalOpacity = edgeIntensity * damageOpacity * pulseOpacity;
    
    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: Z_INDEX.HUD_BASE + 5,
                contain: 'layout style',
                willChange: 'opacity',
                transition: 'all 0.8s ease-in-out'
            }}
        >

            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '20%',
                background: `linear-gradient(to bottom, rgba(255, 0, 0, ${finalOpacity * 0.8}), rgba(255, 0, 0, ${finalOpacity * 0.3}), transparent)`,
                borderTop: `${4 + (currentDamageLevel * 2)}px solid rgba(255, 0, 0, ${borderIntensity * damageOpacity * pulseOpacity})`
            }} />
            

            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '20%',
                background: `linear-gradient(to top, rgba(255, 0, 0, ${finalOpacity * 0.8}), rgba(255, 0, 0, ${finalOpacity * 0.3}), transparent)`,
                borderBottom: `${4 + (currentDamageLevel * 2)}px solid rgba(255, 0, 0, ${borderIntensity * damageOpacity * pulseOpacity})`
            }} />
            

            <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '15%',
                background: `linear-gradient(to right, rgba(255, 0, 0, ${finalOpacity * 0.7}), rgba(255, 0, 0, ${finalOpacity * 0.2}), transparent)`,
                borderLeft: `${4 + (currentDamageLevel * 2)}px solid rgba(255, 0, 0, ${borderIntensity * damageOpacity * pulseOpacity})`
            }} />
            

            <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: '15%',
                background: `linear-gradient(to left, rgba(255, 0, 0, ${finalOpacity * 0.7}), rgba(255, 0, 0, ${finalOpacity * 0.2}), transparent)`,
                borderRight: `${4 + (currentDamageLevel * 2)}px solid rgba(255, 0, 0, ${borderIntensity * damageOpacity * pulseOpacity})`
            }} />
            

            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '30%',
                height: '30%',
                background: `radial-gradient(circle at top left, rgba(255, 0, 0, ${finalOpacity * 0.4}) 0%, transparent 70%)`,
            }} />
            
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '30%',
                height: '30%',
                background: `radial-gradient(circle at top right, rgba(255, 0, 0, ${finalOpacity * 0.4}) 0%, transparent 70%)`,
            }} />
            
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '30%',
                height: '30%',
                background: `radial-gradient(circle at bottom left, rgba(255, 0, 0, ${finalOpacity * 0.4}) 0%, transparent 70%)`,
            }} />
            
            <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '30%',
                height: '30%',
                background: `radial-gradient(circle at bottom right, rgba(255, 0, 0, ${finalOpacity * 0.4}) 0%, transparent 70%)`,
            }} />
        </div>
    );
};

export default DamageVisualization;