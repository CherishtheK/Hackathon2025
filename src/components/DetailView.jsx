import React, { useState } from 'react';
import { deleteDocument } from '../utils/dbUtils';
import './DetailView.css';

const DetailView = ({ document, onUpdateDocument, onDeleteDocument }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(document?.title || '');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!document) {
    return <div className="detail-view">No document selected</div>;
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteDocument(document.id);
      onDeleteDocument(document.id);
    } catch (error) {
      console.error('Error deleting document:', error);
      setIsDeleting(false);
    }
  };

  const handleTitleEdit = () => {
    setIsEditing(true);
    setEditedTitle(document.title);
  };

  const handleTitleSave = () => {
    if (editedTitle.trim() !== document.title) {
      onUpdateDocument({ ...document, title: editedTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedTitle(document.title);
    }
  };

  return (
    <div className="detail-view">
      <div className="title-section">
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            autoFocus
          />
        ) : (
          <div className="title-display">
            <h2 onClick={handleTitleEdit}>{document.title}</h2>
            <span className="edit-icon" onClick={handleTitleEdit}>✎</span>
          </div>
        )}
      </div>

      <button 
        className="delete-button"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting...' : 'Delete Document'}
      </button>

      <div className="content">
        <pre>{JSON.stringify(document.jsonContent, null, 2)}</pre>
      </div>
    </div>
  );
};

export default DetailView; 