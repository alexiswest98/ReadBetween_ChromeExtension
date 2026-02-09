import React from 'react';
import { AccessStateResult } from '../../../types/models';

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
    <div
      style={{
        marginBottom: '12px',
        padding: '10px 12px',
        background: '#fff',
        borderRadius: '6px',
        border: '1px solid #e8e8e8',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: dotColor,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ color: '#555' }}>{statusText}</span>
        {accessState && !loading && (
          <span
            style={{
              marginLeft: 'auto',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 500,
              background:
                accessLabels[accessState.state].color + '15',
              color: accessLabels[accessState.state].color,
            }}
          >
            {accessLabels[accessState.state].label}
          </span>
        )}
      </div>
      {error && (
        <p
          style={{
            margin: '8px 0 0',
            color: '#c0392b',
            fontSize: '12px',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default SystemStatus;
