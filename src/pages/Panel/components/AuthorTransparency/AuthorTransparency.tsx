import React from 'react';
import { AuthorTransparency as AuthorTransparencyType } from '../../../../types/models';
import './AuthorTransparency.css';

interface Props {
  author: AuthorTransparencyType;
}

const AuthorTransparency: React.FC<Props> = ({ author }) => {
  const openUrl = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div className="card">
      <h3 className="section-title">Author Transparency</h3>
      <div className="author-info">
        <p>
          <strong>Author:</strong> {author.author_name}
        </p>
        <p>
          <strong>Publisher:</strong> {author.publisher}
        </p>
        {author.author_page_url && (
          <p>
            <a
              href={author.author_page_url}
              className="author-link"
              onClick={(e) => {
                e.preventDefault();
                openUrl(author.author_page_url);
              }}
            >
              Publisher bio page
            </a>
          </p>
        )}
        {/* {author.previous_articles.length > 0 ? (
          <div className="author-other-articles">
            <strong className="author-other-label">Other Articles:</strong>
            {author.previous_articles.map((a, i) => (
              <p key={i} className="author-article-item">
                <a
                  href={a.url}
                  className="author-article-link"
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
          <p className="author-no-articles">
            Previous articles not available from publisher page.
          </p>
        )} */}
      </div>
    </div>
  );
};

export default AuthorTransparency;
