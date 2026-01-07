import React from 'react';

export type SectionId = 'home' | 'team' | 'downloads' | 'gallery' | 'camp' | 'registration';

type SectionContextValue = {
  activeSection: SectionId;
  setActiveSection: (section: SectionId) => void;
};

const SectionContext = React.createContext<SectionContextValue | undefined>(undefined);

export const SectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = React.useState<SectionId>('home');

  return <SectionContext.Provider value={{ activeSection, setActiveSection }}>{children}</SectionContext.Provider>;
};

export const useSection = (): SectionContextValue => {
  const context = React.useContext(SectionContext);
  if (!context) {
    throw new Error('useSection must be used within SectionProvider');
  }
  return context;
};
