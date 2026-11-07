import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { FIRST_RUN, HONESTY } from '../core/copy';
import { newDesign } from '../core/design';
import { LIMITS, toDay } from '../core/text';
import { useApp } from '../lib/app';
import { stampPhoto } from '../lib/stampPhoto';
import { sampleUri } from '../lib/useSampleStamp';
import brand from '../core/brand.json';
import { Button, Field, Panel, Spinner, colors, shadow, type } from '../ui/kit';

const ICON = require('../../assets/icon.png');

function Dots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 22 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor: i === step ? colors.moss : colors.line }} />
      ))}
    </View>
  );
}

/** Name, room, a sample stamp, done. No account and no login. */
export default function Welcome() {
  const app = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(app.profile.sellerName);
  const [room, setRoom] = useState(app.profile.roomName);
  const [sample, setSample] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (step !== 2) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before making the sample
    setSample(null);
    setFailed(false);
    stampPhoto({
      photoUri: sampleUri(),
      design: newDesign('sample', { ...app.profile, sellerName: name, roomName: room }),
      profile: { ...app.profile, sellerName: name.trim(), roomName: room.trim() },
      day: toDay(new Date()),
    })
      .then((r) => live && setSample(r.uri))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // The sample is made once when the step opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finish = () => {
    app.saveProfile({ ...app.profile, sellerName: name.trim(), roomName: room.trim() });
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 64 }} keyboardShouldPersistTaps="handled">
        <Image source={ICON} style={{ width: 72, height: 72, borderRadius: 18 }} accessibilityLabel={brand.name} />
        <Text style={{ fontFamily: 'Fraunces-Bold', fontSize: 26, lineHeight: 32, color: colors.ink, marginTop: 12 }}>{brand.name}</Text>
        <Dots step={step} />
        {step === 0 ? (
          <>
            <Text style={[type.display, { marginBottom: 8 }]}>{FIRST_RUN.welcomeTitle}</Text>
            <Text style={[type.body, { color: colors.inkSoft, marginBottom: 20 }]}>{FIRST_RUN.welcomeBody}</Text>
            <Panel style={{ padding: 18 }}>
              <Field label={FIRST_RUN.nameLabel} value={name} onChangeText={(t) => setName(t.slice(0, LIMITS.sellerName))} placeholder={FIRST_RUN.namePlaceholder} autoFocus returnKeyType="next" />
            </Panel>
            <Button title={FIRST_RUN.next} onPress={() => setStep(1)} disabled={!name.trim()} />
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Panel style={{ padding: 18 }}>
              <Field label={FIRST_RUN.roomLabel} hint={FIRST_RUN.roomHint} value={room} onChangeText={(t) => setRoom(t.slice(0, LIMITS.roomName))} placeholder={FIRST_RUN.roomPlaceholder} autoFocus returnKeyType="done" />
            </Panel>
            <Button title={FIRST_RUN.next} onPress={() => setStep(2)} disabled={!room.trim()} />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Text style={[type.title, { marginBottom: 6 }]}>{FIRST_RUN.sampleTitle}</Text>
            <Text style={[type.secondary, { marginBottom: 16 }]}>{FIRST_RUN.sampleBody}</Text>
            <View style={[{ aspectRatio: 4 / 3, backgroundColor: colors.stage, borderRadius: 16, overflow: 'hidden', marginBottom: 14, alignItems: 'center', justifyContent: 'center' }, shadow.card]}>
              {sample ? <Image source={{ uri: sample }} style={{ width: '100%', height: '100%' }} accessibilityLabel={FIRST_RUN.sampleTitle} /> : failed ? null : <Spinner />}
            </View>
            <Text style={[type.small, { marginBottom: 18 }]}>{HONESTY}</Text>
            <Button title={FIRST_RUN.done} onPress={finish} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
