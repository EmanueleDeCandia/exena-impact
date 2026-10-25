import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Calculator,
  Check,
  ChevronRight,
  CircleCheck,
  Download,
  FileCheck2,
  HardHat,
  Landmark,
  Leaf,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  Minus,
  Mountain,
  Network,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Ticket,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import { comparisonRows, roles, serviceAreas, thresholds } from './data.js';
import { BASE_PRICE, calculateImpact, clampAddetti, clampRatio } from './lib/calculations.js';

const currency = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const preciseCurrency = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});
const number = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

const roleIcons = {
  procurement: ShoppingCart,
  safety: HardHat,
  esg: Leaf,
  people: Users,
  leadership: Landmark,
};

function Brand({ light = false }) {
  return (
    <a className={`brand ${light ? 'brand--light' : ''}`} href="#top" aria-label="Sibillini Impact, torna all'inizio">
      <span className="brand__mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="brand__name">SIBILLINI<span>IMPACT</span></span>
    </a>
  );
}

function ModeSwitch({ mode, onChange, inverse = false, compact = false }) {
  return (
    <div className={`mode-switch ${inverse ? 'mode-switch--inverse' : ''} ${compact ? 'mode-switch--compact' : ''}`} role="group" aria-label="Linea di attuazione">
      <button
        type="button"
        className={mode === 'STANDARD' ? 'is-selected' : ''}
        aria-pressed={mode === 'STANDARD'}
        onClick={() => onChange('STANDARD')}
      >
        <span className="mode-switch__dot" /> Standard
      </button>
      <button
        type="button"
        className={mode === 'VARIANTI_ALTO_IMPATTO' ? 'is-selected is-variant' : ''}
        aria-pressed={mode === 'VARIANTI_ALTO_IMPATTO'}
        onClick={() => onChange('VARIANTI_ALTO_IMPATTO')}
      >
        <Sparkles size={15} aria-hidden="true" /> + Varianti alto impatto
      </button>
    </div>
  );
}

