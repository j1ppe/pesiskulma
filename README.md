# PesisKulma

## Yhteenveto

PesisKulma on selainpohjainen työkalu lyöntiharjoitteluun silloin, kun lyödään verkkoon tai pressuun. Se auttaa pesäpallovalmentajia visualisoimaan lyöntikulmia, arvioimaan lyöntiverkon etäisyyksiä ja hahmottamaan lyöntisuunnat. Kentän voi vaihtaa miesten ja naisten profiilien välillä, ja pallon sijaintia voi määritellä klikkaamalla kenttää.

## Ominaisuudet

- Responsiivinen, dynaaminen canvas-pohjainen kenttä, joka skaalautuu automaattisesti laitekoon mukaan ja on optimoitu mobiilikäyttöön.
- Miesten ja naisten kenttäprofiilit, myöhemmin laajennettavissa muille sarjoille.
- Lyöntiverkon etäisyyden syöttö ja reaaliaikainen mittanäyttö (cm/metri).
- Pallon sijainnin mittaukset: suora etäisyys kotipesästä ja sivuttaisetäisyys keskiviivasta.

## Käyttö

1. Valitse kenttä (Naiset/Miehet).
2. Syötä lyöntiverkon etäisyys syöttölautasen etureunasta (cm).
3. Klikkaa kenttää asettaaksesi pallon sijainnin ja tarkastele etäisyysmittauksia.

---

## Overview (English)

PesisKulma is a browser-based training aid for Finnish baseball coaches who run net or tarp hitting sessions. It lets you compare women’s and men’s field profiles, map intended hitting directions on the canvas, and instantly read distances to the pitching plate and practice net.

### Features

- Responsive HTML5 canvas field that adapts to any screen size and is tuned for mobile use.
- Separate presets for women’s and men’s fields, designed to support additional tiers later.
- Net distance input with real-time distance labels in cm/m.
- Ball placement with automatic center-line and plate distance calculations.

### Getting Started

1. No backend required—open `index.html` in a modern browser or run a lightweight static server.
2. Launch the field tool via the landing page.
3. Use browser devtools if you need to debug or extend the drawing logic (`assets/js/pesiskulma.js`).

### Usage

1. Choose the field profile (Women/Men).
2. Enter the net distance in centimeters.
3. Tap/click the field to place the ball and read the displayed metrics.

---

Lisenssi: [MIT](LICENSE)
