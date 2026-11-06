import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { PAYWALL, TERMS_URL } from '../core/copy';
import { PLAN_ANNUAL, PLAN_LIFETIME, PLAN_MONTHLY, planLine, type PlanProduct } from '../core/entitlement';
import { useApp } from '../lib/app';
import { buy, iapAvailable, loadPlans, restore } from '../lib/iap';
import { Button, Section, colors } from '../ui/kit';

const NAMES: Record<string, string> = { [PLAN_ANNUAL]: PAYWALL.annual, [PLAN_MONTHLY]: PAYWALL.monthly, [PLAN_LIFETIME]: PAYWALL.lifetime };

/**
 * The paywall. It says plainly that the free app is the whole app and only the count is lifted, and
 * it never blocks a photo that is already stamped from being saved.
 */
export default function Paywall() {
  const app = useApp();
  const [plans, setPlans] = useState<PlanProduct[] | null>(null);
  const [down, setDown] = useState(false);
  const [working, setWorking] = useState(false);

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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 8 }}>{PAYWALL.title}</Text>
      <Text style={{ fontSize: 15, color: colors.inkSoft, lineHeight: 22, marginBottom: 6 }}>{PAYWALL.body}</Text>
      <Text style={{ fontSize: 15, color: colors.inkSoft, lineHeight: 22, marginBottom: 6 }}>{PAYWALL.everything}</Text>
      <Text style={{ fontSize: 15, color: colors.inkSoft, lineHeight: 22, marginBottom: 16 }}>{PAYWALL.kept}</Text>

      {plans === null && !down ? <ActivityIndicator style={{ marginVertical: 24 }} /> : null}
      {down ? (
        <Section title={PAYWALL.storeDown}>
          <Button title={PAYWALL.tryAgain} kind="secondary" onPress={load} />
        </Section>
      ) : null}
      {plans?.map((p) => (
        <Section key={p.id} title={NAMES[p.id] ?? p.id}>
          <Text style={{ fontSize: 16, color: colors.ink, marginBottom: 10 }}>{planLine(p)}</Text>
          <Button title={PAYWALL.buy} onPress={() => void choose(p.id)} disabled={working} />
        </Section>
      ))}

      <Button title={PAYWALL.restore} kind="quiet" onPress={() => void doRestore()} disabled={working} />
      <Button title={PAYWALL.notNow} kind="quiet" onPress={() => router.back()} />

      <View style={{ marginTop: 16 }}>
        {PAYWALL.terms.map((t) => (
          <Text key={t} style={{ fontSize: 11, color: colors.inkSoft, lineHeight: 16, marginBottom: 4 }}>{t}</Text>
        ))}
        <Button title={PAYWALL.termsLink} kind="quiet" onPress={() => void Linking.openURL(TERMS_URL)} />
      </View>
    </ScrollView>
  );
}