function TextLink({ href, children, className = '', onClick }) {
  return (
    <a className={`text-link ${className}`} href={href} onClick={onClick}>
      <span>{children}</span><ArrowUpRight size={19} aria-hidden="true" />
    </a>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      document.documentElement.style.setProperty('--page-progress', progress);
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <a href="#main" className="skip-link">Vai al contenuto</a>
      <div className="topline">
        <span>EXENA <b>×</b> STARTUP INNOVATIVA GARANTE</span>
        <span className="topline__right">ENTERPRISE SERVICES / AREE INTERNE</span>
      </div>
      <header className="site-header">
        <div className="scroll-progress" aria-hidden="true" />
        <div className="site-header__inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Navigazione principale">
            <a href="#ecosistema">Per la tua impresa</a>
            <a href="#servizi">Servizi & varianti</a>
            <a href="#soglie">Soglie</a>
            <a href="#simulatore">Simulatore</a>
            <Link to="/app">Aree demo</Link>
          </nav>
          <a className="header-cta" href="#contatto">Richiedi audit <ArrowUpRight size={18} /></a>
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        <div id="mobile-navigation" className={`mobile-nav ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
          <nav aria-label="Navigazione mobile">
            {[
              ['/app', 'Accedi alle Aree 1 e 2'],
              ['#ecosistema', 'Per la tua impresa'],
              ['#servizi', 'Servizi & varianti'],
              ['#soglie', 'Soglie cumulative'],
              ['#simulatore', 'Simulatore'],
              ['#come-ordinare', 'Come ordinare'],
            ].map(([href, label], index) => (
              <a key={href} href={href} onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>
                <span>0{index + 1}</span>{label}<ArrowRight />
              </a>
            ))}
            <a className="mobile-nav__cta" href="#contatto" onClick={closeMenu} tabIndex={menuOpen ? 0 : -1}>Richiedi un audit preliminare</a>
          </nav>
        </div>
      </header>
    </>
  );
}

function Hero({ onModeChange }) {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__grid">
        <div className="hero__content">
          <div className="eyebrow"><span /> FORNITURA DPI → VALORE D’IMPRESA</div>
          <h1 id="hero-title">
            <span>LA TUA</span>
            <span>FORNITURA DPI.</span>
            <span className="hero__accent">IL TUO VANTAGGIO.</span>
          </h1>
          <p className="hero__lead">
            Trasformi un acquisto necessario in <strong>dati ESG auditabili, welfare, reputazione e rigenerazione territoriale.</strong> Con un garante terzo e due linee di attuazione tra cui scegliere.
          </p>
          <div className="hero__actions">
            <a className="button button--dark" href="#simulatore">Configura impatto B2B <ArrowRight /></a>
            <TextLink href="#servizi">Esplora i 5 pilastri</TextLink>
            <Link className="text-link text-link--workspace" to="/app"><span>Accedi alle aree demo</span><ArrowUpRight size={19} aria-hidden="true" /></Link>
          </div>
          <dl className="hero__stats">
            <div><dt>75 €</dt><dd>prezzo base / paio</dd></div>
            <div><dt>22,50 €</dt><dd>al Fondo con quota 30%</dd></div>
            <div><dt>3</dt><dd>direttrici Core Value · Trade · EaaS</dd></div>
          </dl>
        </div>
        <div className="hero__visual">
          <img src="/images/hero-worker.jpg" alt="Responsabile della sicurezza in un cantiere infrastrutturale tra i monti Sibillini" fetchPriority="high" decoding="async" />
          <div className="hero__image-label"><MapPin size={16} /> MONTI SIBILLINI / ITALIA</div>
          <div className="hero__path-card">
            <div className="hero__path-top"><span>SCEGLI COME ATTIVARE IL VALORE</span><span>01—02</span></div>
            <a href="#servizi" onClick={() => onModeChange('STANDARD')}>
              <span><b>STANDARD</b><small>Servizi e documenti secondo soglia</small></span><ChevronRight />
            </a>
            <a href="#servizi" onClick={() => onModeChange('VARIANTI_ALTO_IMPATTO')}>
              <span><b>ALTO IMPATTO</b><small>13 moduli potenziati attivabili</small></span><Sparkles />
            </a>
          </div>
        </div>
      </div>
      <div className="standards-strip" aria-label="Standard e riferimenti di reporting">
        <span className="standards-strip__label">PRONTO PER IL TUO REPORTING</span>
        {['CSRD READY', 'ESRS E1 / S3', 'GRI 413', 'SCOPE 3 DATA', 'ISAE 3000 READY'].map((item) => (
          <span className="standard-badge" key={item}><BadgeCheck size={16} />{item}</span>
        ))}
        <a href="#ecosistema" aria-label="Scorri per scoprire l'ecosistema"><ArrowDown /></a>
      </div>
    </section>
  );
}

function RoleEcosystem() {
  const [activeRole, setActiveRole] = useState('procurement');
  const role = roles.find((item) => item.id === activeRole);

  return (
    <section className="section roles-section" id="ecosistema" aria-labelledby="roles-title">
      <div className="container">
        <div className="section-heading section-heading--split">
          <div>
            <div className="eyebrow"><span /> VALUE ECOSYSTEM / LATO CLIENTE</div>
            <h2 id="roles-title">NON È SOLO UN DPI.<br />È QUELLO CHE<br /><em>TI PERMETTE DI FARE.</em></h2>
          </div>
          <p>Una fornitura tradizionale finisce alla consegna. Qui inizia a lavorare per i tuoi obiettivi: scegli il tuo ruolo e guarda il valore dalla tua prospettiva.</p>
        </div>

        <div className="role-tabs" role="tablist" aria-label="Esplora i vantaggi per ruolo">
          {roles.map((item) => {
            const Icon = roleIcons[item.icon];
            const selected = activeRole === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                className={selected ? 'is-active' : ''}
                onClick={() => setActiveRole(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                  event.preventDefault();
                  const current = roles.findIndex((entry) => entry.id === activeRole);
                  const direction = event.key === 'ArrowRight' ? 1 : -1;
                  const next = roles[(current + direction + roles.length) % roles.length];
                  setActiveRole(next.id);
                  requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus());
                }}
              >
                <Icon size={21} aria-hidden="true" /><span>{item.short}</span>
              </button>
            );
          })}
        </div>

        <div className="role-panel" role="tabpanel" id={`panel-${role.id}`} aria-labelledby={`tab-${role.id}`} key={role.id}>
          <div className="role-panel__main">
            <span className="micro-label">{role.eyebrow}</span>
            <h3>{role.title}</h3>
            <p>{role.description}</p>
            <ul className="check-list">
              {role.outcomes.map((outcome) => <li key={outcome}><CircleCheck size={20} />{outcome}</li>)}
            </ul>
            <div className="role-panel__deliverables"><FileCheck2 size={19} /><span><b>Cosa ricevi</b>{role.deliverables}</span></div>
          </div>
          <aside className="role-panel__aside">
            <span className="micro-label">IL TUO INDICATORE</span>
            <strong>{role.stat}</strong>
            <p>{role.statLabel}</p>
            <div className="triple-bars" aria-hidden="true"><i /><i /><i /></div>
            <a href="#simulatore">Calcola la tua configurazione <ArrowRight size={18} /></a>
          </aside>
        </div>

        <div className="commodity-shift">
          <div className="commodity-shift__title">
            <span className="micro-label">DAL PREZZO AL VALORE D’USO</span>
            <h3>La commodity si ferma.<br />Il tuo ecosistema continua.</h3>
          </div>
          <div className="commodity-box commodity-box--old">
            <span>FORNITURA A RIBASSO</span>
            <ul><li>Prezzo unitario</li><li>Consegna</li><li>Fine della relazione</li></ul>
          </div>
          <ArrowRight className="commodity-shift__arrow" aria-hidden="true" />
          <div className="commodity-box commodity-box--new">
            <span>SIBILLINI IMPACT</span>
            <ul><li>Compliance + rating</li><li>Welfare + reputazione</li><li>Governance + territorio</li></ul>
          </div>
        </div>
        <div className="business-directions" aria-label="Le tre direttrici del modello di business">
          <article>
            <span>01 / CORE VALUE</span>
            <h3>Diretto istituzionale B2B.</h3>
            <p>La Startup guida audit e contrattualizzazione per grandi imprese, General Contractor e consorzi dell’area del cratere sismico.</p>
          </article>
          <article>
            <span>02 / TRADE MARKETING</span>
            <h3>Rete distributiva fisica.</h3>
            <p>Rivenditori specializzati e ferramenta industriali trasferiscono ai propri clienti servizi e premialità a soglia.</p>
          </article>
          <article>
            <span>03 / EaaS</span>
            <h3>Ecommerce as a Service.</h3>
            <p>Ordini massivi e continuativi dal portale diretto, con devoluzione fissa del 30%, pari a 22,50 € per paio.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Guarantee() {
  return (
    <section className="guarantee" aria-labelledby="guarantee-title">
      <div className="container guarantee__grid">
        <div className="guarantee__intro">
          <div className="guarantee__seal"><ShieldCheck strokeWidth={1.4} /><span>ENTE<br />TERZO</span></div>
          <div className="eyebrow eyebrow--light"><span /> LA GARANZIA DEL SOGGETTO TERZO</div>
          <h2 id="guarantee-title">CHI GARANTISCE<br />NON VENDE.<br /><em>VERIFICA.</em></h2>
          <p>La Startup innovativa separa la transazione commerciale della calzatura dall’asseverazione dell’impatto sociale ed ecologico. Per te significa presentare a revisori e organismi di vigilanza evidenze digitali oggettive, non autoreferenziali.</p>
        </div>
        <div className="guarantee__points">
          <article>
            <span>01 / INDIPENDENZA</span>
            <h3>Una rendicontazione che puoi portare fuori dall’azienda.</h3>
            <p>Certificazioni indipendenti di allocazione fondi e report extra-finanziari auditabili per stazioni appaltanti, banche e revisori.</p>
          </article>
          <article>
            <span>02 / CREDIBILITÀ</span>
            <h3>Una filiera con un garante, non solo un venditore.</h3>
            <p>Il presidio terzo solleva Exena dal ruolo di mero fornitore commerciale e dà forma documentale al valore della commessa.</p>
          </article>
          <article>
            <span>03 / UTILIZZO</span>
            <h3>Un dossier che lavora nei tuoi processi decisionali.</h3>
            <p>Dati e attestazioni sono progettati per audit, gare, rating e Bilancio di Sostenibilità: li ricevi nel formato più utile al tuo team.</p>
          </article>
          <TextLink href="#servizi" className="text-link--light">Vedi tutti i deliverable</TextLink>
        </div>
      </div>
    </section>
  );
}

function ServiceArea({ area, mode, onModeChange }) {
  const variantActive = mode === 'VARIANTI_ALTO_IMPATTO';
  return (
    <article className={`service-area ${variantActive ? 'show-variants' : ''}`} id={`area-${area.id}`}>
      <header className="service-area__header">
        <div className="service-area__number">{area.number}</div>
        <div className="service-area__title">
          <span className="micro-label">{area.strategy}</span>
          <h3>{area.title}</h3>
          <span className="service-area__audience">{area.audience}</span>
        </div>
        <p>{area.outcome}</p>
      </header>
      <div className="service-area__tags">{area.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="service-area__body">
        <div className="standard-services">
          <div className="service-column__heading">
            <span><Check size={16} /> PERCORSO STANDARD</span>
            <small>Servizi secondo soglia</small>
          </div>
          <div className="standard-services__list">
            {area.standard.map((service, index) => (
              <div className="service-item" key={service.title}>
                <span className="service-item__index">{area.number}.{index + 1}</span>
                <div><h4>{service.title}</h4><p>{service.description}</p>{service.route && <Link className="service-item__action" to={service.route}>Apri il workspace <ArrowUpRight size={16} /></Link>}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={`variant-services ${variantActive ? 'is-active' : ''}`}>
          <div className="service-column__heading">
            <span><Sparkles size={16} /> VARIANTI AD ALTO IMPATTO</span>
            <small>Moduli attivabili</small>
          </div>
          {!variantActive && (
            <div className="variant-services__preview">
              <BadgeCheck size={27} />
              <h4>Puoi potenziare questa area con {area.variants.length} varianti.</h4>
              <ul>{area.variants.map((variant) => <li key={variant.code}>{variant.title}</li>)}</ul>
              <button type="button" onClick={() => onModeChange('VARIANTI_ALTO_IMPATTO')}>
                Esplora le varianti <ArrowRight size={18} />
              </button>
              <small>Le varianti si affiancano ai servizi Standard e ne incrementano il valore.</small>
            </div>
          )}
          {variantActive && (
            <div className="variant-services__list">
              {area.variants.map((variant) => (
                <div className="variant-item" key={variant.code}>
                  <div className="variant-item__badges"><span>{variant.code}</span><b>IMPATTO POTENZIATO</b></div>
                  <h4>{variant.title}</h4>
                  <span className="variant-item__label">{variant.label}</span>
                  <p>{variant.description}</p>
                  <strong>{variant.value}</strong>
                  {variant.route && <Link className="variant-item__action" to={variant.route}>Apri il componente <ArrowUpRight size={16} /></Link>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Services({ mode, onModeChange }) {
  return (
    <section className="section services-section" id="servizi" aria-labelledby="services-title">
      <div className="container">
        <div className="section-heading section-heading--split services-heading">
          <div>
            <div className="eyebrow"><span /> ENTERPRISE SERVICES / 5 PILASTRI</div>
            <h2 id="services-title">CINQUE AREE.<br />DUE LINEE.<br /><em>LA TUA SCELTA.</em></h2>
          </div>
          <div className="services-heading__control">
            <p>Parti dai servizi Standard oppure attiva le Varianti ad Alto Impatto. Le due configurazioni restano distinte e la base è sempre visibile; il simulatore somma gli incrementi delle varianti al valore Standard.</p>
            <ModeSwitch mode={mode} onChange={onModeChange} />
            <div className="mode-caption" aria-live="polite">
              {mode === 'STANDARD'
                ? <><Check size={17} /> Stai esplorando la linea Standard. Le varianti restano visibili in anteprima.</>
                : <><Sparkles size={17} /> Configurazione Standard + Varianti: la base e gli incrementi sono sempre distinguibili.</>}
            </div>
          </div>
        </div>
        <div className="service-areas">
          {serviceAreas.map((area) => <ServiceArea key={area.id} area={area} mode={mode} onModeChange={onModeChange} />)}
        </div>
      </div>
    </section>
  );
}

function Pipeline({ addetti, setAddetti, mode, onModeChange }) {
  const progress = Math.min(100, (addetti / 100) * 100);
  const unlocked = thresholds.filter((threshold) => addetti >= threshold.amount).length;

  return (
    <section className="pipeline-section" id="soglie" aria-labelledby="pipeline-title">
      <div className="container">
        <div className="section-heading section-heading--split section-heading--dark">
          <div>
            <div className="eyebrow eyebrow--light"><span /> INTERACTIVE REWARDING PIPELINE</div>
            <h2 id="pipeline-title">PIÙ PAIA.<br />PIÙ SERVIZI.<br /><em>UN SOLO CRUSCOTTO.</em></h2>
          </div>
          <p>Le soglie sono cumulative. Muovi il cursore e verifica in tempo reale quali servizi sblocchi nella configurazione scelta.</p>
        </div>

        <div className="pipeline-toolbar">
          <div className="pipeline-slider">
            <div className="pipeline-slider__value"><strong>{number.format(addetti)}</strong><span>PAIA / ADDETTI</span></div>
            <label>
              <span className="sr-only">Numero di paia per la simulazione delle soglie</span>
              <input
                type="range"
                min="1"
                max="5000"
                step="1"
                value={addetti}
                onChange={(event) => setAddetti(clampAddetti(event.target.value))}
                style={{ '--range-progress': `${Math.max(0, ((addetti - 1) / 4999) * 100)}%` }}
              />
            </label>
            <div className="pipeline-slider__labels"><span>1</span><span>10</span><span>25</span><span>50</span><span>100</span><span>5.000</span></div>
          </div>
          <ModeSwitch mode={mode} onChange={onModeChange} inverse compact />
        </div>

        <div className="pipeline-status" aria-live="polite">
          <span>{unlocked} / 4 SOGLIE SBLOCCATE</span>
          <span>{unlocked === 4 ? 'CONFIGURAZIONE COMPLETA' : `PROSSIMA SOGLIA: ${thresholds[unlocked].amount} PAIA`}</span>
        </div>
        <div className="pipeline-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>

        <div className="threshold-grid">
          {thresholds.map((threshold) => {
            const isUnlocked = addetti >= threshold.amount;
            return (
              <article className={`threshold-card ${isUnlocked ? 'is-unlocked' : ''}`} key={threshold.id}>
                <div className="threshold-card__top">
                  <span className="threshold-card__letter">{threshold.id}</span>
                  <span className="threshold-card__status">{isUnlocked ? <Unlock size={15} /> : <LockKeyhole size={15} />}{isUnlocked ? 'SBLOCCATA' : `MANCANO ${threshold.amount - addetti}`}</span>
                </div>
                <span className="threshold-card__amount">≥ {threshold.amount} PAIA</span>
                <h3>{threshold.title}</h3>
                <p>{mode === 'STANDARD' ? threshold.standard : threshold.variant}</p>
                <button type="button" onClick={() => setAddetti(threshold.amount)}>Simula {threshold.amount} paia <ArrowRight size={16} /></button>
              </article>
            );
          })}
        </div>
        <p className="pipeline-note">Le varianti si sommano ai servizi Standard della medesima soglia. Attivazione, disponibilità e articolazione operativa sono verificate nell’accordo quadro.</p>
      </div>
    </section>
  );
}

function Territory() {
  return (
    <section className="territory" aria-labelledby="territory-title">
      <div className="territory__image">
        <img src="/images/sibillini-territory.jpg" alt="Volontari al lavoro su un sentiero vicino a un borgo montano dei Sibillini" loading="lazy" decoding="async" />
        <div className="territory__caption"><Mountain size={18} /> DALLA COMMESSA AL BORGO / TRACCIABILITÀ PUBBLICA</div>
      </div>
      <div className="container territory__content">
        <div>
          <span className="micro-label">IL TUO ACQUISTO HA UNA DESTINAZIONE VISIBILE</span>
          <h2 id="territory-title">LO ORDINI QUI.<br /><em>RIGENERA LÀ.</em></h2>
        </div>
        <p>Non devi accontentarti di sapere “che” una quota viene devoluta. Puoi seguire il passaggio dal carrello al Fondo e dall’allocazione all’intervento civico e culturale.</p>
      </div>
      <div className="container territory-flow" aria-label="Flusso della devoluzione">
        {[
          ['01', 'IL TUO ORDINE', 'Calcolo automatico della quota impostata.'],
          ['02', 'LA GARANZIA TERZA', 'Attestazione e rendicontazione indipendente.'],
          ['03', 'IL FONDO', 'Allocazione registrata e tracciabile.'],
          ['04', 'IL TERRITORIO', 'Interventi nei borghi e nelle comunità.'],
        ].map(([index, title, copy]) => <div key={index}><span>{index}</span><h3>{title}</h3><p>{copy}</p></div>)}
      </div>
    </section>
  );
}

function PerformingArts() {
  return (
    <section className="culture-section" id="performing-arts" aria-labelledby="culture-title">
      <div className="container">
        <div className="culture-heading">
          <div>
            <div className="eyebrow"><span /> WELFARE CULTURALE / PERFORMING ARTS</div>
            <h2 id="culture-title">LA CULTURA<br /><em>VA IN SCENA.</em></h2>
          </div>
          <p>Con i tuoi benefit, le persone non ricevono soltanto un ingresso: entrano in una relazione viva con i luoghi. Performing art sperimentale negli hotel e azioni site-specific all’aperto avvicinano maestranze, famiglie e comunità.</p>
        </div>
        <div className="culture-grid">
          <figure className="culture-card">
            <div className="culture-card__image">
              <img src="/images/performing-art-hotel.jpg" alt="Due performer di teatro-danza durante una performance sperimentale nel salone di un hotel storico" loading="lazy" decoding="async" />
              <span>FORMAT INDOOR / HOTEL</span>
            </div>
            <figcaption>
              <span className="micro-label">01 / OSPITALITÀ + PERFORMING ART</span>
              <h3>La scena abita l’hotel.</h3>
              <p>Il patrimonio alberghiero dei borghi diventa spazio di ricerca artistica e incontro, collegando esperienza culturale e ospitalità territoriale.</p>
            </figcaption>
          </figure>
          <figure className="culture-card culture-card--offset">
            <div className="culture-card__image">
              <img src="/images/performing-art-outdoor.jpg" alt="Performer e pubblico durante una rappresentazione site-specific serale nella piazza di un borgo montano" loading="lazy" decoding="async" />
              <span>FORMAT OUTDOOR / SITE-SPECIFIC</span>
            </div>
            <figcaption>
              <span className="micro-label">02 / BORGO + SPAZIO PUBBLICO</span>
              <h3>Il borgo diventa palcoscenico.</h3>
              <p>Piazze, scalinate e paesaggio entrano nella drammaturgia: una performing art accessibile che riattiva lo spazio pubblico e la comunità.</p>
            </figcaption>
          </figure>
        </div>
        <div className="culture-bottom">
          <span><Ticket size={22} /> VIP Pass, ospitalità convenzionata e crediti soggiorno per maestranze e famiglie.</span>
          <TextLink href="#area-welfare">Esplora welfare e circolarità</TextLink>
        </div>
      </div>
    </section>
  );
}

function Simulator({ addetti, setAddetti, ratio, setRatio, mode, onModeChange }) {
  const result = useMemo(() => calculateImpact(addetti, ratio, mode), [addetti, ratio, mode]);

  const downloadSummary = () => {
    const modeLabel = mode === 'STANDARD' ? 'Percorso Standard' : 'Percorso Standard + Varianti ad Alto Impatto';
    const lines = [
      'SIBILLINI IMPACT — CONFIGURAZIONE SHARED VALUE',
      '',
      `Linea di attuazione: ${modeLabel}`,
      `Addetti / paia: ${result.addetti}`,
      `Prezzo base: ${preciseCurrency.format(BASE_PRICE)} / paio`,
      `Devoluzione al Fondo: ${result.ratio}%`,
      '',
      `Totale ordine: ${preciseCurrency.format(result.orderTotal)}`,
      `Fondo Aree Interne: ${preciseCurrency.format(result.fund)}`,
      `Interventi o spettacoli finanziati: ${result.interventions}`,
      `CO2 Scope 3 evitata stimata: ${result.co2.toFixed(2)} kg`,
      `Biglietti welfare totali: ${result.welfareTickets}`,
      `Valore servizi Standard: ${preciseCurrency.format(result.baseServiceValue)}`,
      `Incremento Varianti ad Alto Impatto: ${preciseCurrency.format(result.variantIncrement)}`,
      `Valore servizi complessivo: ${preciseCurrency.format(result.serviceValue)}`,
      `Soglie sbloccate: ${result.thresholds.filter((item) => item.unlocked).map((item) => item.id).join(', ') || 'nessuna'}`,
      '',
      'Stima illustrativa basata su 1 paio per addetto. Servizi e varianti soggetti a soglia, disponibilità e accordo quadro.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sibillini-impact-${result.addetti}-paia-${mode.toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="section simulator-section" id="simulatore" aria-labelledby="simulator-title">
      <div className="container">
        <div className="section-heading section-heading--split">
          <div>
            <div className="eyebrow"><span /> SHARED VALUE CALCULATOR</div>
            <h2 id="simulator-title">IL TUO IMPATTO.<br /><em>IN NUMERI.</em></h2>
          </div>
          <p>Configura volumi e devoluzione. Il valore dei servizi si aggiorna in tempo reale in base alla linea scelta, senza ricaricare la pagina.</p>
        </div>

        <div className="calculator-shell">
          <div className="calculator-controls">
            <div className="calculator-controls__heading"><Calculator size={24} /><span>CONFIGURA LA FORNITURA</span><span>01 / 02</span></div>
            <div className="calculator-field">
              <div className="calculator-field__label"><label htmlFor="calculator-addetti">Addetti / paia</label><span>1—5.000</span></div>
              <div className="number-stepper">
                <button type="button" onClick={() => setAddetti(clampAddetti(addetti - 10))} aria-label="Riduci di 10 paia"><Minus /></button>
                <input
                  id="calculator-addetti"
                  type="number"
                  min="1"
                  max="5000"
                  step="1"
                  inputMode="numeric"
                  value={addetti}
                  onChange={(event) => setAddetti(clampAddetti(event.target.value))}
                />
                <button type="button" onClick={() => setAddetti(clampAddetti(addetti + 10))} aria-label="Aumenta di 10 paia"><Plus /></button>
              </div>
              <input
                className="dark-range"
                aria-label="Addetti e paia"
                type="range"
                min="1"
                max="5000"
                value={addetti}
                onChange={(event) => setAddetti(clampAddetti(event.target.value))}
                style={{ '--range-progress': `${Math.max(0, ((addetti - 1) / 4999) * 100)}%` }}
              />
              <small>Ipotesi di calcolo: 1 paio per addetto · prezzo fisso {preciseCurrency.format(BASE_PRICE)}</small>
            </div>
            <div className="calculator-field">
              <div className="calculator-field__label"><label htmlFor="calculator-ratio">Devoluzione al Fondo</label><output htmlFor="calculator-ratio">{ratio}%</output></div>
              <input
                id="calculator-ratio"
                className="dark-range"
                type="range"
                min="10"
                max="50"
                step="1"
                value={ratio}
                onChange={(event) => setRatio(clampRatio(event.target.value))}
                style={{ '--range-progress': `${((ratio - 10) / 40) * 100}%` }}
              />
              <div className="range-endpoints"><span>10%</span><span>30% · BASE</span><span>50%</span></div>
              <small>Con {ratio}% destini {preciseCurrency.format(BASE_PRICE * ratio / 100)} per paio al Fondo Aree Interne.</small>
            </div>
            <div className="calculator-field calculator-field--mode">
              <div className="calculator-field__label"><span>Linea di attuazione</span><span>02 / 02</span></div>
              <ModeSwitch mode={mode} onChange={onModeChange} inverse />
              <p>{mode === 'STANDARD' ? 'Valorizzazione dei soli servizi Standard cumulativi.' : 'Valore Standard + incrementi cumulativi delle varianti attive.'}</p>
            </div>
            <button type="button" className="download-button" onClick={downloadSummary}><Download size={19} /> Scarica il riepilogo <span>.TXT</span></button>
          </div>

          <div className="calculator-results" aria-live="polite" aria-atomic="false">
            <div className="calculator-results__heading">
              <span>IL VALORE DELLA TUA CONFIGURAZIONE</span>
              <span className={mode === 'VARIANTI_ALTO_IMPATTO' ? 'is-variant' : ''}>{mode === 'STANDARD' ? 'STANDARD' : 'STANDARD + VARIANTI'}</span>
            </div>
            <div className="result-grid">
              <div className="result-card"><span>TOTALE ORDINE</span><strong>{currency.format(result.orderTotal)}</strong><small>{result.addetti} × {preciseCurrency.format(BASE_PRICE)}</small></div>
              <div className="result-card result-card--fund"><span>FONDO AREE INTERNE</span><strong>{currency.format(result.fund)}</strong><small>{ratio}% del valore d’acquisto</small></div>
              <div className="result-card"><span>INTERVENTI FINANZIATI</span><strong>{number.format(result.interventions)}</strong><small>Intervento o spettacolo ogni 2.500 €</small></div>
              <div className="result-card"><span>CO₂ SCOPE 3 EVITATA</span><strong>{number.format(result.co2)} <i>kg</i></strong><small>{result.addetti} × 4,25 kg</small></div>
              <div className="result-card"><span>BIGLIETTI WELFARE</span><strong>{number.format(result.welfareTickets)}</strong><small>Base VIP + quota proporzionale</small></div>
              <div className="result-card result-card--value"><span>VALORE SERVIZI COMPLESSIVO</span><strong>{currency.format(result.serviceValue)}</strong><small>{mode === 'STANDARD' ? 'Servizi base cumulativi' : `${currency.format(result.baseServiceValue)} base + ${currency.format(result.variantIncrement)} varianti`}</small></div>
            </div>
            <div className="unlocked-summary">
              <div><Unlock size={22} /><span>Soglie sbloccate</span></div>
              <div className="unlocked-summary__letters">
                {result.thresholds.map((threshold) => <span className={threshold.unlocked ? 'is-on' : ''} key={threshold.id}>{threshold.id}</span>)}
              </div>
              <strong>{result.unlockedCount}/4</strong>
            </div>
            <a className="button button--cobalt button--full" href="#contatto">Porta questa configurazione nell’audit <ArrowRight /></a>
            <details className="formula-details">
              <summary>Come calcoliamo questi valori <Plus size={17} /></summary>
              <div>
                <p><b>Ordine</b> = addetti × 75 € · <b>Fondo</b> = ordine × devoluzione.</p>
                <p><b>Interventi / spettacoli</b> = parte intera di Fondo / 2.500 € · <b>CO₂</b> = addetti × 4,25 kg.</p>
                <p><b>Welfare</b> = 5 biglietti da 50 paia + 1 ogni 10 addetti da 100 paia.</p>
                <p>Il valore Standard somma gli scaglioni A/B/C/D e, da 100 paia, la componente proporzionale. Con varianti attive si aggiungono +400 €, +650 €, +1.350 € e +2.200 € alle rispettive soglie.</p>
              </div>
            </details>
            <p className="calculator-disclaimer">Stima illustrativa, non una valutazione finanziaria o legale. Servizi e varianti dipendono da soglie, disponibilità e accordo quadro. L’applicabilità dei singoli standard va verificata sul tuo perimetro di reporting.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <section className="comparison-section" aria-labelledby="comparison-title">
      <div className="container">
        <div className="section-heading section-heading--split">
          <div>
            <div className="eyebrow"><span /> CONFRONTO TRASPARENTE</div>
            <h2 id="comparison-title">LA FORNITURA È LA BASE.<br /><em>IL RITORNO NO.</em></h2>
          </div>
          <p>Tre configurazioni a confronto per decidere con il tuo team che cosa deve portare dentro l’azienda la prossima commessa DPI.</p>
        </div>
        <div className="comparison-scroll" tabIndex="0" role="region" aria-label="Tabella comparativa, scorri orizzontalmente su schermi piccoli">
          <table>
            <thead>
              <tr>
                <th scope="col">CHE COSA OTTIENI</th>
                <th scope="col"><span>01</span>Fornitura tradizionale<small>Ribasso / commodity</small></th>
                <th scope="col"><span>02</span>Sibillini Standard<small>Servizi secondo soglia</small></th>
                <th scope="col" className="variant-column"><span>03</span>Standard + Varianti<small>Moduli aggiuntivi ad alto impatto</small></th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row[0]}>
                  <th scope="row">{row[0]}</th>
                  <td>{row[1]}</td>
                  <td><Check size={17} />{row[2]}</td>
                  <td className="variant-column"><Sparkles size={17} />{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="comparison-note">Le varianti sono attivabili secondo area e soglia e incrementano i servizi Standard. Articolazione e disponibilità sono definite nell’accordo quadro.</p>
      </div>
    </section>
  );
}

function Channels() {
  return (
    <section className="section channels-section" id="come-ordinare" aria-labelledby="channels-title">
      <div className="container">
        <div className="section-heading section-heading--split">
          <div>
            <div className="eyebrow"><span /> CANALI DI INGAGGIO</div>
            <h2 id="channels-title">ENTRA DAL CANALE<br /><em>CHE GIÀ FUNZIONA PER TE.</em></h2>
          </div>
          <p>Puoi mantenere il tuo rivenditore di fiducia oppure lavorare in diretta sul portale B2B. Il perimetro di servizi e la tracciabilità restano al centro.</p>
        </div>
        <div className="channel-grid">
          <article className="channel-card channel-card--trade">
            <div className="channel-card__top"><span>01 / TRADE MARKETING</span><Users /></div>
            <h3>IL TUO RIVENDITORE.<br />IL NOSTRO ECOSISTEMA.</h3>
            <p>Se hai già una relazione consolidata, la mantieni. Attivi il progetto tramite il rivenditore Exena e coordini con noi audit, documenti e benefit.</p>
            <ol>
              <li><span>1</span><div><b>Confronto iniziale</b><small>Definisci volumi, linea ecologica e obiettivi.</small></div></li>
              <li><span>2</span><div><b>Attivazione della commessa</b><small>Il rivenditore gestisce la relazione commerciale.</small></div></li>
              <li><span>3</span><div><b>Servizi e rendicontazione</b><small>La Startup presidia impatto e output digitali.</small></div></li>
            </ol>
            <TextLink href="#contatto">Attiva il canale Trade</TextLink>
          </article>
          <article className="channel-card channel-card--eaas">
            <div className="channel-card__top"><span>02 / EaaS BULK ORDER</span><Network /></div>
            <h3>IL PORTALE DIRETTO.<br />IL CONTROLLO IN TEMPO REALE.</h3>
            <p>Se vuoi automatizzare il ciclo di vita della fornitura, ordini dal Bulk Order Portal e monitori quota Fondo, soglie e pass dalla dashboard.</p>
            <ol>
              <li><span>1</span><div><b>Profilazione B2B</b><small>Configuri organizzazione, ruoli e cantieri.</small></div></li>
              <li><span>2</span><div><b>Ordine cumulativo</b><small>Applichi la devoluzione fissa del 30%.</small></div></li>
              <li><span>3</span><div><b>Dashboard e benefit</b><small>Tracci sblocchi, documenti e registri pubblici.</small></div></li>
            </ol>
            <TextLink href="#contatto">Richiedi accesso EaaS</TextLink>
          </article>
        </div>
      </div>
    </section>
  );
}

function Contact({ addetti, ratio, mode, onModeChange }) {
  const [submitted, setSubmitted] = useState(false);
  const [channel, setChannel] = useState('');

  return (
    <section className="contact-section" id="contatto" aria-labelledby="contact-title">
      <div className="container contact-grid">
        <div className="contact-intro">
          <div className="eyebrow eyebrow--light"><span /> AUDIT TECNICO-VALORIALE IN SEDE O IN CANTIERE</div>
          <h2 id="contact-title">PORTA I TUOI<br />OBIETTIVI.<br /><em>COSTRUIAMO IL PIANO.</em></h2>
          <p>Raccontaci che cosa devi ottenere: compliance, controllo dei cantieri, welfare o posizionamento istituzionale. L’incontro mette a fuoco fabbisogni, soglie e protocolli digitali di rendicontazione.</p>
          <div className="contact-config">
            <span>LA TUA CONFIGURAZIONE ATTUALE</span>
            <div><strong>{number.format(addetti)}</strong><small>paia / addetti</small></div>
            <div><strong>{ratio}%</strong><small>devoluzione</small></div>
            <div><strong>{mode === 'STANDARD' ? 'STD' : 'STD+HI'}</strong><small>{mode === 'STANDARD' ? 'Standard' : 'Con varianti'}</small></div>
          </div>
          <div className="contact-promises">
            <span><Check size={18} /> Pianificazione fabbisogni e taglie</span>
            <span><Check size={18} /> Tecnici della Startup garante</span>
            <span><Check size={18} /> Protocolli digitali di rendicontazione</span>
          </div>
        </div>

        <form className="contact-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} onChange={() => setSubmitted(false)}>
          <div className="contact-form__heading"><Mail /><div><span>RICHIESTA ISTITUZIONALE</span><h3>Parliamo della tua impresa.</h3></div></div>
          <div className="form-grid">
            <label><span>Nome e cognome *</span><input name="name" type="text" autoComplete="name" required placeholder="Es. Giulia Rossi" /></label>
            <label><span>Impresa / Organizzazione *</span><input name="company" type="text" autoComplete="organization" required placeholder="La tua azienda" /></label>
            <label><span>Email di lavoro *</span><input name="email" type="email" autoComplete="email" required placeholder="nome@azienda.it" /></label>
            <label><span>Telefono</span><input name="phone" type="tel" autoComplete="tel" placeholder="+39" /></label>
            <label><span>Il tuo ruolo *</span><select name="role" required defaultValue=""><option value="" disabled>Seleziona il ruolo</option><option>Procurement / Acquisti</option><option>RSPP / Sicurezza</option><option>Sustainability / ESG</option><option>HR / People</option><option>CEO / CFO / Board</option><option>Altro</option></select></label>
            <label><span>Canale preferito *</span><select name="channel" required value={channel} onChange={(event) => setChannel(event.target.value)}><option value="" disabled>Seleziona il canale</option><option value="trade">Rivenditore di fiducia / Trade</option><option value="eaas">Portale diretto / EaaS</option><option value="unsure">Da definire insieme</option></select></label>
            <label className="form-grid__full"><span>Linea che vuoi approfondire</span><select name="serviceMode" value={mode} onChange={(event) => onModeChange(event.target.value)}><option value="STANDARD">Percorso Standard</option><option value="VARIANTI_ALTO_IMPATTO">Varianti ad Alto Impatto</option></select></label>
            <label className="form-grid__full"><span>Obiettivo principale *</span><textarea name="message" required rows="3" placeholder="Es. reporting Scope 3, welfare per 180 addetti, gestione multi-cantiere…" /></label>
          </div>
          <input type="hidden" name="addetti" value={addetti} />
          <input type="hidden" name="devolutionRatio" value={ratio} />
          <label className="privacy-check"><input type="checkbox" required /><span>Acconsento al trattamento dei dati per essere ricontattato in merito alla richiesta. *</span></label>
          <button className="button button--dark button--full" type="submit">Richiedi l’audit preliminare <ArrowRight /></button>
          <p className="form-demo-note">Anteprima funzionale: il modulo valida i dati localmente e non li trasmette.</p>
          {submitted && <div className="form-success" role="status"><CircleCheck /><div><b>Configurazione verificata.</b><p>I campi sono completi. In questa anteprima nessun dato è stato inviato.</p></div></div>}
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div><Brand light /><p>Enterprise Services per trasformare la fornitura DPI in valore condiviso per imprese, persone e aree interne.</p></div>
          <div className="footer-links"><span>ESPLORA</span><a href="#ecosistema">Per la tua impresa</a><a href="#servizi">Servizi & varianti</a><a href="#soglie">Soglie</a><a href="#simulatore">Simulatore</a></div>
          <div className="footer-links"><span>ATTIVA</span><a href="#come-ordinare">Canale Trade</a><a href="#come-ordinare">Portale EaaS</a><a href="#contatto">Audit sede / cantiere</a><a href="#contatto">Contatto istituzionale</a></div>
          <a className="footer-cta" href="#top"><span>TORNA SU</span><ArrowUpRight /></a>
        </div>
        <div className="footer-bottom"><span>© 2026 SIBILLINI IMPACT</span><span>EXENA × STARTUP INNOVATIVA GARANTE</span><span>MONTI SIBILLINI / ITALIA</span></div>
        <div className="footer-word" aria-hidden="true" />
      </div>
    </footer>
  );
}

export default function App() {
  useEffect(() => { document.title = 'Sibillini Impact — Enterprise Services'; }, []);
  const [mode, setMode] = useState('STANDARD');
  const [addetti, setAddetti] = useState(100);
  const [ratio, setRatio] = useState(30);

  return (
    <>
      <Header />
      <main id="main">
        <Hero onModeChange={setMode} />
        <RoleEcosystem />
        <Guarantee />
        <Services mode={mode} onModeChange={setMode} />
        <Pipeline addetti={addetti} setAddetti={setAddetti} mode={mode} onModeChange={setMode} />
        <Territory />
        <PerformingArts />
        <Simulator addetti={addetti} setAddetti={setAddetti} ratio={ratio} setRatio={setRatio} mode={mode} onModeChange={setMode} />
        <Comparison />
        <Channels />
        <Contact addetti={addetti} ratio={ratio} mode={mode} onModeChange={setMode} />
      </main>
      <Footer />
    </>
  );
}
