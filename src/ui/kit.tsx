import { createContext, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Image, Keyboard, Platform, ScrollView, type ScrollViewProps, Pressable, ActivityIndicator, StyleSheet, Switch, Text, TextInput, View, type ImageStyle, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';

/** Wax and gold: oxblood ground, antique gold rules, foil gold for the one main action, ivory words. */
export const colors = {
  ground: '#1C0708',
  panel: '#2E0D0E',
  panelHi: '#40161A',
  ivory: '#F3E9D2',
  gold: '#C6A15B',
  foil: '#E3C878',
  foilDeep: '#C9AD5E',
  wax: '#7E1F26',
  waxHi: '#8A2432',
  rule: 'rgba(198,161,91,0.45)',
  ruleSoft: 'rgba(198,161,91,0.22)',
  scrim: 'rgba(28,7,8,0.88)',
  danger: '#F0897B',
  warn: '#E0A458',
  placeholder: '#8C7650',
  stage: '#120405',
};

/** The two faces the interface is set in. Loaded once in the root layout. */
export const FONT_FILES = {
  'Cinzel-SemiBold': require('../../assets/fonts/CinzelSemiBold.ttf'),
  'Cinzel-Bold': require('../../assets/fonts/CinzelBold.ttf'),
  'SourceSans3-Regular': require('../../assets/fonts/SourceSans3Regular.ttf'),
  'SourceSans3-SemiBold': require('../../assets/fonts/SourceSans3SemiBold.ttf'),
  'SourceSans3-Bold': require('../../assets/fonts/SourceSans3Bold.ttf'),
};

export const face = {
  display: 'Cinzel-Bold',
  displaySemi: 'Cinzel-SemiBold',
  regular: 'SourceSans3-Regular',
  semi: 'SourceSans3-SemiBold',
  bold: 'SourceSans3-Bold',
};

/** Text styles. Headings, the wordmark and buttons are letterspaced capitals, set at render time so the words stay as written. */
export const type = {
  display: { fontFamily: face.display, fontSize: 26, lineHeight: 34, letterSpacing: 3, textTransform: 'uppercase', color: colors.ivory } as TextStyle,
  title: { fontFamily: face.display, fontSize: 20, lineHeight: 27, letterSpacing: 2.5, textTransform: 'uppercase', color: colors.ivory } as TextStyle,
  cardTitle: { fontFamily: face.displaySemi, fontSize: 15, lineHeight: 22, letterSpacing: 2, textTransform: 'uppercase', color: colors.foil } as TextStyle,
  body: { fontFamily: face.regular, fontSize: 16, lineHeight: 23, color: colors.ivory } as TextStyle,
  bodySemi: { fontFamily: face.semi, fontSize: 16, lineHeight: 23, color: colors.ivory } as TextStyle,
  secondary: { fontFamily: face.regular, fontSize: 14, lineHeight: 20, color: colors.gold } as TextStyle,
  small: { fontFamily: face.regular, fontSize: 13, lineHeight: 18, color: colors.gold } as TextStyle,
  label: { fontFamily: face.semi, fontSize: 14, lineHeight: 20, color: colors.ivory } as TextStyle,
  button: { fontFamily: face.display, fontSize: 14, lineHeight: 20, letterSpacing: 2, textTransform: 'uppercase' } as TextStyle,
  chip: { fontFamily: face.semi, fontSize: 14, lineHeight: 20, color: colors.ivory } as TextStyle,
};

export const SCREEN_PAD = 20;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    default: { elevation: 3, shadowColor: '#000000' },
  }) as ViewStyle,
  bar: Platform.select<ViewStyle>({
    ios: { shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: -3 } },
    default: { elevation: 6, shadowColor: '#000000' },
  }) as ViewStyle,
};

/** Wax red and foil lead the list, then the rest. */
export const SWATCHES = ['#7E1F26', '#8A2432', '#E3C878', '#C6A15B', '#F3E9D2', '#FFFFFF', '#000000', '#F5EBD7', '#FFD54A', '#FF9F43', '#E74C3C', '#F78FB3', '#8E5CD9', '#3B82F6', '#2A9D8F', '#3E7A4B', '#8A93A6'];

const MARK = require('../../assets/seal-mark.png');

/** The engraved seal, the brand mark. */
export function SealMark({ size = 120, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={MARK} accessibilityLabel="Seal" style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}

/** The brand name in letterspaced foil capitals. */
export function Wordmark({ children, size = 28, style }: { children: string; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[{ fontFamily: face.display, fontSize: size, lineHeight: size * 1.3, letterSpacing: size * 0.28, textTransform: 'uppercase', color: colors.foil, textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}

/** A thin gold rule with a small diamond in the middle. */
export function Rule({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }, style]}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.rule }} />
      <View style={{ width: 7, height: 7, marginHorizontal: 10, backgroundColor: colors.gold, transform: [{ rotate: '45deg' }] }} />
      <View style={{ flex: 1, height: 1, backgroundColor: colors.rule }} />
    </View>
  );
}

/** The busy indicator, in foil gold. */
export function Spinner({ style }: { style?: StyleProp<ViewStyle> }) {
  return <ActivityIndicator color={colors.foil} style={style} />;
}

