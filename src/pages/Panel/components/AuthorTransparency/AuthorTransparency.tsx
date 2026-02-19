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
    </div>
  );
};

export default AuthorTransparency;
