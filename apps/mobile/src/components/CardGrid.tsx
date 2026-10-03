import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '../theme/tokens';

/**
 * Two-column grid that keeps every card the same width, including a lone
 * last card (flexWrap + percentage widths drift on Android).
 */
export function CardGrid({ children, columns = 2 }: { children: ReactNode; columns?: number }) {
  const items = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));

  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad-${i}`} style={styles.pad} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'stretch' },
  pad: { flex: 1 },
});