/** The on/off switch, in gold on both platforms. */
export function Toggle({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.panelHi, true: colors.gold }}
      ios_backgroundColor={colors.panelHi}
      thumbColor={value ? colors.foil : colors.ivory}
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
        kind === 'primary' && { backgroundColor: pressed ? colors.foilDeep : colors.foil, borderColor: pressed ? colors.foilDeep : colors.foil },
        kind === 'secondary' && { backgroundColor: pressed ? colors.panel : 'transparent', borderColor: colors.gold },
        { opacity: disabled ? 0.4 : 1 },
        style,
      ]}
    >
      <Text style={kind === 'quiet' ? styles.quietText : [type.button, { color: kind === 'primary' ? colors.ground : colors.foil }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ title, active, onPress }: { title: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.foil, borderColor: colors.foil }]}
    >
      <Text style={[type.chip, active && { color: colors.ground, fontFamily: face.bold }]}>{title}</Text>
    </Pressable>
  );
}

export function Section({ title, children, hint, style }: { title: string; children: ReactNode; hint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, shadow.card, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ height: 1, backgroundColor: colors.rule, marginBottom: 12 }} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

/** A card with no title, for pictures and rows. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, shadow.card, style]}>{children}</View>;
}

/** The framed card the honesty words sit in. */
export function TintCard({ title, children, style }: { title?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ borderWidth: 1, borderColor: colors.rule, borderRadius: 8, padding: 14 }, style]}>
      {title ? <Text style={[type.cardTitle, { fontSize: 13, marginBottom: 6 }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

/**
 * Keeps a screen with text boxes usable with the keyboard open. It measures how far the keyboard reaches
 * into the screen and lifts the content by exactly that much, so it works whether or not the system
 * has already resized the window (on Android it varies). `keyboard` tells the screen whether it is up.
 */
const KeyboardContext = createContext<{ keyboard: number; reveal: (view: ComponentRef<typeof View> | null) => void }>({ keyboard: 0, reveal: () => {} });
export const useKeyboard = () => useContext(KeyboardContext).keyboard;

export function KeyboardScreen({ children, style, scrollProps, scrollStyle, footer, header }: { header?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle>; scrollProps?: ScrollViewProps; scrollStyle?: StyleProp<ViewStyle>; footer?: ReactNode }) {
  const box = useRef<ComponentRef<typeof View>>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [lift, setLift] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      box.current?.measureInWindow((_x, y, _w, h) => setLift(Math.max(0, Math.round(y + h - e.endCoordinates.screenY))));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const reveal = (view: ComponentRef<typeof View> | null) => {
    const sv = scroll.current;
    if (!view || !sv) return;
    // Wait for the keyboard and the lifted layout to settle, then bring the field to the upper part of the visible area.
    setTimeout(() => {
      const inner = sv.getInnerViewRef?.();
      if (!inner) return;
      view.measureLayout(inner as never, (_x, y) => sv.scrollTo({ y: Math.max(0, y - 90), animated: true }), () => {});
    }, 300);
  };
  const open = lift > 0;
  return (
    <KeyboardContext.Provider value={{ keyboard: lift, reveal }}>
      <View ref={box} collapsable={false} style={[{ flex: 1, backgroundColor: colors.ground }, style]}>
        <View style={{ flex: 1, paddingBottom: lift }}>
          {open ? null : header}
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" {...scrollProps} contentContainerStyle={scrollStyle}>
            {children}
          </ScrollView>
          {open ? null : footer}
        </View>
      </View>
    </KeyboardContext.Provider>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const { reveal } = useContext(KeyboardContext);
  const box = useRef<ComponentRef<typeof View>>(null);
  return (
    <View ref={box} collapsable={false} style={{ marginBottom: 14 }}>
      <Text style={[type.label, { marginBottom: 6, color: colors.gold }]}>{label}</Text>
      <TextInput {...props} onFocus={(e) => { reveal(box.current); props.onFocus?.(e); }} accessibilityLabel={label} placeholderTextColor={colors.placeholder} style={styles.input} autoCorrect={false} selectionColor={colors.foil} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A small square button with a glyph, for the arrows. */
export function RoundButton({ glyph, label, onPress, size = 44, fill = colors.panelHi, style }: { glyph: string; label: string; onPress: () => void; size?: number; fill?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: 8, backgroundColor: fill, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Text style={{ fontFamily: face.bold, fontSize: size >= 44 ? 20 : 22, color: colors.foil }}>{glyph}</Text>
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
              style={[styles.swatchRing, on && { borderColor: colors.foil }]}
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
  button: { minHeight: 52, borderRadius: 6, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  quiet: { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  quietText: { fontFamily: face.displaySemi, fontSize: 12, lineHeight: 18, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.gold },
  chip: { paddingHorizontal: 14, minHeight: 40, borderRadius: 6, borderWidth: 1, borderColor: colors.rule, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 8 },
  section: { backgroundColor: colors.panel, borderRadius: 8, borderWidth: 1, borderColor: colors.ruleSoft, padding: 18, marginBottom: 14 },
  panel: { backgroundColor: colors.panel, borderRadius: 8, borderWidth: 1, borderColor: colors.ruleSoft, marginBottom: 14, overflow: 'hidden' },
  sectionTitle: { ...type.cardTitle, marginBottom: 10 },
  hint: { ...type.secondary, marginTop: 2, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingHorizontal: 14, minHeight: 50, fontFamily: face.regular, fontSize: 16, color: colors.ivory, backgroundColor: 'rgba(0,0,0,0.28)' },
  step: { minWidth: 52, height: 34, borderRadius: 6, borderWidth: 1, borderColor: colors.rule, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: face.semi, fontSize: 12, color: colors.foil },
  base: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.rule },
  track: { flex: 1, height: 40, marginHorizontal: 10, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, height: 2, backgroundColor: colors.foil },
  knob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, marginLeft: -11, backgroundColor: colors.foil, borderWidth: 3, borderColor: colors.ground },
  swatchRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 2, marginBottom: 4 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.rule },
});
