import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate checking for existing session
        const storedUser = localStorage.getItem('memotile_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user", e);
                localStorage.removeItem('memotile_user');
            }
        }
        // Small delay to simulate async check and prevent instant flicker if we were fetching from server
        // In a real app with Firebase, onAuthStateChanged would handle this.
        setTimeout(() => {
            setIsLoading(false);
        }, 500);
    }, []);

    const login = async (provider) => {
        setIsLoading(true);
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockUser = {
                    id: 'u123',
                    name: 'Demo User',
                    email: 'user@example.com',
                    provider: provider
                };
                setUser(mockUser);
                localStorage.setItem('memotile_user', JSON.stringify(mockUser));
                setIsLoading(false);
                resolve(mockUser);
            }, 800); // Simulate network delay
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('memotile_user');
    };

    const value = {
        user,
        isLoading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
