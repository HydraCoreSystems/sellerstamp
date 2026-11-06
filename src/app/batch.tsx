import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Text, View } from 'react-native';
import { BATCH, HONESTY } from '../core/copy';
import { hasWork, resumeBlocked, runBatch, startBatch, stampedUris, summarize, type BatchItem } from '../core/queue';
import { toDay } from '../core/text';
import { useApp } from '../lib/app';
import { saveToGallery } from '../lib/gallery';
import { canShare, sharePhoto } from '../lib/share';
import { stampPhoto } from '../lib/stampPhoto';
import { clearSession, getSession, setSession, useSession } from '../lib/session';
import { emitReceipt } from '../core/receipt';
import { Button, Row, colors } from '../ui/kit';

type SaveState = { kind: 'idle' } | { kind: 'saved' } | { kind: 'denied'; canAskAgain: boolean } | { kind: 'partial' };

const STATUS_WORDS = { waiting: BATCH.waiting, working: BATCH.working, done: BATCH.done, failed: BATCH.failed, blocked: BATCH.blocked } as const;

export default function Batch() {
  const app = useApp();
  const session = useSession();
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [shareOk, setShareOk] = useState(false);
  const appRef = useRef(app);
  useEffect(() => {
    appRef.current = app;
  });
  // The design in use when stamping began. A stamp run never changes midway.
  const design = useRef(app.design).current;
  const sizes = useRef(new Map<string, { w: number; h: number }>());
  const started = useRef(false);
  const asked = useRef(false);

  const run = useCallback(async (only?: string) => {
    if (getSession().running) return;
    setSession({ running: true });
    const day = toDay(new Date());
    try {
      const out = await runBatch({
        items: getSession().items,
        only,
        allowance: appRef.current.left,
        stamp: async (item) => {
          const r = await stampPhoto({ photoUri: item.sourceUri, design, profile: appRef.current.profile, adjust: getSession().adjusts[item.id], day });
          sizes.current.set(item.id, { w: r.width, h: r.height });
          return r.uri;
        },
        onUpdate: (items) => setSession({ items }),
        onStamped: async (item) => {
          // Counted the moment it is made, so a stamp is never counted twice and never lost.
          appRef.current.countStamps(1);
          const got = getSession().items.find((x) => x.id === item.id);
          const size = sizes.current.get(item.id);
          if (got?.outputUri && size) {
            await emitReceipt({ photoId: item.id, stampedAt: Date.now(), designId: design.id, style: design.style, width: size.w, height: size.h, sourceUri: item.sourceUri, outputUri: got.outputUri });
          }
        },
      });
      if (out.some((x) => x.status === 'blocked') && !asked.current) {
        asked.current = true;
        router.push('/paywall');
      }
    } finally {
      setSession({ running: false });
    }
  }, [design]);

  useEffect(() => {
    void canShare().then(setShareOk);
    if (started.current) return;
    started.current = true;
    const s = getSession();
    if (s.items.length === 0 && s.photos.length > 0) {
      setSession({ items: startBatch(s.photos.map((p) => ({ id: p.id, uri: p.uri }))) });
      void run();
    }
  }, [run]);

  // After the seller unlocks stamps, photos held back by the count go back in line and run.
  useEffect(() => {
    const s = getSession();
    if (app.unlimited && !s.running && s.items.some((x) => x.status === 'blocked')) {
      setSession({ items: resumeBlocked(s.items) });
      void run();
    }
  }, [app.unlimited, run]);

  // A free stamp left over after unlocking more is used the same way: tap to continue.
  const items = session.items;
  const sum = summarize(items);
  const stamped = stampedUris(items);
  const pendingSave = stamped.filter((u) => !session.savedUris.includes(u));

  const saveAll = async () => {
    const todo = stampedUris(getSession().items).filter((u) => !getSession().savedUris.includes(u));
    if (todo.length === 0) return setSave({ kind: 'saved' });
    const r = await saveToGallery(todo);
    setSession({ savedUris: [...getSession().savedUris, ...r.saved] });
    if (!r.allowed) setSave({ kind: 'denied', canAskAgain: r.canAskAgain });
    else setSave(r.failed.length ? { kind: 'partial' } : { kind: 'saved' });
  };

  const more = () => {
    clearSession();
    router.replace('/');
  };

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        <Button title={BATCH.stampAnother} onPress={more} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: BatchItem }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Image source={{ uri: item.outputUri ?? item.sourceUri }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.line, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Row>
          {item.status === 'working' ? <ActivityIndicator style={{ marginRight: 6 }} /> : null}
          <Text style={{ fontWeight: '700', color: item.status === 'failed' ? colors.danger : item.status === 'done' ? colors.accent : colors.ink }}>{STATUS_WORDS[item.status]}</Text>
        </Row>
        {item.error ? <Text style={{ fontSize: 12, color: colors.danger }}>{item.error}</Text> : null}
      </View>
      {item.status === 'failed' ? <Button title={BATCH.retry} kind="secondary" disabled={session.running} onPress={() => void run(item.id)} style={{ minHeight: 36, paddingHorizontal: 12 }} /> : null}
      {item.status === 'done' && item.outputUri && shareOk ? <Button title={BATCH.share} kind="quiet" onPress={() => void sharePhoto(item.outputUri as string)} style={{ minHeight: 36, paddingHorizontal: 12 }} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{BATCH.progress(sum.done, sum.total)}</Text>
        {sum.failed > 0 ? <Text style={{ color: colors.danger, marginTop: 2 }}>{BATCH.failedCount(sum.failed)}</Text> : null}
        {sum.blocked > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: colors.warn, lineHeight: 19 }}>{BATCH.blockedBody(sum.blocked)}</Text>
            <Button title={BATCH.seePlans} kind="secondary" onPress={() => router.push('/paywall')} style={{ marginTop: 8 }} />
          </View>
        ) : null}
      </View>

      <FlatList data={items} keyExtractor={(x) => x.id} renderItem={renderItem} contentContainerStyle={{ paddingHorizontal: 16 }} extraData={session.running} />

      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg }}>
        {save.kind === 'saved' ? <Text style={{ color: colors.accent, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>{BATCH.saved}</Text> : null}
        {save.kind === 'partial' ? <Text style={{ color: colors.warn, marginBottom: 8, textAlign: 'center' }}>{BATCH.partial}</Text> : null}
        {save.kind === 'denied' ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: '800', color: colors.ink }}>{BATCH.permissionTitle}</Text>
            <Text style={{ color: colors.inkSoft, lineHeight: 19, marginVertical: 4 }}>{BATCH.permissionBody}</Text>
            <Button title={BATCH.openSettings} kind="secondary" onPress={() => void Linking.openSettings()} />
          </View>
        ) : null}
        <Button
          title={save.kind === 'denied' || save.kind === 'partial' ? BATCH.saveAgain : BATCH.saveAll}
          onPress={() => void saveAll()}
          disabled={stamped.length === 0 || session.running || (save.kind === 'saved' && pendingSave.length === 0)}
        />
        <Row style={{ marginTop: 8, justifyContent: 'space-between' }}>
          {hasWork(items) && !session.running && sum.blocked === 0 ? <Button title={BATCH.continue} kind="quiet" onPress={() => void run()} /> : <View />}
          <Button title={BATCH.stampAnother} kind="quiet" onPress={more} disabled={session.running} />
        </Row>
        <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 6, lineHeight: 16 }}>{HONESTY}</Text>
      </View>
    </View>
  );
}
