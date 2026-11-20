---
name: Calculator
description: A keypad calculator dressed as a banknote; the browser drafts, the server issues.
colors:
  ink: "#173a33"
  ink-2: "#1f4a41"
  ink-2-hover: "#255247"
  ink-3: "#2a5a4f"
  ink-3-hover: "#316556"
  ink-press: "#3a7262"
  paper: "#eceee2"
  paper-hover: "#f5f6ee"
  paper-press: "#dce1d2"
  sage: "#c9d4c0"
  line: "#8fa792"
  ink-muted: "#4b6a61"
  serial: "#b0362b"
  ground: "#d3dbc9"
  ground-text: "#173a33"
  ground-muted: "#3f5f56"
typography:
  result:
    fontFamily: "'Bodoni Moda', Didot, 'Bodoni 72', serif"
    fontSize: "min(6rem, 27cqi)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  expression:
    fontFamily: "'Public Sans', system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
  headline:
    fontFamily: "'Public Sans', system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
  key:
    fontFamily: "'Public Sans', system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "'Public Sans', system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: "1.75rem"
    fontFeature: "tnum"
  body:
    fontFamily: "'Public Sans', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "'Public Sans', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.18em"
rounded:
  kbd: "6px"
  key-compact: "12px"
  key: "16px"
  note: "22px"
  object: "32px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "16px"
  note-inset: "22px"
  xl: "32px"
components:
  key-digit:
    backgroundColor: "{colors.ink-2}"
    textColor: "{colors.paper}"
    typography: "{typography.key}"
    rounded: "{rounded.key}"
    height: "44px"
  key-digit-hover:
    backgroundColor: "{colors.ink-2-hover}"
  key-digit-active:
    backgroundColor: "{colors.ink-press}"
  key-operator:
    backgroundColor: "{colors.ink-3}"
    textColor: "{colors.sage}"
    rounded: "{rounded.key}"
  key-operator-hover:
    backgroundColor: "{colors.ink-3-hover}"
  key-function:
    backgroundColor: "transparent"
    textColor: "{colors.sage}"
    rounded: "{rounded.key}"
  key-equals:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
  key-equals-hover:
    backgroundColor: "{colors.paper-hover}"
  key-equals-active:
    backgroundColor: "{colors.paper-press}"
  note-display:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.note}"
    padding: "56px 22px 26px"
  kbd:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.kbd}"
    padding: "4px 7px"
---

# Design System: Calculator

## Overview

**Creative North Star: "The Banknote Intaglio"**

The calculator is a printed note held in a green intaglio body. The display is the face of the note: warm, slightly green paper with a fine-line guilloche rosette in its underprint and a row of microprint digits along its bottom edge. What the visitor types is set in plain ink; what the server answers is struck in serial red, the one colour on the note that is never used for anything else. The browser drafts, the server issues, and the visual system says so.

The palette is a single family of deep greens with paper and sage, so every surface reads as one engraved object rather than a dashboard of parts. Depth is printed, not lifted: the keys are flat ink fills distinguished by tone and outline, and the only real shadow belongs to the whole object resting on the desk at wide sizes. Motion is slow and engraved: the rosette turns while the server is thinking and counter-rotates its layers when the answer lands. Density is that of the calculator people already know: four columns, six rows, thumb-sized keys, nothing else on the phone screen.

The world explicitly rejects the category default: a black OS clone with orange round keys.

**Key Characteristics:**
- One green intaglio family for the body and keys, paper for the display.
- Serial red reserved for the issued result.
- Bodoni Moda for the result only; Public Sans for everything else; tabular figures throughout.
- A three-layer lathe rosette and a microprint edge as the note's security printing.
- Phone first and full bleed; on the desk, one centred object.

## Colors

A monochrome intaglio green with note paper and one reserved red; every colour is a printing ink or the paper it sits on.

### Primary
- **Intaglio Green** (ink): the calculator body, the phone page background and the text on the note. It is the colour of the object.
- **Plate Green** (ink-2): digit keys and the decimal key. Lightens to ink-2-hover under a pointer.
- **Relief Green** (ink-3): operator keys (√, xʸ, %, ÷, ×, −, +), one step lighter than the digits. Lightens to ink-3-hover.
- **Pressed Green** (ink-press): the fill of any ink key while pressed or flashed by a physical key press.

### Secondary
- **Serial Red** (serial): the issued result figure, and nothing else.

