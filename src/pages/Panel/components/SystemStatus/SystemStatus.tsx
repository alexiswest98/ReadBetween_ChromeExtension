import React from 'react';
import { AccessStateResult } from '../../../../types/models';
import './SystemStatus.css';

interface Props {
  articleDetected: boolean;
  accessState: AccessStateResult | null;
  loading: boolean;
  error: string | null;
}

const accessLabels: Record<string, { label: string; color: string }> = {
  full_access: { label: 'Full Access', color: '#2d7d46' },
  partial_preview: { label: 'Partial Preview', color: '#b8860b' },
  paywalled: { label: 'Paywalled', color: '#c0392b' },
};

const SystemStatus: React.FC<Props> = ({
  articleDetected,
  accessState,
  loading,
  error,
}) => {
  const dotColor = loading
    ? '#f0ad4e'
    : error
    ? '#c0392b'
    : articleDetected
    ? '#2d7d46'
    : '#999';

  const statusText = loading
    ? 'Analyzing...'
    : error
    ? 'Error'
    : articleDetected
    ? 'Article detected'
    : 'No article analyzed';

  return (
    <div className="status-container">
      <div className="status-row">
        <span
          className="status-dot"
          style={{ background: dotColor }}
        />
        <span className="status-text">{statusText}</span>
        {accessState && !loading && (
          <span
            className="status-badge"
            style={{
              background:
                accessLabels[accessState.state].color + '15',
              color: accessLabels[accessState.state].color,
            }}
          >
            {accessLabels[accessState.state].label}
          </span>
        )}
      </div>
      {error && <p className="status-error">{error}</p>}
    </div>
  );
};

export default SystemStatus;
