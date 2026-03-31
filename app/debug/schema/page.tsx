import {
  dbListTableNames,
  dbTableColumns,
} from "@/lib/db-access";
import { getDbState } from "@/lib/db";

type TableNameRow = { name: string };

type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

function safeSqliteTableName(name: string): string {
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe SQLite table name: ${name}`);
  }
  return name;
}

export default async function DebugSchemaPage() {
  const state = getDbState();
  if (!state.ok) {
    return (
      <section>
        <h1>Debug: schema</h1>
        <p>{state.message}</p>
      </section>
    );
  }

  const tables = (await dbListTableNames(state)) as TableNameRow[];

  const sections: { table: string; cols: ColumnInfo[] }[] = [];
  for (const t of tables) {
    try {
      const cols =
        state.kind === "sqlite"
          ? await dbTableColumns(state, safeSqliteTableName(t.name))
          : await dbTableColumns(state, t.name);
      sections.push({ table: t.name, cols });
    } catch {
      sections.push({ table: t.name, cols: [] });
    }
  }

  return (
    <section>
      <h1>Debug: schema</h1>
      <p className="muted">
        Developer-only: SQLite uses <span className="mono">PRAGMA table_info</span>; Postgres uses{" "}
        <span className="mono">information_schema.columns</span>.
      </p>

      {sections.length === 0 ? (
        <p className="muted">No user tables found.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {sections.map((s) => (
            <div key={s.table} className="card" style={{ margin: 0 }}>
              <h2 style={{ marginTop: 0 }} className="mono">
                {s.table}
              </h2>
              {s.cols.length === 0 ? (
                <p className="muted">No columns reported.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>cid</th>
                        <th>name</th>
                        <th>type</th>
                        <th>notnull</th>
                        <th>dflt_value</th>
                        <th>pk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.cols.map((c) => (
                        <tr key={`${s.table}-${c.cid}`}>
                          <td className="mono">{c.cid}</td>
                          <td className="mono">{c.name}</td>
                          <td className="mono">{c.type}</td>
                          <td>{c.notnull}</td>
                          <td className="mono">{c.dflt_value ?? ""}</td>
                          <td>{c.pk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
