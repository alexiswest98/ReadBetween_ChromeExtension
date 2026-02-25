import React from 'react';
import { Sources } from '../../../../types/models';
import './SourcesSection.css';

interface Props {
  sources: Sources;
}

const typeLabels: Record<string, string> = {
  person: 'Person',
  agency: 'Agency',
  document: 'Document',
  dataset: 'Dataset',
  other: 'Other',
};

const SourcesSection: React.FC<Props> = ({ sources }) => {
  return (
    <>
      {sources.items.length === 0 ? (
        <p className="sources-empty">
          No explicitly attributed sources were identified in this article.
        </p>
      ) : (
        <>
          {sources.items.map((item, i) => (
            <div key={i} className="source-item">
              <div className="source-header">
                <span className="source-name">{item.source_name}</span>
                <span className="source-type">
                  {typeLabels[item.source_type] || item.source_type}
                </span>
              </div>
              <p className="source-quote">
                {/^["\u201C\u201D\u201A]/.test(item.evidence_quote)
                  ? item.evidence_quote
                  : <>&ldquo;{item.evidence_quote}&rdquo;</>
                }
              </p>
            </div>
          ))}
          <p className="source-disclaimer">
            Source classification is automated and may occasionally misclassify.
          </p>
        </>
      )}
    </>
  );
};

export default SourcesSection;
