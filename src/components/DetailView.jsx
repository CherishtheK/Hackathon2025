import React, { useState, useEffect } from 'react';
import { deleteDocument } from '../utils/dbUtils';
import './DetailView.css';

const DetailView = ({ document, onUpdateDocument, onDeleteDocument, projects = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(document?.title || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(document?.projectId || '');

  useEffect(() => {
    setSelectedProjectId(document?.projectId || '');
  }, [document]);

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

  const handleArchiveChange = (e) => {
    const newProjectId = e.target.value === 'unsorted' ? null : e.target.value;
    setSelectedProjectId(newProjectId || '');
    onUpdateDocument({ ...document, projectId: newProjectId });
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

      <div className="actions">
        <button 
          className="delete-button"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Document'}
        </button>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedProjectId || 'unsorted'}
          onChange={handleArchiveChange}
        >
          <option value="unsorted">Unsorted</option>
          {projects.map((proj) => (
            <option key={proj.id} value={proj.id}>{proj.name}</option>
          ))}
        </select>
      </div>

      <div className="content">
        <pre>{JSON.stringify(document.jsonContent, null, 2)}</pre>
      </div>
    </div>
  );
};

export default DetailView; 