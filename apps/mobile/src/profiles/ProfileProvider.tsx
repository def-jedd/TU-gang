import { File, Paths } from 'expo-file-system';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { cleanName, markDone, mergeProfiles, newProfileId, normalizeProfile, recordExam, type Avatar, type Profile } from './profileCard';

/**
 * Students on THIS phone. Progress is saved here automatically, and onto the
 * student's NFC card when they tap "Save to card", so it can move to another
 * phone with no internet. Nothing is sent to a server.
 */
type Saved = { version: 1; activeId: string | null; profiles: Profile[] };

type ProfilesValue = {
  ready: boolean;
  profiles: Profile[];
  active: Profile | null;
  setActive: (id: string | null) => void;
  create: (input: { name: string; grade: number; avatar: Avatar }) => Profile;
  remove: (id: string) => void;
  /** A profile card was tapped: merge it into this phone and switch to it. */
  importFromCard: (card: Profile) => Profile;
  /** Track 1 — the active student READ/heard a lesson (topic or curriculum id). */
  markLessonDone: (lesson: string) => void;
  /** Track 2 — the active student took a lesson's exam (score 0–100). */
  recordExamResult: (lesson: string, score: number) => void;
};

const Ctx = createContext<ProfilesValue | null>(null);

function storeFile(): File | null {
  try {
    return new File(Paths.document, 'tugang-profiles.json');
  } catch {
    return null; // web / no file system: profiles live in memory only
  }
}

async function load(): Promise<Saved> {
  const empty: Saved = { version: 1, activeId: null, profiles: [] };
  try {
    const file = storeFile();
    if (!file?.exists) return empty;
    const data = JSON.parse(await file.text()) as Saved;
    if (!Array.isArray(data.profiles)) return empty;
    // Saves from before exams existed have no `passed`/`scores`.
    return { ...data, profiles: data.profiles.map(normalizeProfile) };
  } catch {
    return empty;
  }
}

function save(data: Saved) {
  try {
    const file = storeFile();
    if (!file) return;
    if (!file.exists) file.create();
    file.write(JSON.stringify(data));
  } catch (error) {
    console.warn('[profiles] could not save on this phone', error);
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Saved>({ version: 1, activeId: null, profiles: [] });
  const [ready, setReady] = useState(false);
  // Synchronous mirror so two quick events (card tap + lesson done) never
  // overwrite each other.
  const dataRef = useRef(data);

  useEffect(() => {
    load().then((loaded) => {
      dataRef.current = loaded;
      setData(loaded);
      setReady(true);
    });
  }, []);

  const commit = useCallback((next: Saved) => {
    dataRef.current = next;
    setData(next);
    save(next);
  }, []);

  const upsert = useCallback(
    (profile: Profile, makeActive: boolean) => {
      const current = dataRef.current;
      const others = current.profiles.filter((p) => p.id !== profile.id);
      commit({ ...current, profiles: [...others, profile], activeId: makeActive ? profile.id : current.activeId });
    },
    [commit],
  );

  const setActive = useCallback(
    (id: string | null) => commit({ ...dataRef.current, activeId: id }),
    [commit],
  );

  const create = useCallback(
    (input: { name: string; grade: number; avatar: Avatar }) => {
      const profile: Profile = {
        id: newProfileId(),
        name: cleanName(input.name) || 'Student',
        grade: Math.min(9, Math.max(1, Math.round(input.grade))),
        avatar: input.avatar,
        done: [],
        passed: [],
        scores: {},
      };
      upsert(profile, true);
      return profile;
    },
    [upsert],
  );

  const remove = useCallback(
    (id: string) => {
      const current = dataRef.current;
      commit({
        ...current,
        profiles: current.profiles.filter((p) => p.id !== id),
        activeId: current.activeId === id ? null : current.activeId,
      });
    },
    [commit],
  );

  const importFromCard = useCallback(
    (card: Profile) => {
      const merged = mergeProfiles(dataRef.current.profiles.find((p) => p.id === card.id), card);
      upsert(merged, true);
      return merged;
    },
    [upsert],
  );

  const markLessonDone = useCallback(
    (lesson: string) => {
      const current = dataRef.current;
      const active = current.profiles.find((p) => p.id === current.activeId);
      if (!active || active.done.at(-1) === lesson) return;
      upsert(markDone(active, lesson), true);
    },
    [upsert],
  );

  const recordExamResult = useCallback(
    (lesson: string, score: number) => {
      const current = dataRef.current;
      const active = current.profiles.find((p) => p.id === current.activeId);
      if (active) upsert(recordExam(active, lesson, score), true);
    },
    [upsert],
  );

  const value = useMemo<ProfilesValue>(
    () => ({
      ready,
      profiles: [...data.profiles].sort((a, b) => a.name.localeCompare(b.name)),
      active: data.profiles.find((p) => p.id === data.activeId) ?? null,
      setActive,
      create,
      remove,
      importFromCard,
      markLessonDone,
      recordExamResult,
    }),
    [data, ready, setActive, create, remove, importFromCard, markLessonDone, recordExamResult],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfiles(): ProfilesValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfiles must be used inside <ProfileProvider>');
  return ctx;
}
