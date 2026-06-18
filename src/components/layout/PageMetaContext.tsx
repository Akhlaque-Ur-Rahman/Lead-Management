import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PageMeta = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

const DEFAULT_META: PageMeta = { title: 'Dashboard' };

type PageMetaContextValue = {
  meta: PageMeta;
  setMeta: (meta: PageMeta) => void;
};

const PageMetaContext = createContext<PageMetaContextValue | null>(null);

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>(DEFAULT_META);
  const value = useMemo(() => ({ meta, setMeta }), [meta]);
  return (
    <PageMetaContext.Provider value={value}>
      {children}
    </PageMetaContext.Provider>
  );
}

export function usePageMetaState() {
  const ctx = useContext(PageMetaContext);
  if (!ctx) {
    throw new Error('usePageMetaState must be used within PageMetaProvider');
  }
  return ctx.meta;
}

/** Sets page title, description, and actions for the unified AppShell header. */
export function usePageMeta(meta: PageMeta) {
  const ctx = useContext(PageMetaContext);
  if (!ctx) {
    throw new Error('usePageMeta must be used within PageMetaProvider');
  }

  useLayoutEffect(() => {
    ctx.setMeta(meta);
  });

  useEffect(() => {
    return () => ctx.setMeta(DEFAULT_META);
  }, [ctx.setMeta]);
}
