import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ children }) {
  const components = {
    a: ({ node, ...props }) => (
      <a
        {...props}
        target="_blank"
        rel="noreferrer"
        className="text-blue-400 underline"
      />
    ),
    pre: ({ node, ...props }) => (
      <pre
        {...props}
        className="my-2 overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"
      />
    ),
    code: ({ node, className, children, ...props }) => {
      const isBlock = /language-/.test(className || '');
      if (isBlock) return <code className={className}>{children}</code>;
      return (
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-[13px] text-amber-200">
          {children}
        </code>
      );
    },
    p: ({ node, ...props }) => (
      <p {...props} className="my-2 leading-relaxed" />
    ),
    ul: ({ node, ...props }) => (
      <ul {...props} className="my-2 list-disc space-y-1 pl-5" />
    ),
    ol: ({ node, ...props }) => (
      <ol {...props} className="my-2 list-decimal space-y-1 pl-5" />
    ),
    li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
    h1: ({ node, ...props }) => (
      <h1 {...props} className="mb-2 mt-3 text-xl font-bold" />
    ),
    h2: ({ node, ...props }) => (
      <h2 {...props} className="mb-2 mt-3 text-lg font-semibold" />
    ),
    h3: ({ node, ...props }) => (
      <h3 {...props} className="mb-2 mt-3 text-base font-semibold" />
    ),
    strong: ({ node, ...props }) => (
      <strong {...props} className="font-semibold text-white" />
    ),
    table: ({ node, ...props }) => (
      <div className="my-2 overflow-x-auto">
        <table {...props} className="w-full border-collapse text-sm" />
      </div>
    ),
    th: ({ node, ...props }) => (
      <th
        {...props}
        className="border border-white/10 bg-white/5 px-3 py-1.5 text-left font-semibold"
      />
    ),
    td: ({ node, ...props }) => (
      <td {...props} className="border border-white/10 px-3 py-1.5" />
    ),
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
