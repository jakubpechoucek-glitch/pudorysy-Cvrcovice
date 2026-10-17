# Půdorysy Cvrčovice – plán a progress

Interaktivní webové půdorysy našeho nového RD (2 podlaží). Uživatel vidí obě patra, při najetí myší na prvek (dveře, okno…) se zobrazí okno s detailem. Informace jsou rozdělené do **vrstev**, které jde zapínat a vypínat zaškrtávacími tlačítky.

---

## Stav projektu

| Fáze | Stav |
|---|---|
| 0. Plánování | 🟡 probíhá |
| 1. Základ webu + půdorysy | ⚪ nezačato |
| 2. Vrstva: Dveře | ⚪ nezačato |
| 3. Vrstva: Okna | ⚪ nezačato |
| 4. Další vrstvy a vylepšení | ⚪ nezačato |

Legenda: ⚪ nezačato · 🟡 probíhá · 🟢 hotovo

---

## Základní myšlenka

- **Dvě patra:** 1. NP a 2. NP. Zobrazit vedle sebe (desktop) nebo pod sebou / přepínat záložkami (mobil).
- **Hotspoty:** klikací nebo „najížděcí“ oblasti nad půdorysem (např. stavební otvor mezi pokoji).
- **Tooltip / detail:** při najetí myší se objeví okno s detailem, na mobilu po klepnutí.
- **Vrstvy:** zaškrtávací tlačítka nahoře, každá vrstva má vlastní barvu hotspotů.
  - Vrstva 1: **Dveře** ← začínáme zde
  - Vrstva 2: **Okna**
  - další viz návrhy níže

---

## Navržené technické řešení

- **Statický web** (HTML + CSS + čistý JavaScript), bez serveru a databáze.
- **Půdorys** jako obrázek (PNG/SVG) a nad ním **SVG vrstva s hotspoty**. Souřadnice hotspotů jsou v pixelech obrázku, takže sedí při jakémkoli zvětšení.
- **Data v JSON souborech** (`data/dvere.json`, `data/okna.json`…). Přidání nebo úprava dveří = úprava jednoho souboru, kód se nemění.
- **Hosting:** GitHub Pages (zdarma). ⚠️ Pozor: u veřejného webu jsou půdorysy domu vidět komukoli, viz otevřené otázky.
- **Pomocný „editor“ režim:** kliknutím do půdorysu se vypíšou souřadnice, takže hotspoty půjde snadno zakreslit.

### Navržená struktura repozitáře

```
pudorysy-Cvrcovice/
├── index.html
├── css/style.css
├── js/app.js
├── img/
│   ├── 1NP.png
│   ├── 2NP.png
│   └── foto/          # fotky dveří, oken…
├── data/
│   ├── dvere.json
│   └── okna.json
└── PROGRESS.md
```

### Návrh dat pro dveře (`data/dvere.json`)

```json
{
  "id": "D01",
  "podlazi": "1NP",
  "mezi": ["Chodba", "Obývací pokoj"],
  "typ": "otočné / posuvné do pouzdra / bez dveří",
  "smer": "levé / pravé",
  "rozmer_kridla": "80 × 197 cm",
  "stavebni_otvor": "90 × 202 cm",
  "zarubne": "obložková",
  "povrch": "dub CPL",
  "kovani": "rozeta, klika XY",
  "vyrobce": "…",
  "cena": null,
  "stav": "objednáno / namontováno",
  "foto": "img/foto/D01.jpg",
  "poznamka": "",
  "hotspot": { "x": 412, "y": 230, "w": 30, "h": 12 }
}
```

---

## Úkoly

### Fáze 0 – Plánování
- [x] Založit GitHub repozitář
- [x] Sepsat plán (tento soubor)
- [ ] Dodat půdorysy obou podlaží (formát? PDF / DWG / obrázek)
- [ ] Rozhodnout veřejný vs. neveřejný přístup
- [ ] Odsouhlasit seznam údajů o dveřích

### Fáze 1 – Základ webu
- [ ] Převést půdorysy do PNG/SVG ve vhodném rozlišení
- [ ] Kostra stránky: zobrazení obou pater
- [ ] Přepínač vrstev (zaškrtávací tlačítka)
- [ ] Tooltip/detail okno (hover na desktopu, klepnutí na mobilu)
- [ ] Editor režim pro zjištění souřadnic

### Fáze 2 – Vrstva Dveře
- [ ] Soupis všech dveří (ID, místnosti, rozměry…)
- [ ] Zakreslit hotspoty všech dveří
- [ ] Doplnit fotky
- [ ] Otestovat na mobilu

### Fáze 3 – Vrstva Okna
- [ ] Soupis oken (rozměr, typ otevírání, zasklení, parapety, žaluzie/rolety…)
- [ ] Hotspoty + data

---

## Návrhy na vylepšení (k rozhodnutí)

Další vrstvy, které se u novostavby hodí:
1. **Elektro:** zásuvky, vypínače, světla, datové zásuvky, jističe v rozvaděči (který jistič patří ke které místnosti).
2. **Voda / odpady / topení:** kudy vedou trubky ve zdech a v podlaze, okruhy podlahového topení. *Velmi užitečné, aby se nevrtalo do trubky.*
3. **Fotky z výstavby:** fotky stěn před omítnutím, připnuté ke konkrétnímu místu v půdorysu. Je to „rentgen“ zdí na roky dopředu.
4. **Místnosti:** název, plocha, výška, podlahová krytina, barva výmalby (kód barvy pro pozdější opravy).
5. **Dokumenty a záruky:** u prvku odkaz na návod, fakturu a datum konce záruky (kotel, okna, dveře…).
6. **Kóty / měření:** kliknutím na dva body změřit vzdálenost v metrech (pro plánování nábytku).
7. **Vyhledávání a souhrnná tabulka:** např. „všechny dveře 80 cm“, export do tabulky / tisk.
8. **Stav prací:** barevné odlišení (objednáno / dodáno / namontováno), slouží zároveň jako checklist stavby.

---

## Otevřené otázky

- V jakém formátu půdorysy máš (PDF od architekta, DWG, fotka/sken)?
- Má být web veřejný (GitHub Pages), nebo jen lokálně či chráněný heslem?
- Které údaje o dveřích chceš evidovat? (viz návrh dat výše)
- Mají se zobrazovat ceny?

---

## Deník změn

- **2026-10-17:** Založen repozitář, sepsán plán projektu.
