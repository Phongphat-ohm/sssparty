"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className = "" }: MarkdownViewerProps) {
  if (!content) return null;

  return (
    <div
      className={`prose prose-sm max-w-none text-[#3F342B] space-y-3 leading-relaxed ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-black text-[#3F342B] tracking-tight pb-2 border-b border-[#F2E8DC] mt-4 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-bold text-[#3F342B] tracking-tight mt-3 mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-4 bg-[#D9A441] rounded-full inline-block" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-bold text-[#5A4D41] mt-2 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-xs sm:text-sm text-[#4A3E33] leading-relaxed my-1.5 whitespace-pre-wrap">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-[#2E241E] bg-[#FAF0E1] px-1 py-0.5 rounded">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#8C5D23] font-medium">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 pl-2 text-xs sm:text-sm text-[#4A3E33]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 pl-2 text-xs sm:text-sm text-[#4A3E33]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#D9A441] bg-[#FFF9F0] p-3 rounded-r-2xl my-3 text-xs sm:text-sm text-[#6E5D4F] italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-2xl border border-[#EADBCC] shadow-2xs">
              <table className="w-full text-left text-xs border-collapse bg-white">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#FAF6F0] border-b border-[#EADBCC] text-[#3F342B] font-bold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#F2E8DC]">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#FAF6F0]/40 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="p-2.5 font-bold text-[#5A4D41]">{children}</th>
          ),
          td: ({ children }) => (
            <td className="p-2.5 text-[#3F342B]">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#B94E48] hover:text-[#9A3A35] font-semibold underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-[#FAF0E1] text-[#B94E48] font-mono text-[11px] px-1.5 py-0.5 rounded-md border border-[#EADBCC]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-[#2A2420] text-[#FAF6F0] p-3 rounded-2xl overflow-x-auto text-xs font-mono my-2.5 border border-[#3F342B]">
              {children}
            </pre>
          ),
          hr: () => <hr className="border-[#F2E8DC] my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
