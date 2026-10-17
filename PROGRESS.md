# Půdorysy Cvrčovice – plán a progress

Interaktivní webové půdorysy našeho nového RD (RD Podolanka, 2 podlaží: **1.PP** a **1.NP**). Na webu jsou obě patra. Po najetí myší na prvek (dveře, okno…) se zobrazí okno s detailem. Informace jsou rozdělené do **vrstev**, které jde zapínat a vypínat zaškrtávacími tlačítky.

**Web je veřejný:** https://jakubpechoucek-glitch.github.io/pudorysy-Cvrcovice/

---

## Stav projektu

| Fáze | Stav |
|---|---|
| 0. Plánování | 🟢 hotovo |
| 1. Základ webu + půdorysy | 🟢 hotovo |
| 2. Vrstva: Dveře | 🟡 online, chybí fotky a kontrola poloh |
| 3. Vrstva: Okna | 🟡 online (16 pozic), čeká na ověření FV10 |
| 4. Vrstva: Povrchy (podlahy, stěny, stropy) | 🟡 online (23 místností), materiály částečně ve vzorkování |
| 5. Vrstva: Nábytek a kuchyně (Hanák) | 🟡 online (11 sestav), většina ve stavu nabídky |
| 6. Další vrstvy a vylepšení | ⚪ nezačato |

Legenda: ⚪ nezačato · 🟡 probíhá · 🟢 hotovo

---

## Jak web spustit lokálně

```bash
python3 -m http.server 8123
```
Pak otevřít http://localhost:8123. Data se načítají přes `fetch`, takže otevřít `index.html` přímo ze souboru nestačí.

**Editor souřadnic:** http://localhost:8123/?edit. Kliknutím do půdorysu se pod tabulkou (a v konzoli) vypíšou souřadnice v pixelech obrázku. Slouží k zakreslení nových hotspotů.

---

## Co web umí (v0.4)

- Obě podlaží vedle sebe (na mobilu pod sebou), přepínač **Obě / 1.PP / 1.NP**.
- Vrstva **Dveře**: 18 pozic, barevně podle stavu (OK / k ověření / k dořešení / akutní).
- Najetí myší ukáže detail, kliknutí ho připne. Na mobilu se detail otevře klepnutím jako panel ze spodu obrazovky.
- Vrstva **Okna**: 16 pozic (FV01–FV13) modře, v detailu náhled pozice z exteriéru, rozměr, parapet, zasklení, kování, profil Schüco.
- Vrstva **Povrchy** (ve výchozím stavu vypnutá): 23 místností obarvených podle podlahy (P1 dřevo, P2 dlažba, P3 betonová stěrka, P4 průmyslová stěrka). V detailu je schéma stěn S/V/J/Z s kódy materiálů, výpis podlahy, stěn (vč. obkladů, formátů a počtu kusů) a stropu. Pod půdorysy je tabulka místností a materiálů s celkovým množstvím dlažeb a obkladů.
- Vrstva **Nábytek** (ve výchozím stavu vypnutá): 11 sestav Hanák (kuchyň K1 a spíž K2 podle smlouvy, obývák, šatny 0.05 a 0.07, ložnice, knihovna, posilovna, koupelny 0.04, 0.08 a 1.05). V detailu jsou vizualizace, provedení (čela, korpus, zásuvky), položky s cenami s DPH a celková cena. Pod půdorysy je tabulka se součtem.
- Filtr podle stavu dveří, seznamy dveří a oken pod půdorysy (kliknutím na řádek se prvek najde v plánu).
- Tmavý režim podle nastavení systému.

## Struktura repozitáře

