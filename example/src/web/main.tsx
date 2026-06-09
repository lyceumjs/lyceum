import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { H5PContent } from '@lyceumjs/lms/fe';

interface ContentInfo {
  contentId: string;
  courseId: string;
  actor: string;
}

interface RecordRow {
  id: string;
  verb: string;
  objectId: string;
  timestamp: string;
  result?: { success?: boolean; score?: { raw: number; max: number } };
}

interface XApiStatement {
  verb?: { display?: Record<string, string> };
  result?: { success?: boolean; score?: { raw?: number; max?: number } };
}

function App() {
  const [info, setInfo] = useState<ContentInfo | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);

  const refreshRecords = useCallback((actor: string) => {
    void fetch(`/api/records?actor=${encodeURIComponent(actor)}`)
      .then((response) => response.json())
      .then(setRecords);
  }, []);

  useEffect(() => {
    void fetch('/api/content')
      .then((response) => response.json())
      .then((content: ContentInfo) => {
        setInfo(content);
        refreshRecords(content.actor);
      });
  }, [refreshRecords]);

  if (!info) return <p>Loading…</p>;

  return (
    <main>
      <h1>Lyceum example host</h1>
      <p>
        Course <code>{info.courseId}</code> → H5P content <code>{info.contentId}</code>, playing as{' '}
        <code>{info.actor}</code>.
      </p>

      <H5PContent
        contentId={info.contentId}
        loadContentCallback={async (contentId) => {
          const response = await fetch(`/h5p/play/${encodeURIComponent(contentId)}`);
          if (!response.ok) throw new Error(`play model failed: HTTP ${response.status}`);
          return response.json();
        }}
        onxAPIStatement={(statement) => {
          const s = statement as XApiStatement;
          const verb = s.verb?.display?.['en-US'] ?? '';
          if (verb !== 'answered') return; // capture the answer, not every interaction
          const score = s.result?.score;
          void fetch('/api/xapi', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              actor: info.actor,
              verb,
              objectId: info.contentId,
              ...(score?.raw !== undefined
                ? {
                    result: {
                      success: s.result?.success,
                      score: { raw: score.raw, max: score.max ?? 0 },
                    },
                  }
                : {}),
              timestamp: new Date().toISOString(),
            }),
          }).then(() => refreshRecords(info.actor));
        }}
      />

      <h2>Learning records ({records.length})</h2>
      {records.length === 0 ? (
        <p>None yet — answer the question above and the captured record appears here.</p>
      ) : (
        <ul>
          {records.map((record) => (
            <li key={record.id}>
              <code>{record.verb}</code> → {record.objectId}
              {record.result?.score ? ` (${record.result.score.raw}/${record.result.score.max})` : ''}{' '}
              at {record.timestamp}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