### Tertiary
- **Underprint Sage** (sage): operator and function glyphs, the function-key hairline (at 24% alpha), the function hover wash (at 8%), and text selection.
- **Rosette Line** (line): the guilloche strokes, the microprint digits and the readout scrollbar. Decorative only; never carries text a person must read.

### Neutral
- **Note Paper** (paper): the display face, the equals key, the keyboard-legend keycaps, digit glyphs on ink, and the focus ring. paper-hover and paper-press are its hover and pressed states on the equals key.
- **Faded Ink** (ink-muted): secondary text on the paper: the empty-state "0" and the sent expression shown above a result.
- **Desk Sage** (ground): the page background around the object at 640px wide and up. ground-text and ground-muted carry the keyboard legend's title and descriptions on it.

### Named Rules
**The Serial Red Rule.** Serial red marks the server's issued answer and nothing else: not errors, not focus, not hover, not decoration. Errors are set in ink.

**The One Family Rule.** Every surface colour is a step of the intaglio green, the paper, or the sage. A new surface takes the next step in that family, never a new hue.

## Typography

**Display Font:** Bodoni Moda 500 (with Didot, Bodoni 72, serif)
**Body Font:** Public Sans, variable 100 to 900 (with system-ui, sans-serif)

**Character:** A high-contrast Didone for the issued figure, like the denomination engraved on a note, against a plain, sturdy grotesque for everything the visitor drafts. The contrast between the two faces is the contrast between draft and issue.

### Hierarchy
- **Result** (Bodoni Moda 500, min(6rem, 27cqi) stepping down to min(2rem, 7cqi) by length, 1.1, -0.01em): the issued answer, in serial red. Five size steps (xl, l, m, s, xs) chosen by character count so a long figure still fits; a leading minus is drawn wider and closer than Bodoni's own hyphen.
- **Expression** (Public Sans 400, 4rem stepping down to 1.625rem by the same five steps, 1.1, -0.01em): the line being typed, in ink. Carets are raised so ^ reads as a power, not a logic sign.
- **Headline** (Public Sans 600, 2rem, 1.15, balanced wrap): the short error text, in ink, in place of the result.
- **Key** (Public Sans 400, 1.75rem, 1): digit glyphs. Operators are set slightly larger (1.875rem), function labels smaller and heavier (1.375rem, 500), equals at 2rem 500.
- **Title** (Public Sans 400, 1.375rem / 1.75rem): the sent expression above the result, in faded ink.
- **Body** (Public Sans 400, 0.875rem): keyboard-legend descriptions on the desk.
- **Label** (Public Sans 600, 0.6875rem, 0.18em, uppercase): the plate name "Calculator" on the note and the "Keyboard" legend heading. Each is the heading itself, never a tag above another heading.

### Named Rules
**The Tabular Rule.** Every figure, on the keys and on the note, is set with tabular numerals so digits never shift as they change.

**The One Serif Rule.** Bodoni Moda sets the issued result only. Everything typed, labelled or explained is Public Sans.

## Layout

Phone first: the calculator is the whole screen. The note display takes the top band (clamp(13.5rem, 38dvh, 22rem) plus the safe-area inset) with its figures bottom-right; the keypad fills the rest as a 4 x 6 grid with 10px gaps and 16px padding (24px or the safe-area inset at the bottom). Rows never fall below 44px. The 0 key spans two columns and its glyph is aligned with the digit column above it. Equals sits bottom right.

Landscape phone (height 520px or less): display left (42%), keypad right (58%), tighter 6px gaps, smaller key type and 12px key corners.

Desktop and tablet (640px wide and 521px tall or more): the same object, 24rem by min(46rem, viewport minus 4rem), centred on the desk-sage ground; the display takes 42% of its height. At 1024px and up with a fine hovering pointer, the keyboard legend sits beside the object (16rem wide, 3.5rem clear of its edge, vertically centred), so the calculator itself stays centred. No other layout exists: one screen, one object.

The note's inner content is inset 22px from its edges; the plate sits 20px from the top.

## Elevation & Depth

The object is flat inside and lifted as a whole. Keys are flat ink fills separated by tone, with a 1px paper highlight on their top edge at 6% alpha, like the bevel of an engraved plate. The note display gets its depth from printing (the rosette and microprint underprint), not from shadow. Only at desktop sizes does the whole calculator cast a soft, layered green shadow onto the desk, plus a 1px paper hairline at 6% around its edge.

