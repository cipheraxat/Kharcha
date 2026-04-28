import { Alert } from 'react-native';

type DetailRow = string | [string, string | number | null | undefined];

export function showDetail(title: string, rows: DetailRow[]) {
  const message = rows
    .map((row) => {
      if (typeof row === 'string') return row;
      const [label, value] = row;
      return `${label}: ${value ?? 'Not available'}`;
    })
    .filter(Boolean)
    .join('\n');

  Alert.alert(title, message || 'No details available');
}
