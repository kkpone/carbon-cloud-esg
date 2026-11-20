import I18N from '@/lang/I18N';
import styles from './index.module.less';

export default function RulesTable({
  table,
  dates,
  title,
}: {
  table: { headers: string[]; rows: string[][] };
  dates: Record<string, string>;
  title: string;
}) {
  return (
    <div className={styles.tableWrap} role='region' aria-label={title}>
      <table>
        <thead>
          <tr>
            {table.headers.map(header => (
              <th key={header} scope='col'>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map(row => (
            <tr key={row[0]}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={table.headers[index]} scope='row'>
                    {cell}
                  </th>
                ) : (
                  <td key={table.headers[index]}>
                    {I18N.template(cell, dates)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
