import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import brand from '../core/brand.json';
import { BATCH, HOME, HONESTY, SETTINGS, leftLine, stampsLine } from '../core/copy';
import { useApp } from '../lib/app';
import { takePhoto, pickPhotos, type PickResult } from '../lib/pick';
import { startSession } from '../lib/session';
import { useSampleStamp } from '../lib/useSampleStamp';
import { Button, Chip, Panel, Row, Rule, SealMark, Section, TintCard, Wordmark, SCREEN_PAD, colors, face, shadow, type } from '../ui/kit';
const OK = 'OK';

export default function Home() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const hero = useSampleStamp(app.design, app.profile, { maxSide: 800, frame: [1200, 650] });
  const room = app.design.roomName || app.profile.roomName;
  if (!app.ready) return <Redirect href="/welcome" />;

  const go = async (get: () => Promise<PickResult>) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await get();
      if (res.kind === 'photos') {
        startSession(res.photos);
        router.push('/studio');
      } else if (res.kind === 'denied') {
        Alert.alert(BATCH.noPhotosTitle, BATCH.noPhotosBody, [
          { text: BATCH.openSettings, onPress: () => void Linking.openSettings() },
          { text: OK, style: 'cancel' },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: SCREEN_PAD, paddingTop: insets.top + 16, paddingBottom: 32 + insets.bottom }}>
      <View style={{ alignItems: 'center' }}>
        <SealMark size={132} />
        <Wordmark size={28} style={{ marginTop: 8 }}>{brand.name}</Wordmark>
        <Text style={{ fontFamily: face.regular, fontSize: 14, letterSpacing: 3, color: colors.ivory, marginTop: 8 }}>
          {app.unlimited ? stampsLine(app.counter.used, true) : leftLine(app.left)}
        </Text>
      </View>
      <Rule />

      <Pressable accessibilityRole="button" accessibilityLabel={HOME.editDesign} onPress={() => router.push('/studio')}>
        <View style={[{ borderWidth: 1, borderColor: colors.rule, borderRadius: 8, padding: 8, marginBottom: 16 }, shadow.card]}>
          <View style={{ height: 190, backgroundColor: colors.stage, borderRadius: 6, overflow: 'hidden' }}>
            {hero.uri ? <Image source={{ uri: hero.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}
            <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: colors.scrim, borderRadius: 6, borderWidth: 1, borderColor: colors.rule, paddingVertical: 5, paddingHorizontal: 10, maxWidth: '70%' }}>
              <Text style={[type.label, { color: colors.foil }]} numberOfLines={1}>
                {app.design.label}
              </Text>
              {room && room !== app.design.label ? (
                <Text style={[type.small, { color: colors.ivory }]} numberOfLines={1}>
                  {room}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>

      <Button title={HOME.pick} onPress={() => void go(pickPhotos)} disabled={busy} style={{ marginBottom: 12 }} />
      <Button title={HOME.camera} kind="secondary" onPress={() => void go(takePhoto)} disabled={busy} />
      <Text style={[type.small, { marginTop: 10, marginBottom: 20, textAlign: 'center' }]}>{HOME.pickHint}</Text>

      <Section title={HOME.designs}>
        <Row style={{ flexWrap: 'wrap' }}>
          {app.library.designs.map((d) => (
            <Chip key={d.id} title={d.label} active={d.id === app.library.activeId} onPress={() => app.choose(d.id)} />
          ))}
        </Row>
        <Button title={HOME.editDesign} kind="quiet" onPress={() => router.push('/studio')} />
      </Section>

      <Pressable accessibilityRole="button" onPress={() => router.push('/settings')}>
        <Panel style={{ padding: 18 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.cardTitle, { fontSize: 14 }]}>{HOME.settings}</Text>
              <Text style={type.secondary}>{HOME.settingsHint}</Text>
            </View>
            <Text style={{ fontFamily: face.bold, fontSize: 24, color: colors.gold }}>{'\u203A'}</Text>
          </Row>
        </Panel>
      </Pressable>

      <TintCard title={SETTINGS.honestyTitle}>
        <Text style={[type.small, { color: colors.ivory }]}>{HONESTY}</Text>
      </TintCard>
    </ScrollView>
  );
}
