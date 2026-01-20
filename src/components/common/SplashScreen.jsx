import React, { useEffect, useState } from 'react';

/**
 * Premium Splash Screen
 * - Max 2s duration
 * - Tap to skip
 * - Fade in/out only
 */
export default function SplashScreen({ onFinish }) {
    const [fade, setFade] = useState('in');

    useEffect(() => {
        // Start fade out after 1.5s (max 2s total)
        const fadeOutTimer = setTimeout(() => {
            setFade('out');
        }, 1500);

        // Finish after 1.9s (to ensure fade out completes within 2s)
        const finishTimer = setTimeout(() => {
            onFinish();
        }, 1900);

        return () => {
            clearTimeout(fadeOutTimer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    return (
        <div
            onClick={onFinish} // Tap to skip
            style={{
                ...styles.container,
                opacity: fade === 'in' ? 1 : 0,
                transition: 'opacity 0.4s ease-out',
                cursor: 'pointer'
            }}
        >
            <div style={styles.square}>
                <h1 style={styles.text}>MEMOTILE</h1>
                {/* Slogan removed as requested */}
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        userSelect: 'none',
    },
    square: {
        width: '160px',
        height: '160px',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)', // Premium soft shadow
        // Square corners (0 radius)
    },
    text: {
        fontSize: '22px', // Slightly larger as suggested for branding
        fontWeight: '700',
        letterSpacing: '0.12em',
        color: '#111111',
        margin: 0,
        padding: 0,
    }
};
