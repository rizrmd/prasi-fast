import { ModelConfig } from "system/types";
import { BaseModel } from "../model";

interface ChangelogData {
  id: number;
  table_name: string;
  record_id: number;
  action: "create" | "update" | "delete";
  previous_data?: any;
  new_data: any;
  created_at: Date;
  created_by?: number;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

export class Changelog extends BaseModel<ChangelogData, any> {
  protected declare data: ChangelogData;
  protected declare currentUser: any;
  protected declare prisma: any;

  config: ModelConfig = {
    modelName: "Changelog",
    tableName: "s_hangelog",
    columns: {
      table_name: {
        type: "string",
        label: "Table Name",
        required: true,
        filterable: true,
      },
      record_id: {
        type: "number",
        label: "Record ID",
        required: true,
      },
      action: {
        type: "enum",
        label: "Action",
        enum: ["create", "update", "delete"],
        required: true,
        filterable: true,
        format: (value: string): string =>
          ({
            create: "🆕 Created",
            update: "📝 Updated",
            delete: "🗑️ Deleted",
          }[value] || value),
      },
      previous_data: {
        type: "json",
        label: "Previous Data",
      },
      new_data: {
        type: "json",
        label: "New Data",
        required: true,
      },
      created_by: {
        type: "relation",
        label: "Created By",
        relation: {
          model: "User",
          field: "id",
        },
      },
    },
    // No caching for changelog
  };

  title(): string {
    const action =
      this.config.columns.action.format?.(this.data?.action) ||
      this.data?.action;
    return `${action} ${this.data?.table_name} #${this.data?.record_id}`;
  }

  // Custom methods
  async findForRecord(
    tableName: string,
    recordId: number
  ): Promise<ChangelogData[]> {
    return this.prisma.changelog.findMany({
      where: {
        ...this.getDefaultConditions(),
        table_name: tableName,
        record_id: recordId,
      },
      select: {
        id: true,
        table_name: true,
        record_id: true,
        action: true,
        previous_data: true,
        new_data: true,
        created_at: true,
        created_by: true,
      },
      orderBy: {
        created_at: "desc",
      },
    }) as unknown as ChangelogData[];
  }

  async getDiff(id: number): Promise<Record<string, { old?: any; new?: any }>> {
    const entry = await super.findFirst(id);
    if (!entry) throw new Error("Changelog entry not found");

    const diff: Record<string, { old?: any; new?: any }> = {};

    if (entry.action === "create") {
      Object.keys(entry.new_data).forEach((key) => {
        diff[key] = { new: entry.new_data[key] };
      });
    } else if (entry.action === "delete") {
      Object.keys(entry.previous_data).forEach((key) => {
        diff[key] = { old: entry.previous_data[key] };
      });
    } else {
      // For updates, compare previous and new data
      const allKeys = new Set([
        ...Object.keys(entry.previous_data || {}),
        ...Object.keys(entry.new_data || {}),
      ]);

      allKeys.forEach((key) => {
        const oldValue = entry.previous_data?.[key];
        const newValue = entry.new_data?.[key];

        if (oldValue !== newValue) {
          diff[key] = {
            old: oldValue,
            new: newValue,
          };
        }
      });
    }

    return diff;
  }
}

// Export singleton instance
export const changelogModel = new Changelog();
