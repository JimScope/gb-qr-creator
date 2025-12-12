import { useState, useCallback, useMemo } from "react";
import { splitCSVLine } from "@/utils/utils";

export function useBatch() {
  const [batchMode, setBatchMode] = useState(false);
  const [batchType, setBatchType] = useState<"lines" | "csv">("csv");
  const [batchInput, setBatchInput] = useState("");
  const [zipMode, setZipMode] = useState(true);

  const parseLines = useCallback((text: string) => {
    return text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const [data, title, subtitle, name] = splitCSVLine(line).map((p) =>
          p.trim(),
        );
        return {
          data,
          title,
          subtitle,
          name: name ?? `gbqr-${Math.random().toString(36).slice(2, 6)}`,
        };
      });
  }, []);

  const parseCSV = useCallback((text: string) => {
    const rows = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const items: {
      data: string;
      title: string;
      subtitle: string;
      name: string;
    }[] = [];

    for (const row of rows) {
      const parts = splitCSVLine(row).map((p) => p.trim());
      const data = parts[0];
      if (!data) continue;

      const title = parts[1] ?? "";
      const subtitle = parts[2] ?? "";
      const name = parts[3] ?? `gbqr-${items.length + 1}`;

      items.push({ data, title, subtitle, name });
    }
    return items;
  }, []);

  const parsedCount = useMemo(() => {
    if (!batchInput.trim()) return 0;
    return batchType === "csv"
      ? parseCSV(batchInput).length
      : parseLines(batchInput).length;
  }, [batchInput, batchType, parseCSV, parseLines]);

  const handleCSVFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    setBatchInput(text);
  };

  return {
    batchMode,
    setBatchMode,
    batchType,
    setBatchType,
    batchInput,
    setBatchInput,
    parsedCount,
    zipMode,
    setZipMode,
    parseLines,
    parseCSV,
    handleCSVFile,
  };
}
