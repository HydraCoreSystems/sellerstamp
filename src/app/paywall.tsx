import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, ScrollView, Text, View } from 'react-native';
import { PAYWALL, TERMS_URL } from '../core/copy';
import { PLAN_ANNUAL, PLAN_LIFETIME, PLAN_MONTHLY, planLine, type PlanProduct } from '../core/entitlement';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/app';
import { buy, iapAvailable, loadPlans, restore } from '../lib/iap';
import { useSampleStamp } from '../lib/useSampleStamp';
import { Button, Panel, Row, Rule, SCREEN_PAD, SealMark, Section, Spinner, Wordmark, colors, face, type } from '../ui/kit';

const NAMES: Record<string, string> = { [PLAN_ANNUAL]: PAYWALL.annual, [PLAN_MONTHLY]: PAYWALL.monthly, [PLAN_LIFETIME]: PAYWALL.lifetime };

/**
 * The paywall. It says plainly that the free app is the whole app and only the count is lifted, and
 * it never blocks a photo that is already stamped from being saved.
 */
export default function Paywall() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<PlanProduct[] | null>(null);
  const [down, setDown] = useState(false);
  const [working, setWorking] = useState(false);
  const strip = useSampleStamp(app.design, app.profile, { maxSide: 800, frame: [1200, 410] });

  const load = useCallback(() => {
    setDown(false);
    setPlans(null);
    if (!iapAvailable()) {
      setDown(true);
      return;
    }
    loadPlans()
      .then((r) => setPlans(r.products))
      .catch(() => setDown(true));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loading plans on open is the point of this effect
  useEffect(load, [load]);

  // The moment a purchase goes through, the count is lifted and the screen closes by itself.
  useEffect(() => {
    if (app.unlimited) router.back();
  }, [app.unlimited]);

  const choose = async (sku: string) => {
    setWorking(true);
    try {
      await buy(sku);
    } catch {
      setDown(true);
    } finally {
      setWorking(false);
    }
  };

  const doRestore = async () => {
    setWorking(true);
    try {
      app.setEntitlement(await restore());
    } catch {
      setDown(true);
    } finally {
      setWorking(false);
    }
  };

  const tick = (text: string) => (
    <Row style={{ alignItems: 'flex-start', marginBottom: 8 }}>
      <Text style={{ fontFamily: face.bold, fontSize: 16, lineHeight: 23, color: colors.foil, width: 24 }}>{'\u2713'}</Text>
      <Text style={[type.body, { flex: 1 }]}>{text}</Text>
    </Row>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: SCREEN_PAD, paddingBottom: 40 + insets.bottom }}>
      <View style={{ alignItems: 'center' }}>
        <SealMark size={96} />
        <Wordmark size={22} style={{ marginTop: 6, textAlign: 'center' }}>{PAYWALL.title}</Wordmark>
      </View>
      <Rule />
      <View style={{ height: 120, borderRadius: 6, borderWidth: 1, borderColor: colors.rule, overflow: 'hidden', backgroundColor: colors.stage, marginBottom: 14 }}>
        {strip.uri ? <Image source={{ uri: strip.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}
      </View>
      <Text style={[type.body, { color: colors.gold, marginBottom: 12 }]}>{PAYWALL.body}</Text>
      {tick(PAYWALL.everything)}
      {tick(PAYWALL.kept)}
      <View style={{ height: 8 }} />

      {plans === null && !down ? <Spinner style={{ marginVertical: 24 }} /> : null}
      {down ? (
        <Section title={PAYWALL.storeDown}>
          <Button title={PAYWALL.tryAgain} kind="secondary" onPress={load} />
        </Section>
      ) : null}
      {plans?.map((p) => {
        const lifetime = p.id === PLAN_LIFETIME;
        return (
          <Panel key={p.id} style={[{ padding: 18 }, lifetime && { borderWidth: 1, borderColor: colors.foil }]}>
            {lifetime ? (
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.wax, borderWidth: 1, borderColor: colors.gold, borderRadius: 4, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 8 }}>
                <Text style={{ fontFamily: face.bold, fontSize: 12, letterSpacing: 1.5, color: colors.foil }}>{PAYWALL.payOnce.toUpperCase()}</Text>
              </View>
            ) : null}
            <Text style={[type.cardTitle, { marginBottom: 6 }]}>{NAMES[p.id] ?? p.id}</Text>
            <Text style={{ fontFamily: face.semi, fontSize: 17, lineHeight: 24, color: colors.ivory, marginBottom: 12 }}>{planLine(p)}</Text>
            <Button title={PAYWALL.buy} kind={lifetime ? 'primary' : 'secondary'} onPress={() => void choose(p.id)} disabled={working} />
          </Panel>
        );
      })}

      <Button title={PAYWALL.restore} kind="quiet" onPress={() => void doRestore()} disabled={working} />
      <Button title={PAYWALL.notNow} kind="quiet" onPress={() => router.back()} />

      <View style={{ marginTop: 16 }}>
        {PAYWALL.terms.map((t) => (
          <Text key={t} style={{ fontFamily: face.regular, fontSize: 11, color: colors.gold, lineHeight: 16, marginBottom: 4 }}>{t}</Text>
        ))}
        <Button title={PAYWALL.termsLink} kind="quiet" onPress={() => void Linking.openURL(TERMS_URL)} />
      </View>
    </ScrollView>
  );
}
