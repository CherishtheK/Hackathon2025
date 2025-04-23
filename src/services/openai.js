import axios from 'axios';

export async function generateSummaryWithCitations(pdfBlocks) {
  try {
    const response = await axios.post(
      '/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview',
      {
        messages: [
          { role: "system", content: "你是一个学术论文摘要生成助手。" },
          { role: "user", content: constructPrompt(pdfBlocks) }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }
    );
    
    const content = response.data.choices[0].message.content;
    return JSON.parse(content).summary;
  } catch (error) {
    console.error("API调用失败:", error);
    throw error;
  }
}

function constructPrompt(pdfBlocks) {
  return `
    请基于以下文本生成5-7句简洁的摘要。
    为每个摘要句子标记引用来源（使用索引号标记原文中的哪些部分被引用）。
    
    输出格式必须是严格的JSON:
    {
      "summary": [
        {"text": "摘要第一句", "citations": [12, 15, 16]},
        {"text": "摘要第二句", "citations": [20, 21]},
        ...
      ]
    }
    
    原文:
    ${pdfBlocks.map((block, idx) => `[${idx}] ${block.text}`).join('\n')}
  `;
}
