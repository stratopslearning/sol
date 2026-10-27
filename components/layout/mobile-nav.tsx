"use client";

import * as React from "react";

type MobileNavContextValue = {
  open: () => void;
};

const MobileNavContext = React.createContext<MobileNavContextValue | null>(
  null,
);

export function MobileNavProvider({
  open,
  children,
}: {
  open: () => void;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ open }), [open]);
  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return React.useContext(MobileNavContext);
}
