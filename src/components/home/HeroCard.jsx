import React from 'react';

export default function HeroCard({ onClick, children }) {
    return (
        <div style={styles.container} onClick={onClick}>
            <div style={styles.card}>
                <img
                    src="https://images.unsplash.com/photo-1513161455079-7dc1bad1563f?q=80&w=800&auto=format&fit=crop"
                    alt="Hero"
                    style={styles.image}
                />
                {children}
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px',
    },
    card: {
        width: '100%',
        maxWidth: '340px',
        aspectRatio: '1',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        transform: 'translateZ(0)', // Hardware acc
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transition: 'transform 0.5s ease',
    }
};
