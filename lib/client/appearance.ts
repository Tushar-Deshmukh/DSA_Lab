import type { SettingsValues } from '@/lib/domain/settings';

// Theme, motion and focus mode are learner settings, which load from IndexedDB after the page starts. To avoid a
// flash of the wrong theme, a copy of these three values is kept in localStorage and applied by a tiny inline
// script before the first paint. The copy is a convenience; the settings document stays the source of truth.

const KEYS = { theme: 'dpl-theme', motion: 'dpl-motion', focus: 'dpl-focus' } as const;

export const APPEARANCE_INIT_SCRIPT =
  "(function(){try{var d=document.documentElement,s=window.localStorage,t=s.getItem('dpl-theme'),m=s.getItem('dpl-motion'),f=s.getItem('dpl-focus');" +
  "if(t==='light'||t==='dark')d.dataset.theme=t;if(m==='reduce'||m==='full')d.dataset.motion=m;if(f==='on')d.dataset.focus='on'}catch(e){}})()";

type Appearance = Pick<SettingsValues, 'theme' | 'reducedMotion' | 'focusMode'>;

export function applyAppearance(s: Appearance): void {
  const d = document.documentElement;
  if (s.theme === 'system') delete d.dataset.theme;
  else d.dataset.theme = s.theme;
  if (s.reducedMotion === 'system') delete d.dataset.motion;
  else d.dataset.motion = s.reducedMotion;
  if (s.focusMode) d.dataset.focus = 'on';
  else delete d.dataset.focus;
  try {
    const ls = window.localStorage;
    if (s.theme === 'system') ls.removeItem(KEYS.theme);
    else ls.setItem(KEYS.theme, s.theme);
    if (s.reducedMotion === 'system') ls.removeItem(KEYS.motion);
    else ls.setItem(KEYS.motion, s.reducedMotion);
    if (s.focusMode) ls.setItem(KEYS.focus, 'on');
    else ls.removeItem(KEYS.focus);
  } catch {
    // Storage blocked: the page still follows the settings for this visit.
  }
}
