import React from 'react';
import { AuthorTransparency as AuthorTransparencyType } from '../../../types/models';

interface Props {
  author: AuthorTransparencyType;
}

const AuthorTransparency: React.FC<Props> = ({ author }) => {
  const openUrl = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Author Transparency</h3>
      <div style={{ fontSize: '13px' }}>
        <p style={{ margin: '0 0 4px' }}>
          <strong>Author:</strong> {author.author_name}
        </p>
        <p style={{ margin: '0 0 4px' }}>
          <strong>Publisher:</strong> {author.publisher}
        </p>
        {author.author_page_url && (
          <p style={{ margin: '0 0 4px' }}>
            <a
              href={author.author_page_url}
              style={{ color: '#2563eb', textDecoration: 'none' }}
              onClick={(e) => {
                e.preventDefault();
                openUrl(author.author_page_url);
              }}
            >
              Publisher bio page
            </a>
          </p>
        )}
        {author.previous_articles.length > 0 ? (
          <div style={{ marginTop: '8px' }}>
            <strong style={{ fontSize: '12px' }}>Other Articles:</strong>
            {author.previous_articles.map((a, i) => (
              <p key={i} style={{ margin: '2px 0' }}>
                <a
                  href={a.url}
                  style={{
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontSize: '12px',
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    openUrl(a.url);
                  }}
                >
                  {a.title}
                </a>
              </p>
            ))}
          </div>
        ) : (
          <p
            style={{
              margin: '8px 0 0',
              color: '#888',
              fontSize: '12px',
              fontStyle: 'italic',
            }}
          >
            Previous articles not available from publisher page.
          </p>
        )}
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  marginBottom: '12px',
  padding: '12px',
  background: '#fff',
  borderRadius: '6px',
  border: '1px solid #e8e8e8',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#999',
};

export default AuthorTransparency;
