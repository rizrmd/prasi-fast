import { describe, expect, it } from "bun:test";
import { sortByEstimatedImportance } from "../utils";

describe("sortByEstimatedImportance", () => {
  it("should prioritize primary identifiers", () => {
    const columns = ["created_date", "description", "name", "id_client", "type", "status"];
    const sorted = sortByEstimatedImportance(columns);
    expect(sorted[0]).toBe("name");
  });

  it("should prioritize status fields after identifiers", () => {
    const columns = ["description", "type", "status", "code", "created_by"];
    const sorted = sortByEstimatedImportance(columns);
    expect(sorted[0]).toBe("code");
    expect(sorted[1]).toBe("status");
    expect(sorted[2]).toBe("type");
  });

  it("should skip technical fields", () => {
    const columns = ["name", "created_by", "created_date", "updated_by", "deleted_at", "description"];
    const sorted = sortByEstimatedImportance(columns);
    expect(sorted).not.toContain("created_by");
    expect(sorted).not.toContain("created_date");
    expect(sorted).not.toContain("updated_by");
    expect(sorted).not.toContain("deleted_at");
  });

  it("should handle bilingual terms", () => {
    const columns = ["nama", "tanggal", "kode", "status", "deskripsi"];
    const sorted = sortByEstimatedImportance(columns);
    expect(sorted[0]).toBe("nama");
    expect(sorted[1]).toBe("kode");
    expect(sorted[2]).toBe("status");
  });

  it("should prefer exact matches over partial matches", () => {
    const columns = ["firstname", "name", "username"];
    const sorted = sortByEstimatedImportance(columns);
    expect(sorted[0]).toBe("name");
  });

  it("should sort date fields appropriately", () => {
    const columns = ["birth_date", "start_time", "end_date", "date"];
    const sorted = sortByEstimatedImportance(columns);
    const dateIndex = sorted.indexOf("date");
    expect(dateIndex).toBeLessThan(sorted.indexOf("start_time"));
    expect(dateIndex).toBeLessThan(sorted.indexOf("end_date"));
  });

  it("should sort typical table columns correctly", () => {
    const columns = [
      "created_by",
      "name",
      "status",
      "description",
      "id_client",
      "type",
      "start_date",
      "notes"
    ];
    
    const sorted = sortByEstimatedImportance(columns);
    
    // Expected order:
    // 1. name (primary identifier)
    // 2. status, type (status fields)
    // 3. description, notes (descriptive)
    // 4. start_date (date field)
    // created_by and id_client should be filtered out
    
    expect(sorted).toEqual([
      "name",
      "status",
      "type",
      "description",
      "notes",
      "start_date"
    ]);
  });
});
