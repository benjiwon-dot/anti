import React from 'react';

/**
 * ProductTile Component
 * Renders a square tile with a refined 3D thickness (2cm visual depth)
 */
export default function ProductTile({ src, size = 200, style = {} }) {
    return (
        <div style={{
            ...styles.container,
            width: size,
            height: size,
            ...style
        }}>
            {/* Main Face - No outline as requested */}
            <div style={styles.face}>
                <img
                    src={src}
                    alt="Tile"
                    style={styles.image}
                />
            </div>

            {/* Soft Shadow Layer */}
            <div style={{
                ...styles.shadow,
                width: size,
                height: size,
            }} />

            {/* Depth Strips (2cm side edge simulation) */}
            <div style={{
                ...styles.bottomEdge,
                width: size,
            }} />
            <div style={{
                ...styles.rightEdge,
                height: size,
            }} />
        </div>
    );
}

const styles = {
    container: {
        position: 'relative',
        backgroundColor: 'transparent',
    },
    face: {
        position: 'relative',
        width: '100%',
        height: '100%',
        zIndex: 3,
        backgroundColor: '#f6f7f9',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    shadow: {
        position: 'absolute',
        top: '6px',
        left: '6px',
        backgroundColor: 'rgba(0,0,0,0.12)',
        filter: 'blur(12px)',
        zIndex: 1,
    },
    bottomEdge: {
        position: 'absolute',
        bottom: '-3px',
        left: '1px',
        height: '4px',
        backgroundColor: '#222', // Darker for thickness
        zIndex: 2,
        transform: 'skewX(-45deg)',
    },
    rightEdge: {
        position: 'absolute',
        right: '-3px',
        top: '1px',
        width: '4px',
        backgroundColor: '#000', // Deep black for edge
        zIndex: 2,
        transform: 'skewY(-45deg)',
    }
};