```
index.html          – stránka
css/style.css       – vzhled
js/app.js           – logika (vrstvy, tooltip, filtry, editor souřadnic)
data/dvere.json     – data dveří vč. souřadnic hotspotů
data/okna.json      – data oken vč. souřadnic hotspotů
img/okna/*.png      – náhledy oken z přehledu elementů HA Technik
data/nabytek.json   – sestavy nábytku Hanák: provedení, položky, ceny, náhledy, plochy v půdorysu
img/nabytek/*.jpg   – vizualizace z nabídek Hanák
data/povrchy.json   – materiály (kód, název, barva, množství) a povrchy místností vč. obdélníků místností
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
Souřadnice hotspotu jsou v pixelech obrázku `img/<podlazi>.png` (2055 × 2310). `hotspot` může být i pole obdélníků (např. rohové okno FV08).

Okna (`data/okna.json`) mají pole `mistnost, typ, rozmer, parapet, zaskleni, kovani, profil, magnet, zabradli, poznamka, nahled, hotspot`. Nová vrstva = nový JSON + záznam v `LAYERS` v `js/app.js` + checkbox v `index.html`. Filtr „Stav dveří“ působí jen na vrstvy s `statusFilter: true`.

**Cache:** po změně dat nebo kódu zvýšit `VERSION` v `js/app.js` a stejné číslo v `index.html` (`?v=…`), jinak mohou prohlížeče načíst starou verzi.

---

## Podklady a rozhodnutí

| Podklad | Použití |
|---|---|
| `C.2_OSAZOVACI PUDORYSY.pdf` – JA Architekti, projekt interiéru 08/25 (C.2.1 1.PP, C.2.2 1.NP) | ✅ **podklad půdorysů**: aktuální dispozice vč. 0.09A/B a 1.04A/B |
| `Dvere_Podolanka_kontrola_4.xlsx` (stav po schůzce 5. 10. 2026) | ✅ hlavní zdroj dat o dveřích |
| Nabídky Hanák „kd int. dveře + obklady“ a „kd pláště“ (15. 10. 2026) | ✅ doplnění (křídla, pláště) – **ceny se nezveřejňují** |
| DWG D.1.2 (stavebně konstrukční řešení) | ❌ jen statika, bez dveří a místností |
| DWG D.1.1 DPS (`POD_DPS_303_1pp`, `POD_DPS_304_1np`, Dropbox) | ⏸ starší dispozice (2024); možná se hodí pro okna |
| `2026-009 RD Podolanka_přehled elementů-1.pdf` – HA Technik (Schüco), 1. 4. 2026 | ✅ **zdroj dat oken** a náhledů |
| `POD_DPS_D_TABULKY.xlsx` (Dropbox) | ⏸ nevyužito (okna jsou z přehledu elementů) |
| Dropbox `Interier/Kuchyň a nábytek v pokojích`: SoD 2026000081 (kuchyně K1 + K2), CN obyv, š 005, š 007, 009 loz, knihovn, posilov, K 004, K 008, K 105 | ✅ **zdroj nábytku**; `NAB 075_2026` (HELP stavby, opravy bytu) nesouvisí |
| `RD_Podolanka_Help dlažby obklady - PROCERAM.xlsx`, list „Celkový přehled_final“ | ✅ **zdroj povrchů**; orientace stěn S/J/V/Z odpovídá půdorysu se severem nahoře |

**Ochrana údajů na veřejném webu:** nezveřejňují se jména a kontakty konkrétních osob ani adresy, jen firmy (JAP, Hanák, HA Technik). **Ceny se od 17. 10. 2026 zveřejňovat smí** (rozhodnutí investora), zatím jsou jen u nábytku. Duplicitní čísla z výkresu (DV001, DV007, DV105) jsou rozlišená jako `-A` / `-B`.

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
- [x] Soupis oken z přehledu elementů HA Technik (16 pozic, 1.PP: 9, 1.NP: 7)
- [x] Hotspoty + data (`data/okna.json`), náhledy z exteriéru
- [ ] Ověřit FV10: přehled elementů uvádí „0.09 ložnice“, podle rozměru a zrcadlení s FV11 jde nejspíš o pokoj 0.11
- [ ] FV02: přehled uvádí „1.03-chodba“, na plánu je to severní okno technické místnosti 1.03
- [ ] FV08: doplnit výrobní rozměry, až budou určeny
- [ ] Doplnit žaluzie/rolety (zatím nejsou v podkladech)

---

### Fáze 4 – Vrstva Povrchy
- [x] Převod tabulky povrchů (23 místností, 24 materiálů) do `data/povrchy.json`
- [x] Plochy místností v půdorysu, barva podle podlahy, legenda podlah
- [x] Detail místnosti se schématem stěn a výpisem materiálů
- [x] Tabulka materiálů s celkovým množstvím (P2 62 ks, M16 38 ks, M17-A 12 ks, M17-B 4 ks, M18 10 ks)
- [ ] Doplnit po vzorkování: P3 betonová stěrka (alternativa Fantazy Design), P4 odstín, M3 odstín garáže, M15 korek v pracovně
- [x] M9 (lamino CLEAF RENIO) nahrazeno lakem Champagne mat M11 (Hanák) – stěny 0.01 západ 2, 0.09B východ, 0.10 jih
- [ ] Případně fotky vzorků materiálů do detailu

### Fáze 5 – Vrstva Nábytek
- [x] 11 sestav z nabídek a smlouvy Hanák vč. položek a cen (součty ověřeny proti celkovým cenám)
- [x] Vizualizace z nabídek, plochy v půdorysu, tabulka se součtem (celkem 4 841 443 Kč s DPH)
- [ ] Aktualizovat stav nabídka → smlouva po podpisu jednotlivých sestav
- [ ] K 008: v nabídce chybí sleva 8 % (u ostatních je) – ověřit s Hanákem
- [ ] Ložnice: upřesnit tvar čalounění za postelí, zásuvky a látku
- [ ] Obývák: nabídka z 9. 4. 2026 je s DPH 21 % (ostatní 12 %) – ověřit
- [ ] Doplnit případně pracovnu 1.07 (M15 nábytek + korek) a vstup 1.01 (vestavné skříně M13), až budou nabídky

## Návrhy na vylepšení (k rozhodnutí)

1. **Elektro:** zásuvky, vypínače, světla, datové zásuvky, jističe (v Downloads je `E.4 ELEKTROINSTALACE 1NP.pdf` a poptávka zásuvek a vypínačů).
2. **Voda / odpady / topení:** trubky ve zdech a v podlaze, okruhy podlahového topení, aby se nevrtalo do trubky. Podklady jsou v DWG ZTI a ÚT na Dropboxu.
3. **Fotky z výstavby** připnuté ke konkrétnímu místu: stěny před omítnutím.
5. **Sanita:** vrstva Z1–Z14 (`RD PODOLANKA - sanita tabulka`).
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
- **2026-10-17:** Web v0.2: vrstva Okna (FV01–FV13, 16 pozic) s náhledy z exteriéru; JS přepracován na obecné vrstvy.
- **2026-10-17:** Web v0.3: vrstva Povrchy (23 místností) – podlahy barevně, detail se schématem stěn, obklady koupelen s formáty a počty kusů, tabulka materiálů.
- **2026-10-17:** M9 → M11 lak Champagne mat (Hanák) ve vrstvě Povrchy.
- **2026-10-17:** Web v0.4: vrstva Nábytek (11 sestav Hanák) s vizualizacemi, položkami a cenami; ceny se smí zveřejňovat.
- **2026-10-17:** Oprava: filtr stavu dveří skrýval nábytek (pole `stav`); přehled nábytku seřazen po místnostech; verze souborů proti cache (v0.4.1).
