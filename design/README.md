# Settings window — design notes

Redesign of the settings window following the UI Taste playbooks (uizze.sh `ui-taste`).

**Direction:** a familiar Windows 11 settings window. The live snowy preview is the hero; controls fade into the task.
One cool grey family, one blue accent (only for on/selected states, slider fill and the primary button),
radii 4 / 6 / 8 px, Segoe UI Variable, monochrome line icons (no emoji), light and dark follow the Windows app mode.

**Target:** `target-settings.png` — generated with an image model before coding (only a 512 px preview was retrievable).
Implemented at the window's client size (1064×721 logical, captured at 125 %).

**Checked:** light + dark; keyboard focus ring; hover; switch, dropdown, segmented and scene toggles saving;
two-screen preview; button label following the picked scene. Text contrast ≥ 4.6:1 for all text pairs.
Not checked: the real WebView2 window on Windows (captures are from Chromium), Windows text scaling above 100 %.

| file | size | sha256 (first 16) |
|---|---|---|
| target-settings.png | 512×343 | 8c178fac859b4cd7 |
| settings-dark.png | 1330×901 | 93680797c992e5f4 |
| settings-light.png | 1330×901 | fc239e4acdf430a2 |
| settings-states.png | 1330×901 | 25bd3baa289348a6 |

`web/config.html` sha256 (first 16): 79af562fc7abe3da
