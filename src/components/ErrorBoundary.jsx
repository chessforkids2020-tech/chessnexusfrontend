import React from 'react';
import { t as tr } from '../i18n/LanguageContext';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <h2>{tr("Something went wrong.")}</h2>
          <p>{tr("We encountered an unexpected error while rendering this page.")}</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#b71c1c' }}>{String(this.state.error)}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