### Shadow Vocabulary
- **Desk rest** (`box-shadow: 0 2rem 4rem -1.5rem rgb(9 26 22 / 0.5), 0 0.5rem 1.25rem -0.5rem rgb(9 26 22 / 0.35), 0 0 0 1px rgb(236 238 226 / 0.06)`): the whole calculator object on the desk, 640px and up. Nothing else.
- **Plate bevel** (`box-shadow: inset 0 1px 0 rgb(236 238 226 / 0.06)`): ink keys at rest.
- **Hairline outline** (`box-shadow: inset 0 0 0 1px rgb(201 212 192 / 0.24)`): function keys, which have no fill.
- **Keycap** (`box-shadow: 0 1px 2px rgb(9 26 22 / 0.25), inset 0 0 0 1px rgb(23 58 51 / 0.12)`): keyboard-legend keycaps on the desk.

### Named Rules
**The One Object Rule.** Only the calculator as a whole is lifted off the desk. Nothing inside it floats.

## Shapes

Soft, consistent rounded rectangles nested by scale: the object at 32px, the note's free corners at 22px (bottom corners on the phone, right corners in landscape; the corners against the device edge stay square), keys at 16px (12px in landscape), legend keycaps at 6px. No circles and no pills: keys are rounded slabs, not round buttons. The rosette is the one curved, organic form, and it is always a fine 0.45-unit stroke with no fill, cropped by the note's left edge.

## Components

### Keys
Flat ink slabs in three inks plus a slip of paper; a press is a fill change and a 3% shrink, never a lift.
- **Shape:** gently rounded rectangle (16px; 12px in landscape), full grid cell, at least 44px tall.
- **Digit:** plate green fill, paper glyph, plate bevel. Hover lightens to ink-2-hover (pointer devices only).
- **Operator:** relief green fill, sage glyph, slightly larger type. Hover to ink-3-hover.
- **Function** (AC, parentheses, backspace): no fill, sage 24% hairline outline, sage glyph at 1.375rem 500. Hover adds an 8% sage wash. Backspace is a drawn 1.6-stroke outline SVG at 26px; xʸ is typeset with a superscript.
- **Equals:** note-paper fill, ink glyph. Hover to paper-hover, press to paper-press.
- **Pressed / flashed:** scale 0.97 and pressed-green fill (paper-press for equals), also shown when the matching physical key is pressed.
- **Focus:** 3px paper outline, 2px offset. The ring belongs to focus alone, so a pressed key and a focused key never look alike.
- **Pending:** the cursor becomes progress on every key; keys are ignored until the answer lands.
- **Motion:** background, shadow and scale transition at 280ms on the expo-out ease.

### Note display (signature)
The face of the banknote: paper, plate label top left, rosette at left, figures right-aligned at the bottom, microprint along the bottom edge.
- **States:** typing (expression in ink, or a faded "0" when empty); pending (rosette layers spin, 2.4s per turn, alternating directions); issued (layers settle at 24, -18 and 12 degrees, the expression moves up in faded ink, the result is struck in serial red with a 420ms blur-to-sharp, opacity 0.2 to 1); error (short error text in ink, rosette dims to 25%).
- **Rosette:** three epitrochoid layers in rosette-line strokes at 60% opacity, sized by the band between plate and microprint so it never clips.
- **Overflow:** long lines scroll horizontally, keep their end in view, and fade their start over 1.5rem instead of cutting through a digit.
- **Microprint:** groups of 0123456789 at 6px in rosette-line, whole groups only, decorative and hidden from assistive technology.

### Keyboard legend
A quiet reference card printed on the desk, beside the object, only where a fine pointer and room exist.
- **Style:** label-style heading, then a two-column list: paper keycaps with the keycap shadow (0.75rem 500) and body descriptions in ground-muted.

## Do's and Don'ts

### Do:
- **Do** keep serial red for the issued result alone; set errors in ink.
- **Do** distinguish key roles by ink tone and outline (digit ink-2, operator ink-3 with sage glyphs, function hairline, equals paper), not by new hues.
- **Do** set every figure in tabular numerals, and the result alone in Bodoni Moda.
- **Do** keep the focus ring as the 3px paper outline at 2px offset, distinct from the pressed fill.
- **Do** let the rosette and microprint carry the note's texture; they stay in rosette-line and never carry readable content.
- **Do** honour reduced motion: rosette spin, rosette rotation, key transitions and the result strike all switch off.

### Don't:
- **Don't** build the category default: a black OS clone with orange round keys.
- **Don't** use circular or pill keys; keys are 16px rounded slabs.
- **Don't** lift anything inside the calculator with a drop shadow; only the whole object rests on the desk.
- **Don't** introduce a hue outside the green, paper, sage and serial-red inks.
