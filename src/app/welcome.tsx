import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { FIRST_RUN, HONESTY } from '../core/copy';
import { newDesign } from '../core/design';
import { LIMITS, toDay } from '../core/text';
import { useApp } from '../lib/app';
import { makeSamplePhoto, stampPhoto } from '../lib/stampPhoto';
import { Button, Field, colors } from '../ui/kit';

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
      photoUri: makeSamplePhoto(),
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 72 }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 8 }}>{FIRST_RUN.welcomeTitle}</Text>
            <Text style={{ fontSize: 16, color: colors.inkSoft, marginBottom: 24, lineHeight: 22 }}>{FIRST_RUN.welcomeBody}</Text>
            <Field label={FIRST_RUN.nameLabel} value={name} onChangeText={(t) => setName(t.slice(0, LIMITS.sellerName))} placeholder={FIRST_RUN.namePlaceholder} autoFocus returnKeyType="next" />
            <Button title={FIRST_RUN.next} onPress={() => setStep(1)} disabled={!name.trim()} />
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Field label={FIRST_RUN.roomLabel} value={room} onChangeText={(t) => setRoom(t.slice(0, LIMITS.roomName))} placeholder={FIRST_RUN.roomPlaceholder} autoFocus returnKeyType="done" />
            <Button title={FIRST_RUN.next} onPress={() => setStep(2)} disabled={!room.trim()} />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 6 }}>{FIRST_RUN.sampleTitle}</Text>
            <Text style={{ fontSize: 15, color: colors.inkSoft, marginBottom: 16, lineHeight: 21 }}>{FIRST_RUN.sampleBody}</Text>
            <View style={{ aspectRatio: 4 / 3, backgroundColor: colors.line, borderRadius: 12, overflow: 'hidden', marginBottom: 14, alignItems: 'center', justifyContent: 'center' }}>
              {sample ? <Image source={{ uri: sample }} style={{ width: '100%', height: '100%' }} accessibilityLabel={FIRST_RUN.sampleTitle} /> : failed ? null : <ActivityIndicator />}
            </View>
            <Text style={{ fontSize: 12, color: colors.inkSoft, marginBottom: 18, lineHeight: 17 }}>{HONESTY}</Text>
            <Button title={FIRST_RUN.done} onPress={finish} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
