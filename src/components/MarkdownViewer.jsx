// src/components/MarkdownViewer.jsx
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const MarkdownViewer = () => {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    fetch("/annurev-biodatasci-092820-114757_structured.json")
      .then((res) => res.json())
      .then((data) => {
        setBlocks(data);
      });
  }, []);

  return (
    <div className="p-4">
      {blocks.map((block, idx) => (
        <ReactMarkdown key={idx}>
          {block.markdown + block.text}
        </ReactMarkdown>
      ))}
    </div>
  );
};

export default MarkdownViewer;
