import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Linking, Text, View } from 'react-native';
import { BATCH, HONESTY } from '../core/copy';
import { hasWork, resumeBlocked, runBatch, startBatch, stampedUris, summarize, type BatchItem } from '../core/queue';
import { toDay } from '../core/text';
import { useApp } from '../lib/app';
import { saveToGallery } from '../lib/gallery';
import { canShare, sharePhoto } from '../lib/share';
import { stampPhoto } from '../lib/stampPhoto';
import { clearSession, getSession, setSession, useSession } from '../lib/session';
import { emitReceipt } from '../core/receipt';
import { Button, Row, SCREEN_PAD, SealMark, Spinner, colors, face, shadow, type } from '../ui/kit';

/** The small disc at the left of each row: a check, an exclamation, a dot, or the spinner while working. */
function StatusDisc({ status }: { status: BatchItem['status'] }) {
  if (status === 'working') return <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}><Spinner /></View>;
  const look =
    status === 'done'
      ? { bg: colors.foil, fg: colors.ground, glyph: '\u2713', size: 13 }
      : status === 'failed'
        ? { bg: colors.danger, fg: colors.ivory, glyph: '!', size: 14 }
        : { bg: colors.panelHi, fg: colors.gold, glyph: '\u2022', size: 14 };
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
      <Text style={{ fontFamily: face.bold, fontSize: look.size, color: look.fg }}>{look.glyph}</Text>
    </View>
  );
}

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
      <View style={{ flex: 1, padding: SCREEN_PAD, justifyContent: 'center' }}>
        <SealMark size={96} style={{ alignSelf: 'center', marginBottom: 16, opacity: 0.6 }} />
        <Button title={BATCH.stampAnother} onPress={more} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: BatchItem }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.ruleSoft }}>
      <Image source={{ uri: item.outputUri ?? item.sourceUri }} style={{ width: 60, height: 60, borderRadius: 4, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.panelHi, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Row>
          <StatusDisc status={item.status} />
          <Text style={[type.bodySemi, { color: item.status === 'failed' ? colors.danger : item.status === 'done' ? colors.foil : colors.ivory }]}>{STATUS_WORDS[item.status]}</Text>
        </Row>
        {item.error ? <Text style={[type.small, { color: colors.danger }]}>{item.error}</Text> : null}
      </View>
      {item.status === 'failed' ? <Button title={BATCH.retry} kind="secondary" disabled={session.running} onPress={() => void run(item.id)} style={{ minHeight: 40, paddingHorizontal: 12 }} /> : null}
      {item.status === 'done' && item.outputUri && shareOk ? <Button title={BATCH.share} kind="quiet" onPress={() => void sharePhoto(item.outputUri as string)} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: SCREEN_PAD, paddingBottom: 12 }}>
        <Text style={type.title}>{BATCH.progress(sum.done, sum.total)}</Text>
        <View style={{ height: 8, borderRadius: 2, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.panel, marginTop: 10, overflow: 'hidden' }}>
          <View style={{ height: 6, borderRadius: 2, backgroundColor: colors.foil, width: `${sum.total ? Math.round((sum.done / sum.total) * 100) : 0}%` }} />
        </View>
        {sum.failed > 0 ? <Text style={[type.body, { color: colors.danger, marginTop: 8 }]}>{BATCH.failedCount(sum.failed)}</Text> : null}
        {sum.blocked > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={[type.body, { color: colors.warn }]}>{BATCH.blockedBody(sum.blocked)}</Text>
            <Button title={BATCH.seePlans} kind="secondary" onPress={() => router.push('/paywall')} style={{ marginTop: 8 }} />
          </View>
        ) : null}
      </View>

      <FlatList data={items} keyExtractor={(x) => x.id} renderItem={renderItem} contentContainerStyle={{ paddingHorizontal: SCREEN_PAD }} extraData={session.running} />

      <View style={[{ padding: 16, borderTopWidth: 1, borderTopColor: colors.rule, backgroundColor: colors.panel }, shadow.bar]}>
        {save.kind === 'saved' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelHi, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: 12, marginBottom: 10 }}>
            <Text style={{ fontFamily: face.bold, fontSize: 16, color: colors.foil, marginRight: 8 }}>{'\u2713'}</Text>
            <Text style={[type.bodySemi, { color: colors.foil }]}>{BATCH.saved}</Text>
          </View>
        ) : null}
        {save.kind === 'partial' ? (
          <View style={{ backgroundColor: colors.panelHi, borderWidth: 1, borderColor: colors.warn, borderRadius: 6, padding: 12, marginBottom: 10 }}>
            <Text style={[type.body, { color: colors.ivory, textAlign: 'center' }]}>{BATCH.partial}</Text>
          </View>
        ) : null}
        {save.kind === 'denied' ? (
          <View style={{ marginBottom: 10 }}>
            <Text style={type.cardTitle}>{BATCH.permissionTitle}</Text>
            <Text style={[type.secondary, { marginVertical: 4 }]}>{BATCH.permissionBody}</Text>
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
        <Text style={[type.small, { marginTop: 6 }]}>{HONESTY}</Text>
      </View>
    </View>
  );
}
