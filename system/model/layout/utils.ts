// Priority levels for different types of fields
const primaryIdentifiers = ["name", "nama", "code", "kode", "number", "nomor", "title", "judul"];
const statusFields = ["status", "type", "tipe", "category", "kategori", "state", "condition", "kondisi"];
const descriptiveFields = ["description", "desc", "deskripsi", "detail", "keterangan", "notes", "catatan", "summary", "ringkasan"];
const dateFields = ["date", "tanggal", "time", "waktu", "start", "end", "mulai", "selesai"];
const technicalFields = ["created", "updated", "deleted", "modified", "id_client", "client"];

// Skip these system/technical fields entirely
const skipFields = ["created_by", "created_date", "updated_by", "updated_date", "deleted_at", "id_client"];

export function sortByEstimatedImportance(columns: string[]): string[] {
  // Filter out technical fields we want to skip
  const relevantColumns = columns.filter(col => !skipFields.some(skip => col.includes(skip)));
  
  return relevantColumns.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    // Helper function to check if a string matches any terms in an array
    const matchesAnyTerm = (str: string, terms: string[]) => 
      terms.some(term => str.includes(term));

    // Get priority level (lower number = higher priority)
    const getPriorityLevel = (col: string): number => {
      if (matchesAnyTerm(col, primaryIdentifiers)) return 1;
      if (matchesAnyTerm(col, statusFields)) return 2;
      if (matchesAnyTerm(col, descriptiveFields)) return 3;
      if (matchesAnyTerm(col, dateFields)) return 4;
      // Foreign keys should come later but before technical fields
      if (col.startsWith('id_')) return 5;
      if (matchesAnyTerm(col, technicalFields)) return 6;
      return 5; // Default priority for other fields
    };

    const aPriority = getPriorityLevel(aLower);
    const bPriority = getPriorityLevel(bLower);

    // First sort by priority level
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Within the same priority level:
    // 1. For primary identifiers: prefer exact matches over partial matches
    if (aPriority === 1) {
      const aExact = primaryIdentifiers.some(term => aLower === term);
      const bExact = primaryIdentifiers.some(term => bLower === term);
      if (aExact !== bExact) return aExact ? -1 : 1;
    }

    // 2. For status/type fields: prefer 'status' over other type indicators
    if (aPriority === 2) {
      if (aLower === 'status' && bLower !== 'status') return -1;
      if (bLower === 'status' && aLower !== 'status') return 1;
    }

    // 3. For date fields: prefer main date fields
    if (aPriority === 4) {
      const aMain = ['date', 'tanggal'].some(term => aLower === term);
      const bMain = ['date', 'tanggal'].some(term => bLower === term);
      if (aMain !== bMain) return aMain ? -1 : 1;
    }

    // For descriptive fields: maintain order from descriptiveFields array
    if (aPriority === 3) {
      const aIndex = descriptiveFields.findIndex(term => aLower.includes(term));
      const bIndex = descriptiveFields.findIndex(term => bLower.includes(term));
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
    }
    
    // Finally, sort by length for fields with same priority
    return aLower.length - bLower.length;
  });
}
