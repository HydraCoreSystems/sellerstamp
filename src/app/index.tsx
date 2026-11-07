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
import { Button, Chip, Panel, Row, Section, TintCard, SCREEN_PAD, colors, face, type } from '../ui/kit';

const ICON = require('../../assets/icon.png');
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
    <ScrollView contentContainerStyle={{ padding: SCREEN_PAD, paddingTop: insets.top + 16, paddingBottom: 32 }}>
      <Row style={{ marginBottom: 18 }}>
        <Image source={ICON} style={{ width: 36, height: 36, borderRadius: 9, marginRight: 10 }} accessibilityLabel={brand.name} />
        <View>
          <Text style={{ fontFamily: face.display, fontSize: 22, lineHeight: 26, color: colors.ink }}>{brand.name}</Text>
          <Text style={type.secondary}>{app.unlimited ? stampsLine(app.counter.used, true) : leftLine(app.left)}</Text>
        </View>
      </Row>

      <Pressable accessibilityRole="button" accessibilityLabel={HOME.editDesign} onPress={() => router.push('/studio')}>
        <Panel>
          <View style={{ height: 190, backgroundColor: colors.stage }}>
            {hero.uri ? <Image source={{ uri: hero.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}
            <View style={{ position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(24,53,41,0.88)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, maxWidth: '80%' }}>
              <Text style={[type.label, { color: colors.card }]} numberOfLines={1}>
                {app.design.label}
              </Text>
              {room && room !== app.design.label ? (
                <Text style={[type.small, { color: colors.card }]} numberOfLines={1}>
                  {room}
                </Text>
              ) : null}
            </View>
          </View>
        </Panel>
      </Pressable>

      <Button title={HOME.pick} onPress={() => void go(pickPhotos)} disabled={busy} style={{ marginBottom: 12 }} />
      <Button title={HOME.camera} kind="secondary" onPress={() => void go(takePhoto)} disabled={busy} />
      <Text style={[type.small, { marginTop: 10, marginBottom: 20 }]}>{HOME.pickHint}</Text>

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
              <Text style={type.bodySemi}>{HOME.settings}</Text>
              <Text style={type.secondary}>{HOME.settingsHint}</Text>
            </View>
            <Text style={{ fontFamily: face.bold, fontSize: 24, color: colors.inkSoft }}>{'›'}</Text>
          </Row>
        </Panel>
      </Pressable>

      <TintCard title={SETTINGS.honestyTitle}>
        <Text style={[type.small, { color: colors.ink }]}>{HONESTY}</Text>
      </TintCard>
    </ScrollView>
  );
}
