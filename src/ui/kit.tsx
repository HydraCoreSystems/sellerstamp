import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  paper: '#F6EFE2',
  card: '#FFFDF6',
  ink: '#2C211A',
  inkSoft: '#756455',
  line: '#E2D3B8',
  moss: '#22483A',
  mossDeep: '#183529',
  terracotta: '#C05B36',
  terracottaTint: '#F7E7D9',
  sageTint: '#E3EBD9',
  gold: '#D9A441',
  danger: '#B3261E',
  warn: '#96660A',
  placeholder: '#A08B74',
  stage: '#E9E2D2',
};

/** The two faces the interface is set in. Loaded once in the root layout. */
export const FONT_FILES = {
  'Fraunces-SemiBold': require('../../assets/fonts/FrauncesSemiBold.ttf'),
  'Fraunces-Bold': require('../../assets/fonts/FrauncesBold.ttf'),
  'SourceSans3-Regular': require('../../assets/fonts/SourceSans3Regular.ttf'),
  'SourceSans3-SemiBold': require('../../assets/fonts/SourceSans3SemiBold.ttf'),
  'SourceSans3-Bold': require('../../assets/fonts/SourceSans3Bold.ttf'),
};

export const face = {
  display: 'Fraunces-Bold',
  displaySemi: 'Fraunces-SemiBold',
  regular: 'SourceSans3-Regular',
  semi: 'SourceSans3-SemiBold',
  bold: 'SourceSans3-Bold',
};

/** Text styles. Colors are set at the call site. */
export const type = {
  display: { fontFamily: face.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.3, color: colors.ink } as TextStyle,
  title: { fontFamily: face.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: colors.ink } as TextStyle,
  cardTitle: { fontFamily: face.displaySemi, fontSize: 18, lineHeight: 24, color: colors.ink } as TextStyle,
  body: { fontFamily: face.regular, fontSize: 16, lineHeight: 23, color: colors.ink } as TextStyle,
  bodySemi: { fontFamily: face.semi, fontSize: 16, lineHeight: 23, color: colors.ink } as TextStyle,
  secondary: { fontFamily: face.regular, fontSize: 14, lineHeight: 20, color: colors.inkSoft } as TextStyle,
  small: { fontFamily: face.regular, fontSize: 13, lineHeight: 18, color: colors.inkSoft } as TextStyle,
  label: { fontFamily: face.semi, fontSize: 14, lineHeight: 20, color: colors.ink } as TextStyle,
  button: { fontFamily: face.bold, fontSize: 16, lineHeight: 22 } as TextStyle,
  chip: { fontFamily: face.semi, fontSize: 14, lineHeight: 20, color: colors.ink } as TextStyle,
};

export const SCREEN_PAD = 20;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: { shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    default: { elevation: 2, shadowColor: colors.ink },
  }) as ViewStyle,
  primary: Platform.select<ViewStyle>({
    ios: { shadowColor: colors.mossDeep, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
    default: { elevation: 3, shadowColor: colors.mossDeep },
  }) as ViewStyle,
  bar: Platform.select<ViewStyle>({
    ios: { shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -3 } },
    default: { elevation: 6, shadowColor: colors.ink },
  }) as ViewStyle,
};

export const SWATCHES = ['#22483A', '#C05B36', '#A9704B', '#FFFFFF', '#000000', '#F5EBD7', '#FFD54A', '#FF9F43', '#E74C3C', '#F78FB3', '#8E5CD9', '#3B82F6', '#2A9D8F', '#3E7A4B', '#8A93A6'];

/** The busy indicator, always in Moss. */
export function Spinner({ style }: { style?: StyleProp<ViewStyle> }) {
  return <ActivityIndicator color={colors.moss} style={style} />;
}

/** The on/off switch, in Moss on both platforms. */
export function Toggle({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.line, true: colors.moss }}
      ios_backgroundColor={colors.line}
      thumbColor={colors.card}
    />
  );
}

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        kind === 'quiet' ? styles.quiet : styles.button,
        kind === 'primary' && [shadow.primary, { backgroundColor: pressed ? colors.mossDeep : colors.moss, borderColor: pressed ? colors.mossDeep : colors.moss }],
        kind === 'secondary' && { backgroundColor: colors.card, borderColor: colors.line },
        { opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      <Text style={kind === 'quiet' ? styles.quietText : [type.button, { color: kind === 'primary' ? colors.card : colors.moss }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ title, active, onPress }: { title: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.moss, borderColor: colors.moss }]}
    >
      <Text style={[type.chip, active && { color: colors.card }]}>{title}</Text>
    </Pressable>
  );
}

export function Section({ title, children, hint, style }: { title: string; children: ReactNode; hint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, shadow.card, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

/** A card with no title, for pictures and rows. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, shadow.card, style]}>{children}</View>;
}

/** The soft green card the honesty words sit in. */
export function TintCard({ title, children, style }: { title?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: colors.sageTint, borderRadius: 14, padding: 14 }, style]}>
      {title ? <Text style={[type.label, { color: colors.mossDeep, marginBottom: 4 }]}>{title}</Text> : null}
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
      <Text style={[type.label, { marginBottom: 6 }]}>{label}</Text>
      <TextInput {...props} accessibilityLabel={label} placeholderTextColor={colors.placeholder} style={styles.input} autoCorrect={false} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A round button with a glyph, for the arrows. */
export function RoundButton({ glyph, label, onPress, size = 44, fill = colors.sageTint, style }: { glyph: string; label: string; onPress: () => void; size?: number; fill?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Text style={{ fontFamily: face.bold, fontSize: size >= 44 ? 20 : 22, color: colors.moss }}>{glyph}</Text>
    </Pressable>
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
        <Text style={[type.label, { marginBottom: 6 }]}>{label}</Text>
        <Text style={[type.secondary, { marginBottom: 6 }]}>{shown}</Text>
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
      <Text style={[type.label, { marginBottom: 6 }]}>{label}</Text>
      <Row style={{ flexWrap: 'wrap' }}>
        {SWATCHES.map((c) => {
          const on = c.toUpperCase() === value.toUpperCase();
          return (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${c}`}
              accessibilityState={{ selected: on }}
              onPress={() => onChange(c)}
              style={[styles.swatchRing, on && { borderColor: colors.terracotta }]}
            >
              <View style={[styles.swatch, { backgroundColor: c }]} />
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  quiet: { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  quietText: { fontFamily: face.semi, fontSize: 15, lineHeight: 20, color: colors.moss },
  chip: { paddingHorizontal: 16, minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 8 },
  section: { backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 14 },
  panel: { backgroundColor: colors.card, borderRadius: 18, marginBottom: 14, overflow: 'hidden' },
  sectionTitle: { ...type.cardTitle, marginBottom: 12 },
  hint: { ...type.secondary, marginTop: 2, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, minHeight: 50, fontFamily: face.regular, fontSize: 16, color: colors.ink, backgroundColor: 'rgba(246,239,226,0.6)' },
  step: { minWidth: 52, height: 36, borderRadius: 18, paddingHorizontal: 10, backgroundColor: colors.sageTint, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: face.semi, fontSize: 12, color: colors.moss },
  base: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: colors.line },
  track: { flex: 1, height: 40, marginHorizontal: 8, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: colors.terracotta },
  knob: { position: 'absolute', width: 26, height: 26, borderRadius: 13, marginLeft: -13, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: colors.terracotta },
  swatchRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 2, marginBottom: 4 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line },
});
