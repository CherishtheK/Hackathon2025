import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MarkdownViewer from "./components/MarkdownViewer";

function App() {
  return (
    <div className="App">
      <h1 className="text-2xl font-bold mb-4">📄 PDF 内容</h1>
      <MarkdownViewer />
    </div>
  );
}

export default App
