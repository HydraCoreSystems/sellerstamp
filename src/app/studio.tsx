import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Switch, Text, View } from 'react-native';
import { NO_ADJUST, NUDGE_STEP, SCALE_STEP, isAdjusted, nudge, type PhotoAdjust } from '../core/adjust';
import { CORNER_NAMES, FONT_NAMES, STRENGTH_NAMES, STUDIO, STYLE_NAMES, STYLE_NOTES, leftLine, HONESTY } from '../core/copy';
import {
  CORNERS,
  FONTS,
  RANGES,
  STRENGTHS,
  STYLES,
  chooseDesign,
  duplicateDesign,
  newDesign,
  removeDesign,
  saveDesign,
  withStyle,
  type StampDesign,
} from '../core/design';
import { LIMITS, toDay } from '../core/text';
import { useApp } from '../lib/app';
import { newId } from '../lib/id';
import { chooseLogo, deleteLogo } from '../lib/logo';
import { discardStamped, makeSamplePhoto, stampPhoto } from '../lib/stampPhoto';
import { getSession, setSession, useSession } from '../lib/session';
import { Button, Chip, Field, Row, Section, Slider, Swatches, colors } from '../ui/kit';

export default function Studio() {
  const app = useApp();
  const session = useSession();
  const photos = session.photos;
  const hasPhotos = photos.length > 0;
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState<StampDesign>(app.design);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const sample = useMemo(() => (hasPhotos ? null : makeSamplePhoto()), [hasPhotos]);

  const photo = photos[Math.min(idx, Math.max(0, photos.length - 1))];
  const adjust: PhotoAdjust = (photo && session.adjusts[photo.id]) || NO_ADJUST;
  const source = photo?.uri ?? sample;
  const update = (patch: Partial<StampDesign>) => setDraft((d) => ({ ...d, ...patch }));

  // The design is kept as the seller edits it, a moment after the last change, and once more on leaving.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  });
  useEffect(() => {
    const t = setTimeout(() => app.saveOne(draft), 500);
    return () => clearTimeout(t);
    // saveOne is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  useEffect(() => () => app.saveOne(draftRef.current), [app.saveOne]); // eslint-disable-line react-hooks/exhaustive-deps

  // The live preview is a smaller copy. Every size follows the short side, so it looks the same as the real one.
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!source) return;
    let live = true;
    const t = setTimeout(() => {
      setBusy(true);
      setFailed(false);
      stampPhoto({ photoUri: source, design: draft, profile: app.profile, adjust, day: toDay(new Date()), maxSide: 1000 })
        .then((r) => {
          if (!live) return discardStamped(r.uri);
          discardStamped(last.current);
          last.current = r.uri;
          setPreview(r.uri);
        })
        .catch(() => live && setFailed(true))
        .finally(() => live && setBusy(false));
    }, 180);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [source, draft, app.profile, adjust.dx, adjust.dy, adjust.scale]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAdjust = (a: PhotoAdjust) => photo && setSession({ adjusts: { ...getSession().adjusts, [photo.id]: a } });

  const pickDesign = (id: string) => {
    app.saveOne(draft);
    app.choose(id);
    const next = app.library.designs.find((d) => d.id === id);
    if (next) setDraft(next);
  };

  const addDesign = () => {
    const d = { ...newDesign(newId(), app.profile), label: `${STUDIO.newDesign} ${app.library.designs.length + 1}` };
    const lib = chooseDesign(saveDesign(saveDesign(app.library, draft), d), d.id);
    app.saveLibrary(lib);
    setDraft(d);
  };

  const copyDesign = () => {
    const lib = duplicateDesign(saveDesign(app.library, draft), draft.id, newId());
    app.saveLibrary(lib);
    setDraft(lib.designs[lib.designs.length - 1]);
  };

  const dropDesign = () => {
    const lib = removeDesign(app.library, draft.id);
    if (lib === app.library) return;
    if (draft.logoFile && !lib.designs.some((d) => d.logoFile === draft.logoFile)) deleteLogo(draft.logoFile);
    app.saveLibrary(lib);
    const next = lib.designs.find((d) => d.id === lib.activeId);
    if (next) setDraft(next);
  };

  const pickLogo = async () => {
    const name = await chooseLogo();
    if (!name) return;
    const old = draft.logoFile;
    update({ logoFile: name, logoMode: draft.logoMode === 'off' ? 'beside' : draft.logoMode });
    if (old && !app.library.designs.some((d) => d.id !== draft.id && d.logoFile === old)) deleteLogo(old);
  };

  const removeLogo = () => {
    const old = draft.logoFile;
    update({ logoFile: null, logoMode: 'off' });
    if (old && !app.library.designs.some((d) => d.id !== draft.id && d.logoFile === old)) deleteLogo(old);
  };

  const start = () => {
    app.saveOne(draft);
    router.push('/batch');
  };

  const repeating = draft.style === 'across' || draft.style === 'tiled';
  const cornerStyle = draft.style === 'corner' || draft.style === 'badge';

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: 270, backgroundColor: '#E9ECF3', alignItems: 'center', justifyContent: 'center' }}>
        {preview ? <Image source={{ uri: preview }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={STUDIO.title} /> : null}
        {busy ? <ActivityIndicator style={{ position: 'absolute', top: 12, right: 12 }} /> : null}
        {failed ? <Text style={{ color: colors.danger, padding: 16 }}>{STUDIO.previewFailed}</Text> : null}
        {hasPhotos && photos.length > 1 ? (
          <Row style={{ position: 'absolute', bottom: 8, left: 8, right: 8, justifyContent: 'space-between' }}>
            <Button title={STUDIO.previous} kind="secondary" disabled={idx === 0} onPress={() => setIdx((n) => Math.max(0, n - 1))} style={{ minHeight: 36, paddingHorizontal: 12 }} />
            <Text style={{ alignSelf: 'center', fontWeight: '700', color: colors.ink }}>{STUDIO.photoOf(idx + 1, photos.length)}</Text>
            <Button title={STUDIO.next} kind="secondary" disabled={idx >= photos.length - 1} onPress={() => setIdx((n) => Math.min(photos.length - 1, n + 1))} style={{ minHeight: 36, paddingHorizontal: 12 }} />
          </Row>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Section title={STUDIO.designs}>
          <Row style={{ flexWrap: 'wrap' }}>
            {app.library.designs.map((d) => (
              <Chip key={d.id} title={d.id === draft.id ? draft.label : d.label} active={d.id === draft.id} onPress={() => pickDesign(d.id)} />
            ))}
            <Chip title={STUDIO.newDesign} onPress={addDesign} />
          </Row>
          <Field label={STUDIO.designName} value={draft.label} maxLength={LIMITS.designLabel} onChangeText={(t) => update({ label: t })} />
          <Field label={STUDIO.roomForDesign} value={draft.roomName} maxLength={LIMITS.roomName} onChangeText={(t) => update({ roomName: t })} />
          <Row>
            <Button title={STUDIO.duplicate} kind="secondary" onPress={copyDesign} style={{ marginRight: 8 }} />
            <Button title={STUDIO.remove} kind="quiet" onPress={dropDesign} disabled={app.library.designs.length <= 1} />
          </Row>
        </Section>

        <Section title={STUDIO.style}>
          <Row style={{ flexWrap: 'wrap' }}>
            {STYLES.map((s) => (
              <Chip key={s} title={STYLE_NAMES[s]} active={draft.style === s} onPress={() => setDraft((d) => withStyle(d, s))} />
            ))}
          </Row>
          <Text style={{ fontSize: 13, color: colors.inkSoft, lineHeight: 19 }}>{STYLE_NOTES[draft.style]}</Text>
        </Section>

        <Section title={STUDIO.words}>
          <Field label={STUDIO.customText} hint={STUDIO.customHint} value={draft.customText} maxLength={LIMITS.customMain} onChangeText={(t) => update({ customText: t })} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{STUDIO.showDate}</Text>
            <Switch value={draft.showDate} onValueChange={(v) => update({ showDate: v })} accessibilityLabel={STUDIO.showDate} />
          </Row>
        </Section>

        <Section title={STUDIO.look}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>{STUDIO.font}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {FONTS.map((f) => (
              <Chip key={f} title={FONT_NAMES[f]} active={draft.font === f} onPress={() => update({ font: f })} />
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{STUDIO.bold}</Text>
            <Switch value={draft.bold} onValueChange={(v) => update({ bold: v })} accessibilityLabel={STUDIO.bold} />
          </Row>
          <Swatches label={STUDIO.textColor} value={draft.textColor} onChange={(c) => update({ textColor: c })} />
          <Swatches label={STUDIO.bandColor} value={draft.bandColor} onChange={(c) => update({ bandColor: c })} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>{STUDIO.strength}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {STRENGTHS.map((s) => (
              <Chip key={s} title={STRENGTH_NAMES[s]} active={draft.strength === s} onPress={() => update({ strength: s })} />
            ))}
          </Row>
        </Section>

        <Section title={STUDIO.sliders}>
          <Slider label={STUDIO.size} value={draft.size} {...RANGES.size} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update({ size: v })} />
          <Slider label={STUDIO.spacing} value={draft.spacing} {...RANGES.spacing} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update({ spacing: v })} />
          <Slider label={STUDIO.opacity} value={draft.opacity} {...RANGES.opacity} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update({ opacity: v })} />
          {repeating ? <Slider label={STUDIO.angle} value={draft.angle} {...RANGES.angle} format={(v) => `${Math.round(v)} degrees`} onChange={(v) => update({ angle: v })} /> : null}
          {cornerStyle ? (
            <>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 6 }}>{STUDIO.corner}</Text>
              <Row style={{ flexWrap: 'wrap' }}>
                {CORNERS.map((c) => (
                  <Chip key={c} title={CORNER_NAMES[c]} active={draft.corner === c} onPress={() => update({ corner: c })} />
                ))}
              </Row>
            </>
          ) : null}
        </Section>

        <Section title={STUDIO.logo}>
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip title={STUDIO.logoOff} active={draft.logoMode === 'off'} onPress={() => update({ logoMode: 'off' })} />
            <Chip title={STUDIO.logoBeside} active={draft.logoMode === 'beside'} onPress={() => draft.logoFile && update({ logoMode: 'beside' })} />
            <Chip title={STUDIO.logoAlone} active={draft.logoMode === 'alone'} onPress={() => draft.logoFile && update({ logoMode: 'alone' })} />
          </Row>
          <Row>
            <Button title={STUDIO.logoChoose} kind="secondary" onPress={() => void pickLogo()} style={{ marginRight: 8 }} />
            {draft.logoFile ? <Button title={STUDIO.logoRemove} kind="quiet" onPress={removeLogo} /> : null}
          </Row>
        </Section>

        {draft.style !== 'badge' ? (
          <Section title={STUDIO.badge}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{STUDIO.badgeOn}</Text>
              <Switch value={draft.badge.on} onValueChange={(v) => update({ badge: { ...draft.badge, on: v } })} accessibilityLabel={STUDIO.badgeOn} />
            </Row>
            {draft.badge.on ? (
              <>
                <Field label={STUDIO.badgeWords} hint={STUDIO.badgeHint} value={draft.badge.text} maxLength={LIMITS.badge} onChangeText={(t) => update({ badge: { ...draft.badge, text: t } })} />
                <Row style={{ flexWrap: 'wrap' }}>
                  {CORNERS.map((c) => (
                    <Chip key={c} title={CORNER_NAMES[c]} active={draft.badge.corner === c} onPress={() => update({ badge: { ...draft.badge, corner: c } })} />
                  ))}
                </Row>
              </>
            ) : null}
          </Section>
        ) : (
          <Section title={STUDIO.badge}>
            <Field label={STUDIO.badgeWords} hint={STUDIO.badgeHint} value={draft.badge.text} maxLength={LIMITS.badge} onChangeText={(t) => update({ badge: { ...draft.badge, text: t } })} />
          </Section>
        )}

        {hasPhotos ? (
          <Section title={STUDIO.thisPhoto} hint={STUDIO.thisPhotoHint}>
            <Row style={{ flexWrap: 'wrap' }}>
              <Chip title={STUDIO.left} onPress={() => setAdjust(nudge(adjust, { dx: -NUDGE_STEP }))} />
              <Chip title={STUDIO.right} onPress={() => setAdjust(nudge(adjust, { dx: NUDGE_STEP }))} />
              <Chip title={STUDIO.up} onPress={() => setAdjust(nudge(adjust, { dy: -NUDGE_STEP }))} />
              <Chip title={STUDIO.down} onPress={() => setAdjust(nudge(adjust, { dy: NUDGE_STEP }))} />
              <Chip title={STUDIO.smaller} onPress={() => setAdjust(nudge(adjust, { scale: -SCALE_STEP }))} />
              <Chip title={STUDIO.larger} onPress={() => setAdjust(nudge(adjust, { scale: SCALE_STEP }))} />
            </Row>
            <Button title={STUDIO.reset} kind="quiet" disabled={!isAdjusted(adjust)} onPress={() => setAdjust(NO_ADJUST)} />
          </Section>
        ) : null}

        <Text style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 17 }}>{HONESTY}</Text>
      </ScrollView>

      {hasPhotos ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Text style={{ fontSize: 13, color: colors.inkSoft, marginBottom: 6, textAlign: 'center' }}>{app.unlimited ? '' : leftLine(app.left)}</Text>
          <Button title={`${STUDIO.start} (${photos.length})`} onPress={start} />
        </View>
      ) : null}
    </View>
  );
}
