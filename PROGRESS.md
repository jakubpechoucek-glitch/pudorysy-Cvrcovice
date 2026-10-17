# Půdorysy Cvrčovice – plán a progress

Interaktivní webové půdorysy našeho nového RD (RD Podolanka, 2 podlaží: **1.PP** a **1.NP**). Na webu jsou obě patra. Po najetí myší na prvek (dveře, okno…) se zobrazí okno s detailem. Informace jsou rozdělené do **vrstev**, které jde zapínat a vypínat zaškrtávacími tlačítky.

**Web je veřejný:** https://jakubpechoucek-glitch.github.io/pudorysy-Cvrcovice/

---

## Stav projektu

| Fáze | Stav |
|---|---|
| 0. Plánování | 🟢 hotovo |
| 1. Základ webu + půdorysy | 🟢 hotovo |
| 2. Vrstva: Dveře | 🟡 data a hotspoty hotové, chybí fotky a nasazení |
| 3. Vrstva: Okna | ⚪ nezačato |
| 4. Další vrstvy a vylepšení | ⚪ nezačato |

Legenda: ⚪ nezačato · 🟡 probíhá · 🟢 hotovo

---

## Jak web spustit lokálně

```bash
python3 -m http.server 8123
```
Pak otevřít http://localhost:8123. Data se načítají přes `fetch`, takže otevřít `index.html` přímo ze souboru nestačí.

**Editor souřadnic:** http://localhost:8123/?edit. Kliknutím do půdorysu se pod tabulkou (a v konzoli) vypíšou souřadnice v pixelech obrázku. Slouží k zakreslení nových hotspotů.

---

## Co web umí (v0.1)

- Obě podlaží vedle sebe (na mobilu pod sebou), přepínač **Obě / 1.PP / 1.NP**.
- Vrstva **Dveře**: 18 pozic, barevně podle stavu (OK / k ověření / k dořešení / akutní).
- Najetí myší ukáže detail, kliknutí ho připne. Na mobilu se detail otevře klepnutím jako panel ze spodu obrazovky.
- Filtr podle stavu, seznam dveří pod půdorysy (kliknutím na řádek se dveře najdou v plánu).
- Tmavý režim podle nastavení systému.

## Struktura repozitáře

```
index.html          – stránka
css/style.css       – vzhled
js/app.js           – logika (vrstvy, tooltip, filtry, editor souřadnic)
data/dvere.json     – data dveří vč. souřadnic hotspotů
img/1PP.png, 1NP.png – půdorysy (výřez z PDF C.2.1 / C.2.2)
PROGRESS.md         – tento soubor
```

### Formát dat dveří (`data/dvere.json`)

```json
{
  "id": "DV005",
  "cislo": "DV005",
  "podlazi": "1PP",
  "mezi": ["0.10 chodba", "0.11 pokoj"],
  "typ": "Otočné jednokřídlé, dvoubarevné",
  "rozmer": "800 × 2650 mm",
  "otvor": "š. 1045 mm (ověřit)",
  "zarubne": "Skrytá 25/15, pravá",
  "povrch": { "0.10 chodba": "lak Champagne mat (M11)", "0.11 pokoj": "M8 dýha" },
  "dodavatel": "JAP – zárubeň · Hanák – křídlo dýha + lak",
  "stav": "ok | overit | resit | akutni",
  "poznamka": "…",
  "hotspot": { "x": 873, "y": 633, "w": 96, "h": 36 }
}
```
Souřadnice hotspotu jsou v pixelech obrázku `img/<podlazi>.png` (2055 × 2310).

---

## Podklady a rozhodnutí

| Podklad | Použití |
|---|---|
| `C.2_OSAZOVACI PUDORYSY.pdf` – JA Architekti, projekt interiéru 08/25 (C.2.1 1.PP, C.2.2 1.NP) | ✅ **podklad půdorysů**: aktuální dispozice vč. 0.09A/B a 1.04A/B |
| `Dvere_Podolanka_kontrola_4.xlsx` (stav po schůzce 5. 10. 2026) | ✅ hlavní zdroj dat o dveřích |
| Nabídky Hanák „kd int. dveře + obklady“ a „kd pláště“ (15. 10. 2026) | ✅ doplnění (křídla, pláště) – **ceny se nezveřejňují** |
| DWG D.1.2 (stavebně konstrukční řešení) | ❌ jen statika, bez dveří a místností |
| DWG D.1.1 DPS (`POD_DPS_303_1pp`, `POD_DPS_304_1np`, Dropbox) | ⏸ starší dispozice (2024); možná se hodí pro okna |
| `POD_DPS_D_TABULKY.xlsx` (Dropbox) | ⏸ pravděpodobně tabulka oken – pro fázi 3 |

