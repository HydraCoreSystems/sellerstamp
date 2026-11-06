import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { BATCH, HOME, HONESTY, leftLine, stampsLine } from '../core/copy';
import { useApp } from '../lib/app';
import { takePhoto, pickPhotos, type PickResult } from '../lib/pick';
import { startSession } from '../lib/session';
import { Button, Chip, Row, Section, colors } from '../ui/kit';

export default function Home() {
  const app = useApp();
  const [busy, setBusy] = useState(false);
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
          { text: PAYWALL_OK, style: 'cancel' },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 15, color: colors.inkSoft }}>{app.unlimited ? stampsLine(app.counter.used, true) : leftLine(app.left)}</Text>
      </View>

      <Button title={HOME.pick} onPress={() => void go(pickPhotos)} disabled={busy} style={{ marginBottom: 10 }} />
      <Button title={HOME.camera} kind="secondary" onPress={() => void go(takePhoto)} disabled={busy} />
      <Text style={{ fontSize: 13, color: colors.inkSoft, marginTop: 10, marginBottom: 20, lineHeight: 18 }}>{HOME.pickHint}</Text>

      <Section title={HOME.designs}>
        <Row style={{ flexWrap: 'wrap' }}>
          {app.library.designs.map((d) => (
            <Chip key={d.id} title={d.label} active={d.id === app.library.activeId} onPress={() => app.choose(d.id)} />
          ))}
        </Row>
        <Button title={HOME.editDesign} kind="quiet" onPress={() => router.push('/studio')} />
      </Section>

      <Button title={HOME.settings} kind="quiet" onPress={() => router.push('/settings')} />
      <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 16, lineHeight: 17 }}>{HONESTY}</Text>
    </ScrollView>
  );
}

const PAYWALL_OK = 'OK';
