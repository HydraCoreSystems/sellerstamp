import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

export const colors = {
  ink: '#1B2438',
  inkSoft: '#56607A',
  line: '#DDE2EC',
  bg: '#F6F7FA',
  card: '#FFFFFF',
  brand: '#1F2A44',
  accent: '#2A9D8F',
  accentTint: '#E3F4F1',
  danger: '#B3261E',
  warn: '#9A6700',
};

export const SWATCHES = ['#FFFFFF', '#000000', '#F5EBD7', '#FFD54A', '#FF9F43', '#E74C3C', '#F78FB3', '#8E5CD9', '#3B82F6', '#2A9D8F', '#3E7A4B', '#8A93A6'];

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === 'primary' ? colors.brand : kind === 'secondary' ? colors.card : 'transparent';
  const fg = kind === 'primary' ? '#FFFFFF' : colors.brand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: kind === 'secondary' ? colors.line : bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ title, active, onPress }: { title: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.brand, borderColor: colors.brand }]}
    >
      <Text style={[styles.chipText, active && { color: '#FFFFFF' }]}>{title}</Text>
    </Pressable>
  );
}

export function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#9AA3B8"
        style={styles.input}
        autoCorrect={false}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A slider drawn with plain views, so the app needs no extra native module. */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const [width, setWidth] = useState(1);
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min));
  const at = (x: number) => onChange(snap(min + (Math.min(width, Math.max(0, x)) / width) * (max - min)));
  const pct = ((value - min) / (max - min)) * 100;
  const shown = format ? format(value) : String(Math.round(value * 100) / 100);
  return (
    <View style={{ marginBottom: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{shown}</Text>
      </Row>
      <Row>
        <Pressable accessibilityLabel={`${label} less`} style={styles.step} onPress={() => onChange(snap(value - step))}>
          <Text style={styles.stepText}>Less</Text>
        </Pressable>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: shown }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => onChange(snap(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))}
          onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width))}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => at(e.nativeEvent.locationX)}
          onResponderMove={(e) => at(e.nativeEvent.locationX)}
          style={styles.track}
        >
          <View style={styles.base} />
          <View style={[styles.fill, { width: `${pct}%` }]} />
          <View style={[styles.knob, { left: `${pct}%` }]} />
        </View>
        <Pressable accessibilityLabel={`${label} more`} style={styles.step} onPress={() => onChange(snap(value + step))}>
          <Text style={styles.stepText}>More</Text>
        </Pressable>
      </Row>
    </View>
  );
}

export function Swatches({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <Row style={{ flexWrap: 'wrap' }}>
        {SWATCHES.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${c}`}
            accessibilityState={{ selected: c.toUpperCase() === value.toUpperCase() }}
            onPress={() => onChange(c)}
            style={[styles.swatch, { backgroundColor: c }, c.toUpperCase() === value.toUpperCase() && styles.swatchOn]}
          />
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chip: { paddingHorizontal: 14, minHeight: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  section: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  hint: { fontSize: 13, color: colors.inkSoft, marginTop: 2, marginBottom: 8, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  value: { fontSize: 14, color: colors.inkSoft, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, minHeight: 46, fontSize: 16, color: colors.ink, backgroundColor: '#FFFFFF' },
  step: { minWidth: 52, height: 36, borderRadius: 18, paddingHorizontal: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 13, color: colors.brand, fontWeight: '700' },
  base: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: colors.line },
  track: { flex: 1, height: 40, marginHorizontal: 8, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  knob: { position: 'absolute', width: 24, height: 24, borderRadius: 12, marginLeft: -12, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: colors.accent },
  swatch: { width: 34, height: 34, borderRadius: 17, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  swatchOn: { borderWidth: 3, borderColor: colors.accent },
});
