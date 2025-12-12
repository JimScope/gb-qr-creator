import { useState, useCallback } from "react";
import { saveHistory } from "@/utils/utils";
import { GBPalette } from "@/lib/gb-qr";
import { toast } from "sonner";

export interface IHistoryEntry {
  id: string;
  title: string;
  subtitle: string;
  data: string;
  palette: GBPalette;
  scale: number;
  padding: number;
  qrSize: number;
  createdAt: number;
}

export function useHistory() {
  const [history, setHistory] = useState<IHistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem("gb-qr-history");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((entry: IHistoryEntry) => {
    setHistory((prevHistory) => {
      const filteredHistory = prevHistory.filter(
        (h) =>
          !(
            h.data === entry.data &&
            h.title === entry.title &&
            h.subtitle === entry.subtitle
          ),
      );
      const newHistory = [entry, ...filteredHistory].slice(0, 5);
      saveHistory(newHistory);
      return newHistory;
    });
  }, []);

  const deleteFromHistory = useCallback(
    (id: string) => {
      const newHistory = history.filter((h) => h.id !== id);
      setHistory(newHistory);
      saveHistory(newHistory);
      toast.success("DELETED!");
    },
    [history],
  );

  const loadFromHistory = useCallback((entry: IHistoryEntry) => {
    toast.success("LOADED FROM HISTORY!");
    return entry;
  }, []);

  return {
    history,
    addToHistory,
    deleteFromHistory,
    loadFromHistory,
  };
}