**Ochrana údajů na veřejném webu:** nezveřejňují se ceny ani jména a kontakty konkrétních osob, jen firmy (JAP, Hanák). Duplicitní čísla z výkresu (DV001, DV007, DV105) jsou rozlišená jako `-A` / `-B`.

---

## Úkoly

### Fáze 0 – Plánování
- [x] Založit GitHub repozitář
- [x] Sepsat plán (tento soubor)
- [x] Dodat půdorysy obou podlaží
- [x] Rozhodnout veřejný vs. neveřejný přístup → **veřejný**
- [x] Odsouhlasit seznam údajů o dveřích → podle kontrolní tabulky dveří

### Fáze 1 – Základ webu
- [x] Převést půdorysy do PNG (výřez z PDF, 16 odstínů šedi, ~145 kB/patro)
- [x] Kostra stránky: zobrazení obou pater
- [x] Přepínač vrstev (zaškrtávací tlačítka)
- [x] Tooltip/detail okno (hover na desktopu, klepnutí na mobilu)
- [x] Editor režim pro zjištění souřadnic (`?edit`)
- [x] Zapnout GitHub Pages → https://jakubpechoucek-glitch.github.io/pudorysy-Cvrcovice/
- [ ] Ověřit souhlas JA Architekti se zveřejněním půdorysů (na výkresu je doložka o autorských právech)

### Fáze 2 – Vrstva Dveře
- [x] Soupis všech dveří (18 pozic, 1.PP: 11, 1.NP: 7)
- [x] Zakreslit hotspoty všech dveří
- [ ] Zkontrolovat polohy hotspotů (hlavně DV001-B, DV009, DV010, DV105-B)
- [ ] Doplnit fotky (po montáži)
- [ ] Průběžně aktualizovat stavy po dalších schůzkách
- [ ] Otestovat na skutečném mobilu

### Fáze 3 – Vrstva Okna
- [ ] Projít `POD_DPS_D_TABULKY.xlsx` a nabídku oken
- [ ] Soupis oken (rozměr, typ otevírání, zasklení, parapety, žaluzie/rolety…)
- [ ] Hotspoty + data (`data/okna.json`)

---

## Návrhy na vylepšení (k rozhodnutí)

1. **Elektro:** zásuvky, vypínače, světla, datové zásuvky, jističe (v Downloads je `E.4 ELEKTROINSTALACE 1NP.pdf` a poptávka zásuvek a vypínačů).
2. **Voda / odpady / topení:** trubky ve zdech a v podlaze, okruhy podlahového topení, aby se nevrtalo do trubky. Podklady jsou v DWG ZTI a ÚT na Dropboxu.
3. **Fotky z výstavby** připnuté ke konkrétnímu místu: stěny před omítnutím.
4. **Místnosti:** plocha, podlahová krytina, barva výmalby (`RD_Podolanka_Prehled_Povrchu.xlsx`).
5. **Sanita:** vrstva Z1–Z14 (`RD PODOLANKA - sanita tabulka`).
6. **Nábytek (N01–N73):** vestavěný nábytek z projektu interiéru.
7. **Dokumenty a záruky** u jednotlivých prvků.
8. **Měření vzdáleností** v půdorysu.

---

## Otevřené otázky

- Souhlasí JA Architekti se zveřejněním půdorysů na veřejném webu? Alternativa je vlastní zjednodušený obrys.
- Mají se vůbec zobrazovat interní poznámky typu „k dořešení“, nebo jen finální stav?

---

## Deník změn

- **2026-10-17:** Založen repozitář, sepsán plán projektu.
- **2026-10-17:** Web v0.1: půdorysy 1.PP a 1.NP z projektu interiéru, vrstva Dveře (18 pozic) s detaily a stavem, filtry, seznam dveří, editor souřadnic.
- **2026-10-17:** Zapnuty GitHub Pages, web je online.
