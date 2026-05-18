import { lazy, memo, Suspense } from 'react';

const JsonSyntaxHighlighter = lazy(async () => {
  const [{ Prism }, { oneDark }] = await Promise.all([
    import('react-syntax-highlighter'),
    import('react-syntax-highlighter/dist/esm/styles/prism'),
  ]);

  return {
    default: ({ value }: { value: string }) => (
      <Prism language="json" style={oneDark} customStyle={{ margin: 0, background: 'transparent' }}>
        {value}
      </Prism>
    ),
  };
});

type JsonPreviewProps = {
  value: string;
};

function JsonPreviewContent({ value }: JsonPreviewProps) {
  return (
    <div className="preview-box" aria-label="Merged JSON preview">
      <div className="preview-meta">Merged OpenAPI JSON</div>
      <div className="preview-content">
        <Suspense fallback={<pre>{value}</pre>}>
          <JsonSyntaxHighlighter value={value} />
        </Suspense>
      </div>
    </div>
  );
}

export const JsonPreview = memo(JsonPreviewContent, (prev, next) => prev.value === next.value);
