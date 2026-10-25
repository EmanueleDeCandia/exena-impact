# Sibillini Impact — DESIGN.md

## 1. Direzione creativa: Industrial Editorial

Un sistema visivo editorial-sport ispirato al linguaggio Adidas: energia, contrasto, tipografia protagonista, composizioni a griglia e fotografia documentaristica. Non vengono replicati logo, asset proprietari o layout specifici del brand.

La landing deve sembrare una piattaforma enterprise, non un catalogo di calzature e non una pagina ESG generica. Il prodotto è il punto di attivazione; il vero protagonista è il valore che l'impresa cliente può utilizzare.

**Parole chiave:** deciso, tecnico, istituzionale, tattile, contemporaneo, misurabile.

## 2. Principi

1. **Il cliente prima del progetto.** I benefici sono formulati in seconda persona e agganciati a compiti reali: gare, audit, rating, welfare, reputazione, controllo dei cantieri.
2. **Due linee, una scelta consapevole.** Standard e Varianti ad Alto Impatto sono sempre distinte da etichette, colore e struttura. Le varianti non sostituiscono implicitamente lo standard.
3. **Grandi numeri, prove concrete.** KPI e dichiarazioni sono accompagnati da deliverable, soglie e formule.
4. **Niente decorative softness.** Niente glassmorphism, ombre diffuse, gradienti generici o card eccessivamente arrotondate.
5. **Accessibilità nel contrasto.** Testo e controlli mantengono contrasto elevato; focus visibile; interazioni utilizzabili da tastiera.

## 3. Palette

| Token | Colore | Uso |
|---|---|---|
| Ink | `#111111` | Testo, footer, pannelli ad alto contrasto |
| Paper | `#F3F3EE` | Fondo principale, alternative alle superfici bianche |
| White | `#FFFFFF` | Testo su nero, superfici di lettura |
| Cobalt | `#1947E5` | Azione primaria, link, dati tecnici |
| Volt | `#D7FF3F` | Varianti, selezioni, highlight sportivi |
| Concrete | `#D9DAD4` | Bordi e divisori |
| Muted | `#62645F` | Testo secondario |
| Error | `#B42318` | Errori form |

La palette navy/ciano/smeraldo/ambra della skill non viene utilizzata.

## 4. Tipografia

- **Display:** Barlow Condensed, 700–800, uppercase, tracking da `-0.03em` a `-0.01em`.
- **Body/UI:** Inter Variable, 400–700.
- Hero desktop: `clamp(4.5rem, 8.6vw, 9rem)`, line-height `0.84`.
- Titoli sezione: `clamp(3rem, 5vw, 5.8rem)`, line-height `0.9`.
- Eyebrow e label: 11–13px, uppercase, tracking `0.12em`.
- Corpo: 15–18px, line-height 1.55–1.7.

## 5. Griglia e spaziatura

- Container massimo: 1440px; gutter 24–64px.
- Layout a 12 colonne su desktop, 6 su tablet, 4 su mobile.
- Spaziatura sezioni: 96–144px desktop, 64–88px mobile.
- Bordi da 1px e 2px; radius 0–6px, mai pillole per i contenitori principali.
- Motivo ricorrente: tre barre diagonali astratte usate come segno di movimento, non come logo.

## 6. Componenti

### Header
Barra bianca sticky, bordo inferiore netto. Brand testuale, navigazione essenziale e CTA nera. Menu mobile con pannello espanso.

### Bottoni
Forma rettangolare, label uppercase, freccia di direzione. Primario nero o cobalto; secondario trasparente con bordo. Hover con traslazione minima e inversione.

### Segmented control
Due stati espliciti: `Percorso Standard` e `Varianti Alto Impatto`. Lo stato variante usa Volt + nero. Ogni cambio è annunciato alle tecnologie assistive.

### Service area
Numero grande, titolo, outcome per il cliente, lista di deliverable e pannello alternativo separato. Le varianti hanno sempre il badge `OPZIONE ALTERNATIVA`.

### Pipeline
Quattro soglie A/B/C/D collegate da una barra di avanzamento. Lo stato cambia in tempo reale in base al simulatore.

### Simulatore
Pannello nero con controlli ampi e KPI bianchi/volt. Slider e campi numerici sincronizzati. Nessuna dipendenza da reload. Le stime distinguono valore Standard, incremento delle varianti e valore complessivo, con formula e nota metodologica.

### Form
Campi con label persistente, bordo inferiore/netto, errori testuali, consenso esplicito. La conferma non simula un invio server inesistente.

## 7. Fotografia e immagini

Fotografia documentaristica ad alto contrasto: lavoro reale, territorio montano, dettagli materici. Niente immagini stock con strette di mano o foglie generiche. Le immagini sono locali per mantenere la resa anche in anteprima isolata.

Per la Performing Art si usano reportage culturali realistici in due ambientazioni: interni caldi e materici di hotel storici, spazi pubblici dei borghi alla blue hour. Le immagini mostrano performer, pubblico e architettura con anatomia e luce credibili; niente estetica CGI o pose da stock.

## 8. Motion

- Reveal leggeri solo dove utili; nessuna animazione blocca la lettura.
- Transizioni 160–260ms, easing `cubic-bezier(.2,.8,.2,1)`.
- Rispetto di `prefers-reduced-motion`.

## 9. Responsive e accessibilità

- Mobile first per controlli e contenuti; nessuna tabella obbliga a zoomare: scroll locale con affordance.
- Target touch minimo 44px.
- Landmark semantici, heading gerarchici, label e descrizioni programmati.
- Focus ring Volt su fondo nero, Cobalt su fondo chiaro.
- Il colore non è mai l'unico indicatore: badge e testi esplicitano sempre lo stato.
