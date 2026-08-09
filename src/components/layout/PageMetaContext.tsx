import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type PageMeta = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

type PageMetaState = {
  title: string;
  description?: string;
};

const DEFAULT_META: PageMetaState = { title: 'Dashboard' };

type PageMetaContextValue = {
  meta: PageMetaState;
  actionsRef: React.MutableRefObject<ReactNode>;
  setMeta: React.Dispatch<React.SetStateAction<PageMetaState>>;
  subscribe: (listener: () => void) => () => void;
  notify: () => void;
};

const PageMetaContext = createContext<PageMetaContextValue | null>(null);

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMetaState>(DEFAULT_META);
  const actionsRef = useRef<ReactNode>(undefined);
  const listenersRef = useRef(new Set<() => void>());

  const notify = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({ meta, actionsRef, setMeta, subscribe, notify }),
    [meta, notify, subscribe]
  );

  return (
    <PageMetaContext.Provider value={value}>
      {children}
    </PageMetaContext.Provider>
  );
}

function usePageMetaContext() {
  const ctx = useContext(PageMetaContext);
  if (!ctx) {
    throw new Error('PageMeta hooks must be used within PageMetaProvider');
  }
  return ctx;
}

export function usePageMetaState() {
  const { meta, actionsRef, subscribe } = usePageMetaContext();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => subscribe(rerender), [subscribe, rerender]);

  return {
    title: meta.title,
    description: meta.description,
    actions: actionsRef.current,
  };
}

/** Sets page title, description, and actions for the unified AppShell header.
 *  Document <title>/meta tags are owned by DocumentSeo (route-based). */
export function usePageMeta(meta: PageMeta) {
  const { actionsRef, setMeta, notify } = usePageMetaContext();

  actionsRef.current = meta.actions;

  useLayoutEffect(() => {
    setMeta((prev) => {
      if (prev.title === meta.title && prev.description === meta.description) {
        return prev;
      }
      return { title: meta.title, description: meta.description };
    });
  }, [meta.title, meta.description, setMeta]);

  // Sync header actions without setState on every parent render.
  useLayoutEffect(() => {
    notify();
  });

  useEffect(() => {
    return () => {
      actionsRef.current = undefined;
      setMeta(DEFAULT_META);
    };
  }, [actionsRef, setMeta]);
}
