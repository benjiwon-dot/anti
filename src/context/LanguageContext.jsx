import React, { createContext, useContext, useState, useEffect } from 'react';
import { STRINGS } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [locale, setLocale] = useState(() => {
        return localStorage.getItem('memotile_locale') || 'TH';
    });

    useEffect(() => {
        localStorage.setItem('memotile_locale', locale);
    }, [locale]);

    const t = STRINGS[locale];

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
