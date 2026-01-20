import React from 'react';
import { NavLink } from 'react-router-dom';

export default function SecondaryLink({ to, label }) {
    return (
        <div style={styles.container}>
            <NavLink to={to} style={styles.link}>
                {label}
            </NavLink>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        padding: '10px 0',
    },
    link: {
        color: 'var(--text-secondary)',
        fontSize: '16px',
        fontWeight: '500',
        textDecoration: 'none',
        padding: '10px 20px',
    }
};
