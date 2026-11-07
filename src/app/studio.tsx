import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
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
  type StyleId,
} from '../core/design';
import type { SellerProfile } from '../core/profile';
import { LIMITS, toDay } from '../core/text';
import { useApp } from '../lib/app';
import { newId } from '../lib/id';
import { chooseLogo, deleteLogo, logoUri } from '../lib/logo';
import { useSampleStamp } from '../lib/useSampleStamp';
import { discardStamped, makeSamplePhoto, stampPhoto } from '../lib/stampPhoto';
import { getSession, setSession, useSession } from '../lib/session';
import { Button, Chip, Field, RoundButton, Row, Section, Slider, Spinner, Swatches, Toggle, colors, face, shadow, type } from '../ui/kit';

/** One miniature of a style: the seller's own words, colors and font on the sample plant. */
function StyleTile({ style, draft, profile, selected, onPick, onFail }: { style: StyleId; draft: StampDesign; profile: SellerProfile; selected: boolean; onPick: () => void; onFail: () => void }) {
  const mini = useSampleStamp(withStyle(draft, style), profile, { maxSide: 420, delay: 400, frame: [1200, 830] });
  useEffect(() => {
    if (mini.failed) onFail();
  }, [mini.failed]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={STYLE_NAMES[style]}
      accessibilityState={{ selected }}
      onPress={onPick}
      style={{ width: '48%', marginBottom: 12 }}
    >
      <View style={{ height: 104, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.panel, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.foil : colors.rule }}>
        {mini.uri ? (
          <Image source={{ uri: mini.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.panelHi, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={type.small}>{STYLE_NAMES[style]}</Text>
          </View>
        )}
      </View>
      <Text style={[type.chip, { fontSize: 13, marginTop: 6, color: selected ? colors.foil : colors.ivory }]}>{STYLE_NAMES[style]}</Text>
    </Pressable>
  );
}

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
  const [gridFailed, setGridFailed] = useState(false);
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

  const sampleLine = draft.customText.trim() || [app.profile.sellerName, draft.roomName || app.profile.roomName].filter(Boolean).join('  \u00B7  ');
  const repeating = draft.style === 'across' || draft.style === 'tiled' || draft.style === 'waxSeal';
  const cornerStyle = draft.style === 'corner' || draft.style === 'badge' || draft.style === 'waxSeal';

  return (
    <View style={{ flex: 1 }}>
      <View style={[{ height: 300, margin: 16, marginBottom: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.stage, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, shadow.card]}>
        {preview ? <Image source={{ uri: preview }} style={{ width: '100%', height: photos.length > 1 ? 248 : '100%', marginBottom: photos.length > 1 ? 52 : 0 }} resizeMode="contain" accessibilityLabel={STUDIO.title} /> : null}
        {busy ? <Spinner style={{ position: 'absolute', top: 12, right: 12 }} /> : null}
        {failed ? <Text style={[type.body, { color: colors.danger, padding: 16 }]}>{STUDIO.previewFailed}</Text> : null}
        {hasPhotos && photos.length > 1 ? (
          <>
            <RoundButton glyph={'\u2039'} label={STUDIO.previous} size={40} fill={colors.panelHi} onPress={() => setIdx((n) => Math.max(0, n - 1))} style={{ position: 'absolute', left: 10, bottom: 10, opacity: idx === 0 ? 0.4 : 1 }} />
            <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: colors.scrim, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: face.semi, fontSize: 13, color: colors.ivory }}>{STUDIO.photoOf(idx + 1, photos.length)}</Text>
            </View>
            <RoundButton glyph={'\u203A'} label={STUDIO.next} size={40} fill={colors.panelHi} onPress={() => setIdx((n) => Math.min(photos.length - 1, n + 1))} style={{ position: 'absolute', right: 10, bottom: 10, opacity: idx >= photos.length - 1 ? 0.4 : 1 }} />
          </>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
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
          {gridFailed ? (
            <Row style={{ flexWrap: 'wrap' }}>
              {STYLES.map((s) => (
                <Chip key={s} title={STYLE_NAMES[s]} active={draft.style === s} onPress={() => setDraft((d) => withStyle(d, s))} />
              ))}
            </Row>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {STYLES.map((s) => (
                <StyleTile key={s} style={s} draft={draft} profile={app.profile} selected={draft.style === s} onPick={() => setDraft((d) => withStyle(d, s))} onFail={() => setGridFailed(true)} />
              ))}
            </View>
          )}
          <Text style={type.secondary}>{STYLE_NOTES[draft.style]}</Text>
        </Section>

        <Section title={STUDIO.words}>
          <Field label={STUDIO.customText} hint={STUDIO.customHint} value={draft.customText} maxLength={LIMITS.customMain} onChangeText={(t) => update({ customText: t })} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={type.bodySemi}>{STUDIO.showDate}</Text>
            <Toggle value={draft.showDate} onValueChange={(v) => update({ showDate: v })} label={STUDIO.showDate} />
          </Row>
        </Section>

        <Section title={STUDIO.look}>
          <Text style={[type.label, { marginBottom: 6 }]}>{STUDIO.font}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {FONTS.map((f) => (
              <Chip key={f} title={FONT_NAMES[f]} active={draft.font === f} onPress={() => update({ font: f })} />
            ))}
          </Row>
          <Text style={{ fontSize: 20, color: colors.ivory, marginBottom: 14, fontWeight: draft.bold ? '700' : '400' }} numberOfLines={1}>
            {sampleLine}
          </Text>
          <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={type.bodySemi}>{STUDIO.bold}</Text>
            <Toggle value={draft.bold} onValueChange={(v) => update({ bold: v })} label={STUDIO.bold} />
          </Row>
          <Swatches label={STUDIO.textColor} value={draft.textColor} onChange={(c) => update({ textColor: c })} />
          <Swatches label={STUDIO.bandColor} value={draft.bandColor} onChange={(c) => update({ bandColor: c })} />
          <Text style={[type.label, { marginBottom: 6 }]}>{STUDIO.strength}</Text>
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
              <Text style={[type.label, { marginBottom: 6 }]}>{STUDIO.corner}</Text>
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
            {draft.logoFile ? <Image source={{ uri: logoUri(draft.logoFile) }} resizeMode="contain" style={{ width: 44, height: 44, borderRadius: 4, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.panelHi, marginRight: 10 }} accessibilityLabel={STUDIO.logo} /> : null}
            <Button title={STUDIO.logoChoose} kind="secondary" onPress={() => void pickLogo()} style={{ marginRight: 8 }} />
            {draft.logoFile ? <Button title={STUDIO.logoRemove} kind="quiet" onPress={removeLogo} /> : null}
          </Row>
        </Section>

        {draft.style !== 'badge' ? (
          <Section title={STUDIO.badge}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={type.bodySemi}>{STUDIO.badgeOn}</Text>
              <Toggle value={draft.badge.on} onValueChange={(v) => update({ badge: { ...draft.badge, on: v } })} label={STUDIO.badgeOn} />
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
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <RoundButton glyph={'\u2191'} label={STUDIO.up} onPress={() => setAdjust(nudge(adjust, { dy: -NUDGE_STEP }))} />
              <Row style={{ marginVertical: 6 }}>
                <RoundButton glyph={'\u2190'} label={STUDIO.left} onPress={() => setAdjust(nudge(adjust, { dx: -NUDGE_STEP }))} />
                <RoundButton glyph={'\u2193'} label={STUDIO.down} onPress={() => setAdjust(nudge(adjust, { dy: NUDGE_STEP }))} style={{ marginHorizontal: 6 }} />
                <RoundButton glyph={'\u2192'} label={STUDIO.right} onPress={() => setAdjust(nudge(adjust, { dx: NUDGE_STEP }))} />
              </Row>
            </View>
            <Row style={{ justifyContent: 'center' }}>
              <Chip title={STUDIO.smaller} onPress={() => setAdjust(nudge(adjust, { scale: -SCALE_STEP }))} />
              <Chip title={STUDIO.larger} onPress={() => setAdjust(nudge(adjust, { scale: SCALE_STEP }))} />
            </Row>
            <Button title={STUDIO.reset} kind="quiet" disabled={!isAdjusted(adjust)} onPress={() => setAdjust(NO_ADJUST)} />
          </Section>
        ) : null}

        <Text style={type.small}>{HONESTY}</Text>
      </ScrollView>

      {hasPhotos ? (
        <View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: colors.panel, borderTopWidth: 1, borderTopColor: colors.rule }, shadow.bar]}>
          <Text style={[type.small, { marginBottom: 6, textAlign: 'center' }]}>{leftLine(app.unlimited ? Infinity : app.left)}</Text>
          <Button title={`${STUDIO.start} (${photos.length})`} onPress={start} />
        </View>
      ) : null}
    </View>
  );
}
