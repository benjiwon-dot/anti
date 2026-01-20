import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Package, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function TabBar() {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { name: t.home, path: '/', icon: Home },
    { name: t.orders, path: '/orders', icon: Package },
    { name: t.profile, path: '/profile', icon: User },
  ];

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.name}
              to={item.path}
              style={{ ...styles.link, color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              <item.icon size={24} strokeWidth={2.5} />
              <span style={styles.label}>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}


const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border)',
    paddingBottom: 'var(--safe-area-bottom)',
    zIndex: 1000,
  },
  container: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '60px',
  },
  link: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    width: '100%',
    height: '100%',
    transition: 'color 0.2s',
  },
  label: {
    fontSize: '10px',
    marginTop: '4px',
    fontWeight: '500',
  }
};
