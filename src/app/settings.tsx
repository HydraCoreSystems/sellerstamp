import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, Text } from 'react-native';
import brand from '../core/brand.json';
import { CORNER_NAMES, SETTINGS, STRENGTH_NAMES, STUDIO, STYLE_NAMES, STYLE_NOTES, leftLine, stampsLine } from '../core/copy';
import { CORNERS, STRENGTHS, STYLES, withStyle } from '../core/design';
import { LIMITS } from '../core/text';
import { useApp } from '../lib/app';
import { iapAvailable, manage, restore } from '../lib/iap';
import { Button, Chip, Field, Row, Section, colors } from '../ui/kit';

export default function Settings() {
  const app = useApp();
  const [note, setNote] = useState<string | null>(null);
  const p = app.profile;
  const d = app.design;

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
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Section title={SETTINGS.profile}>
        <Field label={SETTINGS.sellerName} value={p.sellerName} maxLength={LIMITS.sellerName} onChangeText={(t) => app.saveProfile({ ...p, sellerName: t })} />
        <Field label={SETTINGS.roomName} value={p.roomName} maxLength={LIMITS.roomName} onChangeText={(t) => app.saveProfile({ ...p, roomName: t })} />
        <Field label={SETTINGS.sellerNumber} value={p.sellerNumber} maxLength={LIMITS.sellerNumber} autoCapitalize="none" onChangeText={(t) => app.saveProfile({ ...p, sellerNumber: t })} />
        <Field label={SETTINGS.secondLine} hint={SETTINGS.secondHint} value={p.secondLine} maxLength={LIMITS.secondLine} onChangeText={(t) => app.saveProfile({ ...p, secondLine: t })} />
      </Section>

      <Section title={SETTINGS.defaultDesign} hint={SETTINGS.defaultHint}>
        <Row style={{ flexWrap: 'wrap' }}>
          {app.library.designs.map((x) => (
            <Chip key={x.id} title={x.label} active={x.id === d.id} onPress={() => app.choose(x.id)} />
          ))}
        </Row>
        <Text style={{ fontWeight: '700', color: colors.ink, marginBottom: 6 }}>{STUDIO.style}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          {STYLES.map((s) => (
            <Chip key={s} title={STYLE_NAMES[s]} active={d.style === s} onPress={() => app.saveOne(withStyle(d, s))} />
          ))}
        </Row>
        <Text style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 19, marginBottom: 10 }}>{STYLE_NOTES[d.style]}</Text>
        <Text style={{ fontWeight: '700', color: colors.ink, marginBottom: 6 }}>{STUDIO.strength}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          {STRENGTHS.map((s) => (
            <Chip key={s} title={STRENGTH_NAMES[s]} active={d.strength === s} onPress={() => app.saveOne({ ...d, strength: s })} />
          ))}
        </Row>
        <Text style={{ fontWeight: '700', color: colors.ink, marginBottom: 6 }}>{STUDIO.corner}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          {CORNERS.map((c) => (
            <Chip key={c} title={CORNER_NAMES[c]} active={d.corner === c} onPress={() => app.saveOne({ ...d, corner: c })} />
          ))}
        </Row>
        <Button title={SETTINGS.moreOptions} kind="secondary" onPress={() => router.push('/studio')} />
      </Section>

      <Section title={SETTINGS.stamps}>
        <Text style={{ fontSize: 15, color: colors.ink }}>{stampsLine(app.counter.used, app.unlimited)}</Text>
        {!app.unlimited ? <Text style={{ color: colors.inkSoft, marginTop: 4 }}>{leftLine(app.left)}</Text> : null}
      </Section>

      <Section title={SETTINGS.subscription}>
        <Text style={{ fontSize: 15, color: colors.ink, marginBottom: 10 }}>
          {app.entitlement.lifetime ? SETTINGS.lifetimeOwned : app.unlimited ? SETTINGS.planActive : SETTINGS.planNone}
        </Text>
        {!app.unlimited ? <Button title={SETTINGS.seePlans} onPress={() => router.push('/paywall')} style={{ marginBottom: 8 }} /> : null}
        {iapAvailable() ? (
          <>
            {app.entitlement.until && !app.entitlement.lifetime ? <Button title={SETTINGS.manage} kind="secondary" onPress={() => void manage().catch(() => Alert.alert(SETTINGS.storeDown))} style={{ marginBottom: 8 }} /> : null}
            <Button title={SETTINGS.restore} kind="quiet" onPress={() => void doRestore()} />
            {note ? <Text style={{ color: colors.inkSoft, marginTop: 6 }}>{note}</Text> : null}
          </>
        ) : null}
      </Section>

      <Section title={SETTINGS.privacy}>
        <Text style={{ fontSize: 14, color: colors.ink, lineHeight: 20 }}>{SETTINGS.privacyBody}</Text>
        {brand.privacyUrl ? <Button title={SETTINGS.privacyLink} kind="quiet" onPress={() => void Linking.openURL(brand.privacyUrl)} /> : null}
      </Section>

      <Section title={SETTINGS.honestyTitle}>
        <Text style={{ fontSize: 14, color: colors.ink, lineHeight: 20 }}>{SETTINGS.honesty}</Text>
      </Section>

      <Text style={{ fontSize: 12, color: colors.inkSoft }}>{`${SETTINGS.version} ${Constants.expoConfig?.version ?? ''}`}</Text>
    </ScrollView>
  );
}
