import { createContext, useContext, type ReactNode } from 'react';

export type TopBarPortalContextValue = {
  setTopBarContent: (content: ReactNode | null) => void;
};

const TopBarPortalContext = createContext<TopBarPortalContextValue | null>(null);

export const useTopBarPortal = () => useContext(TopBarPortalContext);

export default TopBarPortalContext;
