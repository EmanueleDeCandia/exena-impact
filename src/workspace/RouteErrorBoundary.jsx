import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Keeps a failed lazy module or render exception from unmounting the whole SPA.
 * Navigating to another route resets the boundary; a full reload retrieves a fresh
 * index and lazy-chunk manifest after a deployment or workspace restore.
 */
export class RouteErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Workspace] Modulo non caricato o rendering interrotto', error, info.componentStack);
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="state-card state-card--error workspace-route-error" role="alert">
        <AlertCircle size={28} aria-hidden="true" />
        <div>
          <h2>La vista non è stata caricata correttamente</h2>
          <p>I dati salvati sul server non sono stati modificati. Ricarica la vista per recuperare il modulo aggiornato; se il problema continua, riapri l’anteprima.</p>
        </div>
        <button className="button button--outline" type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={17} />Ricarica la vista
        </button>
      </div>
    );
  }
}
