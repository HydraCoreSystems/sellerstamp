import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Linking, ScrollView, Text, View } from 'react-native';
import brand from '../core/brand.json';
import { CORNER_NAMES, SETTINGS, STRENGTH_NAMES, STUDIO, STYLE_NAMES, STYLE_NOTES, leftLine, stampsLine } from '../core/copy';
import { CORNERS, STRENGTHS, STYLES, withStyle } from '../core/design';
import { LIMITS } from '../core/text';
import { useApp } from '../lib/app';
import { iapAvailable, manage, restore } from '../lib/iap';
import { useSampleStamp } from '../lib/useSampleStamp';
import { Button, Chip, Field, Row, SCREEN_PAD, Section, TintCard, colors, type } from '../ui/kit';

export default function Settings() {
  const app = useApp();
  const [note, setNote] = useState<string | null>(null);
  const p = app.profile;
  const d = app.design;
  const strip = useSampleStamp(d, p, { maxSide: 700, frame: [1200, 420] });

  const doRestore = async () => {
    try {
      const e = await restore();
      app.setEntitlement(e);
      setNote(e.lifetime || e.until ? SETTINGS.restored : SETTINGS.nothingToRestore);
    } catch {
      setNote(SETTINGS.storeDown);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: SCREEN_PAD, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Section title={SETTINGS.profile}>
        <Field label={SETTINGS.sellerName} value={p.sellerName} maxLength={LIMITS.sellerName} onChangeText={(t) => app.saveProfile({ ...p, sellerName: t })} />
        <Field label={SETTINGS.roomName} value={p.roomName} maxLength={LIMITS.roomName} onChangeText={(t) => app.saveProfile({ ...p, roomName: t })} />
        <Field label={SETTINGS.sellerNumber} value={p.sellerNumber} maxLength={LIMITS.sellerNumber} autoCapitalize="none" onChangeText={(t) => app.saveProfile({ ...p, sellerNumber: t })} />
        <Field label={SETTINGS.secondLine} hint={SETTINGS.secondHint} value={p.secondLine} maxLength={LIMITS.secondLine} onChangeText={(t) => app.saveProfile({ ...p, secondLine: t })} />
      </Section>

      <Section title={SETTINGS.defaultDesign} hint={SETTINGS.defaultHint}>
        <View style={{ height: 110, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.stage, marginBottom: 12 }}>
          {strip.uri ? <Image source={{ uri: strip.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}
        </View>
        <Row style={{ flexWrap: 'wrap' }}>
          {app.library.designs.map((x) => (
            <Chip key={x.id} title={x.label} active={x.id === d.id} onPress={() => app.choose(x.id)} />
          ))}
        </Row>
        <Text style={[type.label, { marginBottom: 6 }]}>{STUDIO.style}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          {STYLES.map((s) => (
            <Chip key={s} title={STYLE_NAMES[s]} active={d.style === s} onPress={() => app.saveOne(withStyle(d, s))} />
          ))}
        </Row>
        <Text style={[type.secondary, { marginBottom: 10 }]}>{STYLE_NOTES[d.style]}</Text>
        <Text style={[type.label, { marginBottom: 6 }]}>{STUDIO.strength}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          {STRENGTHS.map((s) => (
            <Chip key={s} title={STRENGTH_NAMES[s]} active={d.strength === s} onPress={() => app.saveOne({ ...d, strength: s })} />
          ))}
        </Row>
        <Text style={[type.label, { marginBottom: 6 }]}>{STUDIO.corner}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          {CORNERS.map((c) => (
            <Chip key={c} title={CORNER_NAMES[c]} active={d.corner === c} onPress={() => app.saveOne({ ...d, corner: c })} />
          ))}
        </Row>
        <Button title={SETTINGS.moreOptions} kind="secondary" onPress={() => router.push('/studio')} />
      </Section>

      <Section title={SETTINGS.stamps}>
        <Text style={type.body}>{stampsLine(app.counter.used, app.unlimited)}</Text>
        {!app.unlimited ? <Text style={[type.secondary, { marginTop: 4 }]}>{leftLine(app.left)}</Text> : null}
      </Section>

      <Section title={SETTINGS.subscription}>
        <Text style={[type.body, { marginBottom: 10 }]}>
          {app.entitlement.lifetime ? SETTINGS.lifetimeOwned : app.unlimited ? SETTINGS.planActive : SETTINGS.planNone}
        </Text>
        {!app.unlimited ? <Button title={SETTINGS.seePlans} onPress={() => router.push('/paywall')} style={{ marginBottom: 8 }} /> : null}
        {iapAvailable() ? (
          <>
            {app.entitlement.until && !app.entitlement.lifetime ? <Button title={SETTINGS.manage} kind="secondary" onPress={() => void manage().catch(() => Alert.alert(SETTINGS.storeDown))} style={{ marginBottom: 8 }} /> : null}
            <Button title={SETTINGS.restore} kind="quiet" onPress={() => void doRestore()} />
            {note ? <Text style={[type.secondary, { marginTop: 6 }]}>{note}</Text> : null}
          </>
        ) : null}
      </Section>

      <Section title={SETTINGS.privacy}>
        <Text style={type.secondary}>{SETTINGS.privacyBody}</Text>
        {brand.privacyUrl ? <Button title={SETTINGS.privacyLink} kind="quiet" onPress={() => void Linking.openURL(brand.privacyUrl)} /> : null}
      </Section>

      <TintCard title={SETTINGS.honestyTitle} style={{ marginBottom: 14 }}>
        <Text style={[type.small, { color: colors.ivory }]}>{SETTINGS.honesty}</Text>
      </TintCard>

      <Text style={[type.small, { textAlign: 'center' }]}>{`${SETTINGS.version} ${Constants.expoConfig?.version ?? ''}`}</Text>
    </ScrollView>
  );
}
