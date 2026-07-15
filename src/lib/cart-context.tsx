"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { CartLine } from "./types";

const STORAGE_KEY = "rcc-cart-v1";

/**
 * A cart line is uniquely identified by slug + size + personalization, so a
 * jersey for "HARSHITA #88" is a separate line from one for "PRIYA #10".
 */
function customKey(custom?: Record<string, string>) {
  if (!custom) return "";
  return Object.keys(custom)
    .sort()
    .map((k) => `${k}=${custom[k]}`)
    .join("&");
}

function lineKey(slug: string, size?: string, custom?: Record<string, string>) {
  return `${slug}::${size ?? ""}::${customKey(custom)}`;
}

type State = { lines: CartLine[] };

type LineId = {
  slug: string;
  size: string | undefined;
  custom: Record<string, string> | undefined;
};

type Action =
  | { type: "add"; line: CartLine }
  | ({ type: "setQty"; qty: number } & LineId)
  | ({ type: "remove" } & LineId)
  | { type: "clear" }
  | { type: "hydrate"; lines: CartLine[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { lines: action.lines };
    case "add": {
      const key = lineKey(action.line.slug, action.line.size, action.line.custom);
      const existing = state.lines.find(
        (l) => lineKey(l.slug, l.size, l.custom) === key,
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            lineKey(l.slug, l.size, l.custom) === key
              ? { ...l, qty: l.qty + action.line.qty }
              : l,
          ),
        };
      }
      return { lines: [...state.lines, action.line] };
    }
    case "setQty": {
      const key = lineKey(action.slug, action.size, action.custom);
      return {
        lines: state.lines
          .map((l) =>
            lineKey(l.slug, l.size, l.custom) === key
              ? { ...l, qty: action.qty }
              : l,
          )
          .filter((l) => l.qty > 0),
      };
    }
    case "remove": {
      const key = lineKey(action.slug, action.size, action.custom);
      return {
        lines: state.lines.filter(
          (l) => lineKey(l.slug, l.size, l.custom) !== key,
        ),
      };
    }
    case "clear":
      return { lines: [] };
    default:
      return state;
  }
}

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQty: (
    slug: string,
    size: string | undefined,
    custom: Record<string, string> | undefined,
    qty: number,
  ) => void;
  remove: (
    slug: string,
    size: string | undefined,
    custom: Record<string, string> | undefined,
  ) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted cart on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", lines: JSON.parse(raw) });
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  // Persist on change (after first hydrate so we don't clobber storage).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      /* storage full / unavailable */
    }
  }, [state.lines, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = state.lines.reduce((n, l) => n + l.qty * l.price, 0);
    return {
      lines: state.lines,
      count,
      subtotal,
      add: (line) => {
        dispatch({ type: "add", line });
        setIsOpen(true);
      },
      setQty: (slug, size, custom, qty) =>
        dispatch({ type: "setQty", slug, size, custom, qty }),
      remove: (slug, size, custom) =>
        dispatch({ type: "remove", slug, size, custom }),
      clear: () => dispatch({ type: "clear" }),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    };
  }, [state.lines, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
