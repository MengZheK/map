import { readFile } from "fs/promises";
import * as XLSX from "xlsx";
import { parseUrlSpreadsheetRows, type ParseUrlSpreadsheetResult } from "../shared/parseUrlSpreadsheet";

export async function parseSpreadsheetUrlFile(filePath: string): Promise<ParseUrlSpreadsheetResult> {
  const buf = await readFile(filePath);
  const lower = filePath.toLowerCase();
  const isCsv = lower.endsWith(".csv");
  const wb = XLSX.read(buf, { type: "buffer", ...(isCsv ? { raw: false } : {}) });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { ok: false, error: "工作簿中没有工作表" };
  }
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    return { ok: false, error: "无法读取第一个工作表" };
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  return parseUrlSpreadsheetRows(rows);
}
