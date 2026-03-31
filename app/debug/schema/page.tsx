import { getDbState } from "@/lib/db";
import { SQL } from "@/lib/sql/queries";

type TableNameRow = { name: string };

type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

function safeIdent(name: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe table name: ${name}`);
  }
  return name;
}

export default function DebugSchemaPage() {
  const state = getDbState();
  if (!state.ok) {
    return (
      <section>
        <h1>Debug: schema</h1>
        <p>{state.message}</p>
      </section>
    );
  }

  const tables = state.db.prepare(SQL.listTableNames).all() as TableNameRow[];

  const sections = tables.map((t) => {
    const table = safeIdent(t.name);
    const cols = state.db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
    return { table: t.name, cols };
  });

  return (
    <section>
      <h1>Debug: schema</h1>
      <p className="muted">
        Developer-only view of the real SQLite schema via <span className="mono">sqlite_master</span>{" "}
        and <span className="mono">PRAGMA table_info</span>.
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
